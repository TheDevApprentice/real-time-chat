import type { Request, Response, NextFunction } from "express";
import { getServices } from "../../../di/container";
import { K } from "../../../cache/cacheKeys";
import { incrWithTtl } from "../../../cache/cacheKeys";

// Cluster-safe rate limiter using Redis counters with TTL
// routeKey: logical name of the endpoint, e.g., 'auth:register'
// limit: max requests allowed within windowSec
// windowSec: size of the sliding window in seconds
// keyFn: optional function to derive a fingerprint (default: req.ip)
export function rateLimitRedisRESTMiddleware(
  routeKey: string,
  limit: number,
  windowSec: number,
  keyFn?: (req: Request) => string
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const { redisService } = getServices();
      const fp = (keyFn ? keyFn(req) : (req.ip || "unknown")).toString();
      const key = K.rlRest(routeKey, fp);
      const n = await incrWithTtl(redisService, key, windowSec, 1);
      if (n > limit) {
        return res
          .status(429)
          .json({ error: "Too many requests. Please try again later." });
      }
      next();
    } catch (_err) {
      // On Redis errors, fail open (do not block request)
      next();
    }
  };
}
