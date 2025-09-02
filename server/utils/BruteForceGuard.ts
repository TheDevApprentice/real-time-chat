export type Attempt = {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
};

export class BruteForceGuard {
  private byIP = new Map<string, Attempt>();
  private byKey = new Map<string, Attempt>();
  constructor(
    private readonly maxAttempts: number = 5,
    private readonly blockDurationMs: number = 15 * 60 * 1000
  ) {}

  private isBlockedAttempt(attempt?: Attempt): boolean {
    return !!(attempt && attempt.blockedUntil && attempt.blockedUntil > Date.now());
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
}

// Singleton guard used across the app
export const bruteForceGuard = new BruteForceGuard();
