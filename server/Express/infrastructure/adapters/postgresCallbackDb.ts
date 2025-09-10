import { CallbackDB, RunCb, GetCb, AllCb, EachRowCb } from "./callbackDb";
import { Logger } from "../../utils/LoggerUtil";

// Placeholder Postgres adapter that matches the CallbackDB interface but is not yet implemented.
// Swap this with a real implementation using the 'pg' package when ready.
export function createPostgresCallbackDb(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}): CallbackDB {
  Logger.info(
    `createPostgresCallbackDb planned (not implemented): host=${
      config.host
    } port=${config.port} db=${config.database} user=${
      config.user
    } ssl=${!!config.ssl}`
  );
  const notImpl = (method: string) => () => {
    throw new Error(
      `Postgres adapter not implemented. Missing method: ${method}`
    );
  };
  return {
    serialize(cb: () => void): void {
      // Postgres does not expose serialize semantics; call directly for API compatibility
      cb();
    },
    run: (_sql: string, _params: any[] | undefined, cb: RunCb) => {
      cb(new Error("Postgres adapter not implemented: run"));
    },
    get: <T = any>(_sql: string, _params: any[] | undefined, cb: GetCb<T>) => {
      cb(new Error("Postgres adapter not implemented: get"));
    },
    all: <T = any>(_sql: string, _params: any[] | undefined, cb: AllCb<T>) => {
      cb(new Error("Postgres adapter not implemented: all"));
    },
    exec: (_sql: string, cb: RunCb) => {
      cb(new Error("Postgres adapter not implemented: exec"));
    },
    close: (cb: RunCb) => {
      cb(new Error("Postgres adapter not implemented: close"));
    },
    each: <T = any>(
      _sql: string,
      _params: any[] | undefined,
      _rowCb: EachRowCb<T>,
      completeCb?: RunCb
    ) => {
      if (completeCb)
        completeCb(new Error("Postgres adapter not implemented: each"));
    },
  };
}
