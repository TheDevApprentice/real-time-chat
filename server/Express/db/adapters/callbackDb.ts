// Lightweight callback-style DB interface to decouple DatabaseService from sqlite3 specifics
// This preserves the current callback usage (run/get/all/serialize)

export type RunCb = (err: Error | null) => void;
export type GetCb<T = any> = (err: Error | null, row?: T) => void;
export type AllCb<T = any> = (err: Error | null, rows?: T[]) => void;
export type EachRowCb<T = any> = (err: Error | null, row?: T) => void;

export interface CallbackDB {
  serialize(cb: () => void): void;
  run(sql: string, params: any[] | undefined, cb: RunCb): void;
  get<T = any>(sql: string, params: any[] | undefined, cb: GetCb<T>): void;
  all<T = any>(sql: string, params: any[] | undefined, cb: AllCb<T>): void;
  exec(sql: string, cb: RunCb): void;
  close(cb: RunCb): void;
  each<T = any>(
    sql: string,
    params: any[] | undefined,
    rowCb: EachRowCb<T>,
    completeCb?: RunCb
  ): void;
}
