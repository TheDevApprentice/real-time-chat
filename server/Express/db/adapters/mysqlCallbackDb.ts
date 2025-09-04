import { CallbackDB, RunCb, GetCb, AllCb, EachRowCb } from "./callbackDb";
import { Logger } from "../../utils/Logger";

// Placeholder MySQL adapter that matches the CallbackDB interface but is not yet implemented.
// Swap this with a real implementation using the 'mysql2' package when ready.
export function createMysqlCallbackDb(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}): CallbackDB {
  Logger.info(
    `createMysqlCallbackDb planned (not implemented): host=${config.host} port=${config.port} db=${config.database} user=${config.user} ssl=${!!config.ssl}`
  );
  return {
    serialize(cb: () => void): void {
      // MySQL client does not expose serialize semantics; call directly for API compatibility
      cb();
    },
    run: (_sql: string, _params: any[] | undefined, cb: RunCb) => {
      cb(new Error("MySQL adapter not implemented: run"));
    },
    get: <T = any>(_sql: string, _params: any[] | undefined, cb: GetCb<T>) => {
      cb(new Error("MySQL adapter not implemented: get"));
    },
    all: <T = any>(_sql: string, _params: any[] | undefined, cb: AllCb<T>) => {
      cb(new Error("MySQL adapter not implemented: all"));
    },
    exec: (_sql: string, cb: RunCb) => {
      cb(new Error("MySQL adapter not implemented: exec"));
    },
    close: (cb: RunCb) => {
      cb(new Error("MySQL adapter not implemented: close"));
    },
    each: <T = any>(
      _sql: string,
      _params: any[] | undefined,
      _rowCb: EachRowCb<T>,
      completeCb?: RunCb
    ) => {
      if (completeCb) completeCb(new Error("MySQL adapter not implemented: each"));
    },
  };
}
