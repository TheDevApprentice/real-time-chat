// Lightweight callback-style DB interface to decouple DatabaseService from sqlite3 specifics
// This preserves the current callback usage (run/get/all/serialize)

export type RunCb = (err: Error | null) => void;
export type GetCb<T = any> = (err: Error | null, row?: T) => void;
export type AllCb<T = any> = (err: Error | null, rows?: T[]) => void;

export interface CallbackDB {
  serialize(cb: () => void): void;
  run(sql: string, params: any[] | undefined, cb: RunCb): void;
  get<T = any>(sql: string, params: any[] | undefined, cb: GetCb<T>): void;
  all<T = any>(sql: string, params: any[] | undefined, cb: AllCb<T>): void;
}

// Concrete sqlite-backed implementation
import sqlite3 from "sqlite3";
import { Logger } from "../../utils/Logger";

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
  };
}
