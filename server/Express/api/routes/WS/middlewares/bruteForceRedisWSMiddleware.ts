import { WsMiddleware } from "../router/WsRouter";
import type { WsContext } from "../router/WsContext";
import { K, TTL, incrWithTtl } from "../../../cache/cacheKeys";
import { getClientIp } from "../utils/NetUtil";

export function bruteForceRedisWSMiddleware<T = any>(options: {
  action: string;
  keyFrom: (ctx: WsContext<T>) => string;
  maxAttempts?: number; // default 5
  penaltySec?: number;  // default TTL.bruteForcePenaltySec
  windowSec?: number;   // default TTL.bruteForceWindowSec
}): WsMiddleware<T, T> {
  const { action, keyFrom } = options;
  const maxAttempts = typeof options.maxAttempts === 'number' ? options.maxAttempts : 5;
  const penaltySec = typeof options.penaltySec === 'number' ? options.penaltySec : TTL.bruteForcePenaltySec;
  const windowSec = typeof options.windowSec === 'number' ? options.windowSec : TTL.bruteForceWindowSec;

  return (next) => async (ctx: WsContext<T>) => {
    const ip = getClientIp(ctx);
    const keyVal = keyFrom(ctx) || "unknown";
    const blockedIpKey = K.bfBlockedIp(ip);
    const blockedKeyKey = K.bfBlockedKey(action, keyVal);

    try {
      const { redisService } = ctx.services;
      const blocked = (await redisService.exists(blockedIpKey)) || (await redisService.exists(blockedKeyKey));
      if (blocked) {
        return { success: false, error: "Too many attempts. Try again later." } as any;
      }

      // Proceed to next; classify result success/failure
      const result = await next(ctx);
      const isError = !!(result && (result as any).error);

      if (isError) {
        // Increment attempt counters within a short window
        const ipAttemptsKey = K.bfAttemptsIp(ip);
        const keyAttemptsKey = K.bfAttemptsKey(action, keyVal);
        const nIp = await incrWithTtl(redisService, ipAttemptsKey, windowSec, 1);
        const nKey = await incrWithTtl(redisService, keyAttemptsKey, windowSec, 1);
        if (nIp >= maxAttempts) {
          try { await redisService.set(blockedIpKey, "1", { EX: penaltySec }); } catch {}
        }
        if (nKey >= maxAttempts) {
          try { await redisService.set(blockedKeyKey, "1", { EX: penaltySec }); } catch {}
        }
      } else {
        // On success, clear attempt counters
        try {
          await (ctx.services).redisService.del([K.bfAttemptsIp(ip), K.bfAttemptsKey(action, keyVal)]);
        } catch {}
      }
      return result;
    } catch {
      // Fail open on Redis errors
      return next(ctx);
    }
  };
}
