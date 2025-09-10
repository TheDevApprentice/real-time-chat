import type { Request, Response, NextFunction } from "express";
import { K, TTL, incrWithTtl } from "../../../cache/cacheKeys";
import { getServices } from "../../../di/container";

export function bruteForceRedisRESTMiddleware(options: {
  action: string;
  keyFrom: (req: Request) => string; // e.g., username, refreshToken, userId, or req.ip
  maxAttempts?: number; // default 5
  penaltySec?: number;  // default TTL.bruteForcePenaltySec
  windowSec?: number;   // default TTL.bruteForceWindowSec
}) {
  const { action, keyFrom } = options;
  const maxAttempts = typeof options.maxAttempts === 'number' ? options.maxAttempts : 5;
  const penaltySec = typeof options.penaltySec === 'number' ? options.penaltySec : TTL.bruteForcePenaltySec;
  const windowSec = typeof options.windowSec === 'number' ? options.windowSec : TTL.bruteForceWindowSec;

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const { redisService } = getServices() as any;
      const ip = (req.ip || "unknown").toString();
      const keyVal = (keyFrom(req) || "unknown").toString();
      const blockedIpKey = K.bfBlockedIp(ip);
      const blockedKeyKey = K.bfBlockedKey(action, keyVal);

      // If blocked, short-circuit
      if ((await redisService.exists(blockedIpKey)) || (await redisService.exists(blockedKeyKey))) {
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      }

      // Proceed; on error, increment attempts and possibly block
      let finished = false;
      const origJson = res.json.bind(res);
      // Wrap res.json to inspect outcome (simple heuristic)
      (res as any).json = (body: any) => {
        try {
          const hasError = body && typeof body === 'object' && body.error;
          if (hasError) void onFailure();
          else void onSuccess();
        } catch { /* ignore */ }
        finished = true;
        return origJson(body);
      };

      const onFailure = async () => {
        try {
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
        } catch {}
      };
      const onSuccess = async () => {
        try { await redisService.del([K.bfAttemptsIp(ip), K.bfAttemptsKey(action, keyVal)]); } catch {}
      };

      // Call next middleware / handler
      await Promise.resolve(next());

      // If handler finished without calling res.json, we can't reliably classify; do nothing
      if (!finished) {
        // no-op; advanced usage could patch res.status/send as well if needed
      }
    } catch {
      // Fail open on Redis errors
      next();
    }
  };
}
