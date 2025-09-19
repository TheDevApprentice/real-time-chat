import { IRedisService } from "../../interfaces/cacheInterfaces/IRedisService";
import { K, TTL, Channels, incrWithTtl } from "../../../api/cache/cacheKeys";
import { mapMessageToDTO } from "../../dto";
import { RateLimitedLogger } from "../../../utils/RateLimitedLogger";

export class MessageEffects {
  constructor(private readonly redis: IRedisService) {}

  async onMessageCreated(roomId: string, authorUserId: string, message: any, timestamp: number): Promise<void> {
    const dto = mapMessageToDTO(message);
    try { await this.redis.incrBy(K.historyVer(roomId), 1); } catch { RateLimitedLogger.warn("effects:onCreated:historyVer", `Failed to bump historyVer for ${roomId}`); }
    try { await this.redis.set(K.roomLastMessage(roomId), JSON.stringify(dto), { EX: TTL.roomHistoryPage }); } catch { RateLimitedLogger.warn("effects:onCreated:lastMessage", `Failed to cache lastMessage for ${roomId}`); }
    try {
      await this.redis.zAdd(K.roomsActiveZ(), Date.now(), roomId);
      // Soft trim if very large (keep newest ~10k)
      try {
        const size = await this.redis.zCard(K.roomsActiveZ()).catch(() => 0);
        if (size > 10000) {
          // Remove everything except last 10000
          const removed = await this.redis.zRemRangeByRank(K.roomsActiveZ(), 0, -(10000 + 1));
          if (removed > 0) { /* trimmed */ }
        }
      } catch { RateLimitedLogger.warn("effects:onCreated:roomsActiveZ:trim", `Failed to trim roomsActiveZ`); }
    } catch { RateLimitedLogger.warn("effects:onCreated:roomsActiveZ", `Failed to mark room active for ${roomId}`); }
    try {
      const d = new Date(timestamp);
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const hourKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}`;
      const dayKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
      await incrWithTtl(this.redis as any, K.roomMsgsHour(roomId, hourKey), TTL.counterHourRetainSec, 1).catch(() => {});
      await incrWithTtl(this.redis as any, K.roomMsgsDay(roomId, dayKey), TTL.counterDayRetainSec, 1).catch(() => {});
    } catch { RateLimitedLogger.warn("effects:onCreated:counters", `Failed to bump counters for ${roomId}`); }
    try {
      await this.redis.zIncrBy(K.lbActiveUsers(), 1, authorUserId);
      // Soft trim leaderboard if very large (keep top ~10k by rank)
      try {
        const size = await this.redis.zCard(K.lbActiveUsers()).catch(() => 0);
        if (size > 10000) {
          await this.redis.zRemRangeByRank(K.lbActiveUsers(), 0, -(10000 + 1));
        }
      } catch { RateLimitedLogger.warn("effects:onCreated:lb:trim", `Failed to trim lbActiveUsers`); }
    } catch { RateLimitedLogger.warn("effects:onCreated:lb", `Failed to bump leaderboard for user ${authorUserId}`); }
    try { await this.redis.publish(Channels.messageCreated, JSON.stringify({ roomId, message: dto })); } catch { RateLimitedLogger.warn("effects:onCreated:publish", `Failed to publish messageCreated for ${roomId}`); }
  }

  async invalidateRoomHistory(roomId: string): Promise<void> {
    try { await this.redis.del(K.roomHistory(roomId)); } catch {}
  }

  async invalidateUnreadForUsers(userIds: Iterable<string>): Promise<void> {
    try {
      const keys = Array.from(userIds).map((id) => K.unread(id));
      if (keys.length) await this.redis.del(keys);
    } catch {}
  }
}
