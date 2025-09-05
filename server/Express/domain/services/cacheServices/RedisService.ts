import { createClient, RedisClientType } from "redis";
import { IRedisService } from "../../interfaces/cacheInterfaces/IRedisService";

export class RedisService implements IRedisService {
  private static instance: RedisService | null = null;
  private client: RedisClientType<any, any> | null = null;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!this.instance) this.instance = new RedisService();
    return this.instance;
  }

  async connect(): Promise<void> {
    if (this.client) return; // already connected or connecting
    const url = process.env.REDIS_URL || this.buildUrlFromEnv();
    const client = createClient({ url });
    client.on("error", (err) => {
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
      await this.client.quit();
    } finally {
      this.client = null;
    }
  }

  private ensure(): RedisClientType<any, any> {
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

  async incrBy(key: string, by: number = 1): Promise<number> {
    return await this.ensure().incrBy(key, by);
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
    await sub.subscribe(channel, (msg) => handler(msg, channel));
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

 