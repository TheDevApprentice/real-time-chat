import { CallbackDB, RunCb, GetCb, AllCb, EachRowCb } from "./callbackDb";
import { Logger } from "../../utils/LoggerUtil";

// Concrete MySQL adapter based on mysql2, implementing CallbackDB
export function createMysqlCallbackDb(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}): CallbackDB {
  let mysql: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mysql = require("mysql2");
  } catch (e) {
    const err = new Error(
      "mysql2 package is required to use MySQL adapter. Please install it: npm i mysql2"
    );
    Logger.error(err.message);
    throw err;
  }

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    timezone: "Z",
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  Logger.info(
    `MySQL pool created host=${config.host} port=${config.port} db=${config.database} user=${config.user} ssl=${!!config.ssl}`
  );

  return {
    serialize(cb: () => void): void {
      // MySQL does not have serialize semantics; execute immediately
      try { cb(); } catch {}
    },
    run(sql: string, params: any[] | undefined, cb: RunCb) {
      try {
        if (Array.isArray(params)) {
          pool.query(sql, params, (err: any) => cb(err || null));
        } else {
          pool.query(sql, (err: any) => cb(err || null));
        }
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    get<T = any>(sql: string, params: any[] | undefined, cb: GetCb<T>) {
      try {
        const handler = (err: any, results?: any) => {
          if (err) return cb(err);
          try {
            const rows: any[] = Array.isArray(results) ? results : [];
            const row = rows.length > 0 ? (rows[0] as T) : undefined;
            return cb(null, row);
          } catch (e: any) {
            return cb(e instanceof Error ? e : new Error(String(e)));
          }
        };
        if (Array.isArray(params)) pool.query(sql, params, handler);
        else pool.query(sql, handler);
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    all<T = any>(sql: string, params: any[] | undefined, cb: AllCb<T>) {
      try {
        const handler = (err: any, results?: any) => {
          if (err) return cb(err);
          try {
            const rows: any[] = Array.isArray(results) ? results : [];
            return cb(null, rows as T[]);
          } catch (e: any) {
            return cb(e instanceof Error ? e : new Error(String(e)));
          }
        };
        if (Array.isArray(params)) pool.query(sql, params, handler);
        else pool.query(sql, handler);
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    exec(sql: string, cb: RunCb) {
      try {
        pool.query(sql, (err: any) => cb(err || null));
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    close(cb: RunCb) {
      try {
        // mysql2: pool.end returns a promise if no callback is given
        pool.end((err: any) => cb(err || null));
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    each<T = any>(
      sql: string,
      params: any[] | undefined,
      rowCb: EachRowCb<T>,
      completeCb?: RunCb
    ) {
      try {
        const handleRows = (err: any, results?: any) => {
          if (err) {
            if (completeCb) completeCb(err);
            else try { rowCb(err); } catch {}
            return;
          }
          try {
            const rows: any[] = Array.isArray(results) ? results : [];
            for (const r of rows) {
              try { rowCb(null, r as T); } catch {}
            }
            if (completeCb) completeCb(null);
          } catch (e: any) {
            if (completeCb) completeCb(e instanceof Error ? e : new Error(String(e)));
          }
        };
        if (Array.isArray(params)) pool.query(sql, params, handleRows);
        else pool.query(sql, handleRows);
      } catch (e: any) {
        if (completeCb) completeCb(e instanceof Error ? e : new Error(String(e)));
      }
    },
  };
}
