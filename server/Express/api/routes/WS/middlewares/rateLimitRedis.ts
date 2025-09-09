import { WsMiddleware } from "../router/WsRouter";
import type { WsContext } from "../router/WsContext";
import { K, incrWithTtl } from "../../../cache/cacheKeys";

function getClientIp(ctx: WsContext<any>): string {
  const trustProxyEnv = process.env.TRUST_PROXY;
  const trustProxy = trustProxyEnv === "true" || (!!trustProxyEnv && trustProxyEnv !== "false");
  const xff = (ctx.socket.handshake.headers as any)["x-forwarded-for"] as string | undefined;
  const ip = trustProxy && xff ? xff.split(",")[0].trim() : (ctx.socket.handshake.address as any) || "unknown";
  return String(ip || "unknown");
}

export function rateLimitRedisWs<T = any>(options: { key: (ctx: WsContext<T>) => string; limit: number; windowSec: number }): WsMiddleware<T, T> {
  const { key, limit, windowSec } = options;
  return (next) => async (ctx) => {
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

export function rateLimitRedisPerUser<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWs<T>({
    key: (ctx) => {
      const uid = (ctx.socket.data as any)?.userId as string | undefined;
      return uid ? K.rlWsUser(subKey, uid) : K.rlWsSocket(subKey, ctx.socket.id);
    },
    limit,
    windowSec,
  });
}

export function rateLimitRedisPerSocket<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWs<T>({
    key: (ctx) => K.rlWsSocket(subKey, ctx.socket.id),
    limit,
    windowSec,
  });
}

export function rateLimitRedisByIp<T = any>(subKey: string, limit: number, windowSec: number): WsMiddleware<T, T> {
  return rateLimitRedisWs<T>({
    key: (ctx) => K.rlWsIp(subKey, getClientIp(ctx)),
    limit,
    windowSec,
  });
}
