import { IRedisService } from "../../interfaces/cacheInterfaces/IRedisService";
import { K, TTL, Channels } from "../../../api/cache/cacheKeys";
import { mapMessageToDTO } from "../../dto";

export class MessageEffects {
  constructor(private readonly redis: IRedisService) {}

  async onMessageCreated(roomId: string, authorUserId: string, message: any, timestamp: number): Promise<void> {
    const dto = mapMessageToDTO(message);
    try { await this.redis.incrBy(K.historyVer(roomId), 1); } catch {}
    try { await this.redis.set(K.roomLastMessage(roomId), JSON.stringify(dto), { EX: TTL.roomHistoryPage }); } catch {}
    try { await this.redis.zAdd(K.roomsActiveZ(), Date.now(), roomId); } catch {}
    try {
      const d = new Date(timestamp);
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const hourKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}`;
      const dayKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
      await this.redis.incrBy(K.roomMsgsHour(roomId, hourKey), 1).catch(() => {});
      await this.redis.incrBy(K.roomMsgsDay(roomId, dayKey), 1).catch(() => {});
    } catch {}
    try { await this.redis.zIncrBy(K.lbActiveUsers(), 1, authorUserId); } catch {}
    try { await this.redis.publish(Channels.messageCreated, JSON.stringify({ roomId, message: dto })); } catch {}
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
