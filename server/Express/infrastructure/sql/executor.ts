/**
 * SQL Write Executor
 * ------------------
 * Utilities to execute write statements with retry/backoff for transient errors
 * across SQLite and MySQL/MariaDB. These helpers provide a consistent way to
 * perform inserts/updates/deletes in repository methods.
 *
 * Guidelines:
 * - Use runWrite for generic INSERT/UPDATE/DELETE.
 * - Use insertGetLastId when you need the auto-increment id returned (if available).
 * - Outside of an explicit transaction (UoW.noTx), retries/backoff are enabled
 *   by default to handle SQLITE_BUSY/LOCKED and MySQL deadlocks/timeouts.
 * - Inside an explicit transaction (UoW.tx), consider passing { retries: 0 }
 *   to avoid statement-level retries within the same transaction for clarity.
 */
import { Logger } from "../../utils/LoggerUtil";
import { CallbackDB, RunCb } from "../adapters/callbackDb";

export type WriteOptions = {
  retries?: number; // total attempts = retries + 1
  backoffMs?: number; // base backoff
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientError(err: any): boolean {
  if (!err) return false;
  Logger.error(err);
  const msg = String(err && (err.code || err.message || err)).toUpperCase();
  // SQLite transient
  if (msg.includes("SQLITE_BUSY") || msg.includes("SQLITE_LOCKED")) return true;
  // MySQL/MariaDB transient
  if (msg.includes("ER_LOCK_DEADLOCK")) return true;
  if (msg.includes("DEADLOCK FOUND")) return true;
  if (msg.includes("LOCK WAIT TIMEOUT")) return true;
  return false;
}

export async function runWrite(
  db: CallbackDB,
  sql: string,
  params?: any[]
, opts: WriteOptions = {}): Promise<void> {
  const retries = Math.max(0, opts.retries ?? 3);
  const backoffMs = Math.max(0, opts.backoffMs ?? 100);
  let attempt = 0;
  let lastErr: any = null;
  for (;;) {
    try {
      await new Promise<void>((resolve, reject) => {
        db.run(sql, Array.isArray(params) ? params : undefined, (err) => (err ? reject(err) : resolve()));
      });
      return;
    } catch (e: any) {
      lastErr = e;
      if (attempt >= retries || !isTransientError(e)) throw e;
      await sleep(backoffMs * Math.pow(2, attempt));
      attempt++;
    }
  }
}

export async function insertGetLastId(
  db: CallbackDB,
  sql: string,
  params?: any[]
, opts: WriteOptions = {}): Promise<number | undefined> {
  const retries = Math.max(0, opts.retries ?? 3);
  const backoffMs = Math.max(0, opts.backoffMs ?? 100);
  let attempt = 0;
  let lastErr: any = null;
  for (;;) {
    try {
      const id = await new Promise<number | undefined>((resolve, reject) => {
        const cb: RunCb = function (this: any, err) {
          if (err) return reject(err);
          try {
            const v = typeof this?.lastID !== "undefined" ? Number(this.lastID) : undefined;
            resolve(Number.isFinite(v as any) ? (v as number) : undefined);
          } catch {
            resolve(undefined);
          }
        };
        db.run(sql, Array.isArray(params) ? params : undefined, cb);
      });
      return id;
    } catch (e: any) {
      lastErr = e;
      if (attempt >= retries || !isTransientError(e)) throw e;
      await sleep(backoffMs * Math.pow(2, attempt));
      attempt++;
    }
  }
}
