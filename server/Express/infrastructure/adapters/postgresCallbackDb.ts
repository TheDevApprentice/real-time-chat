import { CallbackDB, RunCb, GetCb, AllCb, EachRowCb } from "./callbackDb";
import { Logger } from "../../utils/LoggerUtil";

// Concrete Postgres adapter using 'pg', translating '?' to $1..$n placeholders
export function createPostgresCallbackDb(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}): CallbackDB {
  let pg: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pg = require("pg");
  } catch (e) {
    const err = new Error(
      "pg package is required to use Postgres adapter. Please install it: npm i pg"
    );
    Logger.error(err.message);
    throw err;
  }

  const pool = new pg.Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  Logger.info(
    `Postgres pool created host=${config.host} port=${config.port} db=${config.database} user=${config.user} ssl=${!!config.ssl}`
  );

  function toPg(sql: string, params?: any[]): { text: string; values?: any[] } {
    if (!params || !Array.isArray(params) || params.length === 0) {
      return { text: sql };
    }
    let i = 0;
    const text = sql.replace(/\?/g, () => {
      i += 1;
      return `$${i}`;
    });
    return { text, values: params };
  }

  return {
    serialize(cb: () => void): void {
      try { cb(); } catch {}
    },
    run(sql: string, params: any[] | undefined, cb: RunCb) {
      try {
        const { text, values } = toPg(sql, params);
        pool.query(text, values, (err: any) => cb(err || null));
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    get<T = any>(sql: string, params: any[] | undefined, cb: GetCb<T>) {
      try {
        const { text, values } = toPg(sql, params);
        pool.query(text, values, (err: any, result: any) => {
          if (err) return cb(err);
          const row = result && result.rows && result.rows[0] ? (result.rows[0] as T) : undefined;
          return cb(null, row);
        });
      } catch (e: any) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    },
    all<T = any>(sql: string, params: any[] | undefined, cb: AllCb<T>) {
      try {
        const { text, values } = toPg(sql, params);
        pool.query(text, values, (err: any, result: any) => {
          if (err) return cb(err);
          const rows = (result && Array.isArray(result.rows)) ? (result.rows as T[]) : ([] as T[]);
          return cb(null, rows);
        });
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
        const { text, values } = toPg(sql, params);
        pool.query(text, values, (err: any, result: any) => {
          if (err) {
            if (completeCb) completeCb(err);
            else try { rowCb(err); } catch {}
            return;
          }
          try {
            const rows: any[] = (result && Array.isArray(result.rows)) ? result.rows : [];
            for (const r of rows) {
              try { rowCb(null, r as T); } catch {}
            }
            if (completeCb) completeCb(null);
          } catch (e: any) {
            if (completeCb) completeCb(e instanceof Error ? e : new Error(String(e)));
          }
        });
      } catch (e: any) {
        if (completeCb) completeCb(e instanceof Error ? e : new Error(String(e)));
      }
    },
  };
}
