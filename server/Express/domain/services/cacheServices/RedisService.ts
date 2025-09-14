import { createClient } from "redis";
import { IRedisService } from "../../interfaces/cacheInterfaces/IRedisService";
import { Logger } from "../../../utils/LoggerUtil";

export class RedisService implements IRedisService {
  private static instance: RedisService | null = null;
  private client: ReturnType<typeof createClient> | null = null;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!this.instance) this.instance = new RedisService();
    return this.instance;
  }

  // Sets helpers (for tracking user sockets, etc.)
  async sAdd(key: string, member: string): Promise<number> {
    return await (this.ensure() as any).sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<number> {
    return await (this.ensure() as any).sRem(key, member);
  }

  // Sorted sets helpers
  async zAdd(key: string, score: number, member: string): Promise<number> {
    return await (this.ensure() as any).zAdd(key, [{ score, value: member }]);
  }

  async zIncrBy(key: string, increment: number, member: string): Promise<number> {
    return await (this.ensure() as any).zIncrBy(key, increment, member);
  }

  async zRange(
    key: string,
    start: number,
    stop: number,
    opts?: { REV?: boolean; WITHSCORES?: boolean }
  ): Promise<string[] | Array<{ value: string; score: number }>> {
    const client: any = this.ensure();
    if (opts?.WITHSCORES) {
      // node-redis v4 returns { value, score } objects when using zRange with options
      return await client.zRange(key, start, stop, {
        REV: !!opts?.REV,
        BY: 'SCORE',
        WITHSCORES: true,
      });
    }
    return await client.zRange(key, start, stop, { REV: !!opts?.REV });
  }

  // Hash helpers
  async hSet(key: string, field: string, value: string): Promise<number> {
    return await (this.ensure() as any).hSet(key, field, value);
  }

  async hIncrBy(key: string, field: string, by: number): Promise<number> {
    return await (this.ensure() as any).hIncrBy(key, field, by);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return await (this.ensure() as any).hGetAll(key);
  }

  // Simple atomic lock: SET NX EX
  async setNxExpire(key: string, value: string, exSeconds: number): Promise<boolean> {
    const res = await (this.ensure() as any).set(key, value, { NX: true, EX: exSeconds });
    return res === 'OK';
  }

  // Get and delete atomically
  async getDel(key: string): Promise<string | null> {
    return await (this.ensure() as any).getDel(key);
  }

  async connect(): Promise<void> {
    if (this.client) return; // already connected or connecting
    const url = process.env.REDIS_URL || this.buildUrlFromEnv();
    const client = createClient({ url });
    client.on("error", (err: unknown) => {
      // Avoid throwing here to not crash the process; callers can decide
      // eslint-disable-next-line no-console
      console.error("Redis error:", err);
    });
    await client.connect();
    this.client = client;
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      Logger.info("Redis disconnecting");
      await this.client.quit();
    } finally {
      this.client = null;
    }
  }

  private ensure(): ReturnType<typeof createClient> {
    if (!this.client) throw new Error("RedisService not connected");
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return await this.ensure().get(key);
    }

  async set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number }
  ): Promise<void> {
    if (options?.EX != null) {
      await this.ensure().set(key, value, { EX: options.EX });
    } else if (options?.PX != null) {
      await this.ensure().set(key, value, { PX: options.PX });
    } else {
      await this.ensure().set(key, value);
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) return await this.ensure().del(key);
    return await this.ensure().del(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const res = await this.ensure().expire(key, seconds);
    return res === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.ensure().ttl(key);
  }

  async incrBy(key: string, by?: number): Promise<number> {
    return await this.ensure().incrBy(key, by ?? 1);
  }

  async sMembers(key: string): Promise<string[]> {
    // returns array of members ([]) if key missing
    try {
      return await (this.ensure() as any).sMembers(key);
    } catch {
      return [];
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.ensure().publish(channel, message);
  }

  async subscribe(
    channel: string,
    handler: (message: string, channel: string) => void
  ): Promise<() => Promise<void>> {
    // Dedicated sub client (node-redis v4 requirement)
    const sub = this.ensure().duplicate();
    await sub.connect();
    await sub.subscribe(channel, (msg: string) => handler(msg, channel));
    return async () => {
      try {
        await sub.unsubscribe(channel);
      } finally {
        await sub.quit();
      }
    };
  }

  private buildUrlFromEnv(): string {
    const host = process.env.REDIS_HOST || "127.0.0.1";
    const port = parseInt(process.env.REDIS_PORT || "6379", 10);
    const user = process.env.REDIS_USER || "";
    const pass = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || "";
    const proto = (process.env.REDIS_TLS || "false").toLowerCase() === "true" ? "rediss" : "redis";
    const auth = pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : (user ? `${encodeURIComponent(user)}@` : "");
    return `${proto}://${auth}${host}:${port}`;
  }
}

 