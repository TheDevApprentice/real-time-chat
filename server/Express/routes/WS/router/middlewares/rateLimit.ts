import { WsMiddleware } from "../WsRouter";

export type RateLimitKeyFn = (ctx: any) => string;

interface RateLimitOptions {
  key: RateLimitKeyFn; // should include socket.id in most cases
  limit: number;
  windowMs: number;
}

// In-memory store scoped to this middleware factory instance
function createStore() {
  return new Map<string, { count: number; windowStart: number }>();
}

export function rateLimit(options: RateLimitOptions): WsMiddleware<any> {
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
export function rateLimitPerSocket(subKey: string, limit: number, windowMs: number): WsMiddleware<any> {
  return rateLimit({
    key: (ctx) => `${ctx.socket.id}:${subKey}`,
    limit,
    windowMs,
  });
}
