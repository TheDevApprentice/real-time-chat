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
        const handler = (err: any, results?: any) => {
          if (results && typeof results.insertId !== 'undefined') {
            try { (cb as any).call({ lastID: results.insertId }, err || null); return; } catch {}
          }
          cb(err || null);
        };
        if (Array.isArray(params)) pool.query(sql, params, handler);
        else pool.query(sql, handler);
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
    async withTransaction<T = any>(fn: (tx: CallbackDB) => Promise<T>): Promise<T> {
      const getConn = () => new Promise<any>((resolve, reject) => {
        try { pool.getConnection((err: any, conn: any) => err ? reject(err) : resolve(conn)); } catch (e) { reject(e); }
      });
      const begin = (conn: any) => new Promise<void>((resolve, reject) => {
        try { conn.beginTransaction((err: any) => err ? reject(err) : resolve()); } catch (e) { reject(e); }
      });
      const commit = (conn: any) => new Promise<void>((resolve, reject) => {
        try { conn.commit((err: any) => err ? reject(err) : resolve()); } catch (e) { reject(e); }
      });
      const rollback = (conn: any) => new Promise<void>((resolve) => {
        try { conn.rollback(() => resolve()); } catch { resolve(); }
      });

      const conn = await getConn();
      try {
        await begin(conn);
        const tx: CallbackDB = {
          serialize(cb: () => void): void {
            try { cb(); } catch {}
          },
          run(sql: string, params: any[] | undefined, cb: RunCb) {
            try {
              const handler = (err: any, results?: any) => {
                if (results && typeof results.insertId !== 'undefined') {
                  try { (cb as any).call({ lastID: results.insertId }, err || null); return; } catch {}
                }
                cb(err || null);
              };
              if (Array.isArray(params)) conn.query(sql, params, handler);
              else conn.query(sql, handler);
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
              if (Array.isArray(params)) conn.query(sql, params, handler);
              else conn.query(sql, handler);
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
              if (Array.isArray(params)) conn.query(sql, params, handler);
              else conn.query(sql, handler);
            } catch (e: any) {
              cb(e instanceof Error ? e : new Error(String(e)));
            }
          },
          exec(sql: string, cb: RunCb) {
            try { conn.query(sql, (err: any) => cb(err || null)); } catch (e: any) { cb(e instanceof Error ? e : new Error(String(e))); }
          },
          close(cb: RunCb) {
            try { cb(null); } catch {}
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
              if (Array.isArray(params)) conn.query(sql, params, handleRows);
              else conn.query(sql, handleRows);
            } catch (e: any) {
              if (completeCb) completeCb(e instanceof Error ? e : new Error(String(e)));
            }
          },
          withTransaction: async <U = any>(inner: (tx2: CallbackDB) => Promise<U>): Promise<U> => {
            // Nested transaction: reuse the same connection (no savepoints for simplicity)
            return inner(tx);
          },
        } as CallbackDB;

        const result = await fn(tx);
        await commit(conn);
        return result;
      } catch (e) {
        try { await rollback(conn); } catch {}
        throw e;
      } finally {
        try { conn.release(); } catch {}
      }
    },
  };
}
