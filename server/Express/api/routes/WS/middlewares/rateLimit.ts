import { WsMiddleware } from "../router/WsRouter";
import type { WsContext } from "../router/WsContext";

export type RateLimitKeyFn<T> = (ctx: WsContext<T>) => string;

interface RateLimitOptions<T> {
  key: RateLimitKeyFn<T>; // should include socket.id in most cases
  limit: number;
  windowMs: number;
}

// In-memory store scoped to this middleware factory instance
function createStore() {
  return new Map<string, { count: number; windowStart: number }>();
}

export function rateLimit<T = any>(options: RateLimitOptions<T>): WsMiddleware<T, T> {
  const store = createStore();
  const { key, limit, windowMs } = options;

  return (next) => async (ctx) => {
    const k = key(ctx);
    const now = Date.now();
    const rec = store.get(k) || { count: 0, windowStart: now };
    if (now - rec.windowStart > windowMs) {
      rec.count = 0;
      rec.windowStart = now;
    }
    rec.count += 1;
    store.set(k, rec);
    if (rec.count > limit) {
      return { success: false, error: "Rate limit exceeded." };
    }
    return next(ctx);
  };
}

// Helper: simple per-socket rate limit with a static subKey
export function rateLimitPerSocket<T = any>(subKey: string, limit: number, windowMs: number): WsMiddleware<T, T> {
  return rateLimit<T>({
    key: (ctx) => `${ctx.socket.id}:${subKey}`,
    limit,
    windowMs,
  });
}
