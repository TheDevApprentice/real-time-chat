// Concrete sqlite-backed implementation
/**
 * SQLite CallbackDB Adapter
 * -------------------------
 * Exposes a callback-style DB interface with helpers for `withTransaction`.
 * Nested `withTransaction` calls reuse the same transaction/connection,
 * preventing accidental double-transactions when services and repos both use
 * transactional helpers (transactions are flattened).
 */
import sqlite3 from "sqlite3";
import { Logger } from "../../utils/LoggerUtil";
import { AllCb, CallbackDB, EachRowCb, GetCb, RunCb } from "./callbackDb";

export function createSqliteCallbackDb(filePath: string): CallbackDB {
  sqlite3.verbose();
  const db = new sqlite3.Database(filePath, (err) => {
    if (err) {
      Logger.error(`Failed to open database: ${err.message}`);
      throw err;
    }
  });
  return {
    serialize(cb: () => void) {
      db.serialize(cb);
    },
    run(sql: string, params: any[] | undefined, cb: RunCb) {
      if (Array.isArray(params)) db.run(sql, params, cb as any);
      else db.run(sql, cb as any);
    },
    get<T = any>(sql: string, params: any[] | undefined, cb: GetCb<T>) {
      if (Array.isArray(params)) db.get(sql, params, cb as any);
      else db.get(sql, cb as any);
    },
    all<T = any>(sql: string, params: any[] | undefined, cb: AllCb<T>) {
      if (Array.isArray(params)) db.all(sql, params, cb as any);
      else db.all(sql, cb as any);
    },
    exec(sql: string, cb: RunCb) {
      db.exec(sql, cb as any);
    },
    close(cb: RunCb) {
      db.close(cb as any);
    },
    each<T = any>(
      sql: string,
      params: any[] | undefined,
      rowCb: EachRowCb<T>,
      completeCb?: RunCb
    ) {
      if (Array.isArray(params))
        db.each(sql, params, rowCb as any, completeCb as any);
      else db.each(sql, rowCb as any, completeCb as any);
    },
    async withTransaction<T = any>(fn: (tx: CallbackDB) => Promise<T>): Promise<T> {
      const execAsync = (sql: string) =>
        new Promise<void>((resolve, reject) => {
          db.exec(sql, (err: any) => (err ? reject(err) : resolve()));
        });
      const tx: CallbackDB = {
        serialize(cb: () => void): void {
          try { cb(); } catch {}
        },
        run: (sql: string, params: any[] | undefined, cb: RunCb) => {
          if (Array.isArray(params)) db.run(sql, params, cb as any);
          else db.run(sql, cb as any);
        },
        get: <U = any>(sql: string, params: any[] | undefined, cb: GetCb<U>) => {
          if (Array.isArray(params)) db.get(sql, params, cb as any);
          else db.get(sql, cb as any);
        },
        all: <U = any>(sql: string, params: any[] | undefined, cb: AllCb<U>) => {
          if (Array.isArray(params)) db.all(sql, params, cb as any);
          else db.all(sql, cb as any);
        },
        exec: (sql: string, cb: RunCb) => db.exec(sql, cb as any),
        close: (cb: RunCb) => { try { cb(null); } catch {} },
        each: <U = any>(
          sql: string,
          params: any[] | undefined,
          rowCb: EachRowCb<U>,
          completeCb?: RunCb
        ) => {
          if (Array.isArray(params)) db.each(sql, params, rowCb as any, completeCb as any);
          else db.each(sql, rowCb as any, completeCb as any);
        },
        withTransaction: async <U = any>(inner: (tx2: CallbackDB) => Promise<U>): Promise<U> => {
          // Nested transactions: reuse the same tx without savepoints for simplicity
          return inner(tx);
        },
      } as CallbackDB;
      try {
        await execAsync("BEGIN");
        const result = await fn(tx);
        await execAsync("COMMIT");
        return result;
      } catch (e) {
        try { await execAsync("ROLLBACK"); } catch {}
        throw e;
      }
    },
  };
}
