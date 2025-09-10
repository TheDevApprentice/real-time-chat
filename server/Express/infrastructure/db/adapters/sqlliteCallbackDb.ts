// Concrete sqlite-backed implementation
import sqlite3 from "sqlite3";
import { Logger } from "../../../utils/LoggerUtil";
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
  };
}
