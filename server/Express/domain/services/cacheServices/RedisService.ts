import { createClient } from "redis";
import { Logger } from "../../../utils/LoggerUtil";
import { IRedisService } from "../../interfaces/cacheInterfaces/IRedisService";
import { K, TTL, Channels, incrWithTtl } from "../../../api/cache/cacheKeys";
import { mapMessageToDTO } from "../../dto";
import { RateLimitedLogger } from "../../../utils/RateLimitedLogger";

export class RedisService implements IRedisService {
  private static instance: RedisService | null = null;
  private client: ReturnType<typeof createClient> | null = null;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!this.instance) this.instance = new RedisService();
    return this.instance;
  }

  async zRemRangeByRank(key: string, start: number, stop: number): Promise<number> {
    return await (this.ensure() as any).zRemRangeByRank(key, start, stop);
  }

  async zCard(key: string): Promise<number> {
    return await (this.ensure() as any).zCard(key);
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

  async exists(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) return await (this.ensure() as any).exists(...key);
    return await (this.ensure() as any).exists(key);
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
    // Avoid unhandled 'error' events on the duplicate client
    sub.on("error", (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Redis sub error:", err);
    });
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

  
  async onMessageCreated(roomId: string, authorUserId: string, message: any, timestamp: number): Promise<void> {
    const dto = mapMessageToDTO(message);
    try { await this.incrBy(K.historyVer(roomId), 1); } catch { RateLimitedLogger.warn("effects:onCreated:historyVer", `Failed to bump historyVer for ${roomId}`); }
    try { await this.set(K.roomLastMessage(roomId), JSON.stringify(dto), { EX: TTL.roomHistoryPage }); } catch { RateLimitedLogger.warn("effects:onCreated:lastMessage", `Failed to cache lastMessage for ${roomId}`); }
    try {
      await this.zAdd(K.roomsActiveZ(), Date.now(), roomId);
      // Soft trim if very large (keep newest ~10k)
      try {
        const size = await this.zCard(K.roomsActiveZ()).catch(() => 0);
        if (size > 10000) {
          // Remove everything except last 10000
          const removed = await this.zRemRangeByRank(K.roomsActiveZ(), 0, -(10000 + 1));
          if (removed > 0) { /* trimmed */ }
        }
      } catch { RateLimitedLogger.warn("effects:onCreated:roomsActiveZ:trim", `Failed to trim roomsActiveZ`); }
    } catch { RateLimitedLogger.warn("effects:onCreated:roomsActiveZ", `Failed to mark room active for ${roomId}`); }
    try {
      const d = new Date(timestamp);
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const hourKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}`;
      const dayKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
      await incrWithTtl(this as any, K.roomMsgsHour(roomId, hourKey), TTL.counterHourRetainSec, 1).catch(() => {});
      await incrWithTtl(this as any, K.roomMsgsDay(roomId, dayKey), TTL.counterDayRetainSec, 1).catch(() => {});
    } catch { RateLimitedLogger.warn("effects:onCreated:counters", `Failed to bump counters for ${roomId}`); }
    try {
      await this.zIncrBy(K.lbActiveUsers(), 1, authorUserId);
      // Soft trim leaderboard if very large (keep top ~10k by rank)
      try {
        const size = await this.zCard(K.lbActiveUsers()).catch(() => 0);
        if (size > 10000) {
          await this.zRemRangeByRank(K.lbActiveUsers(), 0, -(10000 + 1));
        }
      } catch { RateLimitedLogger.warn("effects:onCreated:lb:trim", `Failed to trim lbActiveUsers`); }
    } catch { RateLimitedLogger.warn("effects:onCreated:lb", `Failed to bump leaderboard for user ${authorUserId}`); }
    try { await this.publish(Channels.messageCreated, JSON.stringify({ roomId, message: dto })); } catch { RateLimitedLogger.warn("effects:onCreated:publish", `Failed to publish messageCreated for ${roomId}`); }
  }

  async invalidateRoomHistory(roomId: string): Promise<void> {
    try { await this.del(K.roomHistory(roomId)); } catch {}
  }

  async invalidateUnreadForUsers(userIds: Iterable<string>): Promise<void> {
    try {
      const keys = Array.from(userIds).map((id) => K.unread(id));
      if (keys.length) await this.del(keys);
    } catch {}
  }
}

 