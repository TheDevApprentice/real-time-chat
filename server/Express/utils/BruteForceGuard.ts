import type { Request, Response, NextFunction } from "express";

export type Attempt = {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
};

export class BruteForceGuard {
  private byIP = new Map<string, Attempt>();
  private byKey = new Map<string, Attempt>();
  // Simple in-memory rate limit state per (routeKey, ip)
  private rlMap = new Map<
    string,
    { count: number; windowStart: number; windowMs: number; lastSeen: number }
  >();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly maxAttempts: number = 5,
    private readonly blockDurationMs: number = 15 * 60 * 1000
  ) {
    // Periodic cleanup of stale rate-limit entries to avoid memory growth
    const CLEANUP_EVERY_MS = 5 * 60 * 1000; // 5 minutes
    this.cleanupTimer = setInterval(
      () => this.cleanupRateLimitMap(),
      CLEANUP_EVERY_MS
    );
    // Do not keep the process alive just for the timer
    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  private isBlockedAttempt(attempt?: Attempt): boolean {
    return !!(
      attempt &&
      attempt.blockedUntil &&
      attempt.blockedUntil > Date.now()
    );
  }

  isBlockedIP(ip: string): boolean {
    return this.isBlockedAttempt(this.byIP.get(ip));
  }

  isBlockedKey(key: string): boolean {
    return this.isBlockedAttempt(this.byKey.get(key));
  }

  onFailure(ip: string, key: string): void {
    const now = Date.now();
    const ipAtt = this.byIP.get(ip) || { count: 0, lastAttempt: 0 };
    ipAtt.count += 1;
    ipAtt.lastAttempt = now;
    if (ipAtt.count >= this.maxAttempts) {
      ipAtt.blockedUntil = now + this.blockDurationMs;
    }
    this.byIP.set(ip, ipAtt);

    const keyAtt = this.byKey.get(key) || { count: 0, lastAttempt: 0 };
    keyAtt.count += 1;
    keyAtt.lastAttempt = now;
    if (keyAtt.count >= this.maxAttempts) {
      keyAtt.blockedUntil = now + this.blockDurationMs;
    }
    this.byKey.set(key, keyAtt);
  }

  onSuccess(ip: string, key: string): void {
    this.byIP.delete(ip);
    this.byKey.delete(key);
  }

  getAttemptIP(ip: string): Attempt | undefined {
    return this.byIP.get(ip);
  }

  getAttemptKey(key: string): Attempt | undefined {
    return this.byKey.get(key);
  }

  // Generic, reusable rate limiter per IP and routeKey
  rateLimit(
    routeKey: string,
    maxReq: number = 50,
    windowMs: number = 15 * 60 * 1000
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = (req.ip || "unknown").toString();
      const key = `${routeKey}:${ip}`;
      const now = Date.now();
      const existing = this.rlMap.get(key);
      const state = existing || {
        count: 0,
        windowStart: now,
        windowMs,
        lastSeen: now,
      };
      // If a different windowMs is passed later, take the stricter (smaller) one
      state.windowMs = Math.min(state.windowMs, windowMs);
      if (now - state.windowStart > windowMs) {
        state.count = 0;
        state.windowStart = now;
      }
      state.count += 1;
      state.lastSeen = now;
      this.rlMap.set(key, state);
      if (state.count > maxReq) {
        return res
          .status(429)
          .json({ error: "Too many requests. Please try again later." });
      }
      next();
    };
  }

  private cleanupRateLimitMap() {
    const now = Date.now();
    for (const [key, state] of this.rlMap.entries()) {
      // Remove entries not seen for 2x their window, with a minimum TTL
      const ttl = Math.max(state.windowMs * 2, 30 * 60 * 1000); // at least 30 minutes
      if (now - state.lastSeen > ttl) {
        this.rlMap.delete(key);
      }
    }
  }
}

// Singleton guard used across the app
export const bruteForceGuard = new BruteForceGuard();
