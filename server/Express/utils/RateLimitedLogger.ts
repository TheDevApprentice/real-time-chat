import { Logger } from "./LoggerUtil";

// Simple in-memory rate-limited logger. Not persisted across processes.
// Use a composite key (e.g., module + action) to group similar warnings.
export class RateLimitedLogger {
  private static last: Map<string, number> = new Map();

  static warn(key: string, message: string, intervalMs = 30_000): void {
    const now = Date.now();
    const last = this.last.get(key) || 0;
    if (now - last >= intervalMs) {
      this.last.set(key, now);
      try {
        Logger.warn(message);
      } catch {}
    }
  }

  static error(key: string, message: string, intervalMs = 30_000): void {
    const now = Date.now();
    const last = this.last.get(key) || 0;
    if (now - last >= intervalMs) {
      this.last.set(key, now);
      try {
        Logger.error(message);
      } catch {}
    }
  }
}
