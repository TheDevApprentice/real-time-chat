import { WsMiddleware } from "../router/WsRouter";
import type { WsContext } from "../router/WsContext";
import { K, incrWithTtl } from "../../../cache/cacheKeys";
import { getClientIp } from "../utils/NetUtil";

export function rateLimitRedisWSMiddleware<T = any>(options: { key: (ctx: WsContext<T>) => string; limit: number; windowSec: number }): WsMiddleware<T, T> {
  const { key, limit, windowSec } = options;
  return (next) => async (ctx: WsContext<T>) => {
    try {
      const k = key(ctx);
      const { redisService } = ctx.services as any;
      const n = await incrWithTtl(redisService, k, windowSec, 1);
      if (n > limit) {
        return { success: false, error: "Rate limit exceeded." } as any;
      }
    } catch {
      // fail open on Redis error
    }
    return next(ctx);
  };
}

export function rateLimitRedisPerUserWSMiddleware<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWSMiddleware<T>({
    key: (ctx: WsContext<T>) => {
      const uid = (ctx.socket.data as any)?.userId as string | undefined;
      return uid ? K.rlWsUser(subKey, uid) : K.rlWsSocket(subKey, ctx.socket.id);
    },
    limit,
    windowSec,
  });
}

export function rateLimitRedisPerSocketWSMiddleware<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWSMiddleware<T>({
    key: (ctx: WsContext<T>) => K.rlWsSocket(subKey, ctx.socket.id),
    limit,
    windowSec,
  });
}

export function rateLimitRedisByIpWSMiddleware<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWSMiddleware<T>({
    key: (ctx: WsContext<T>) => K.rlWsIp(subKey, getClientIp(ctx)),
    limit,
    windowSec,
  });
}
