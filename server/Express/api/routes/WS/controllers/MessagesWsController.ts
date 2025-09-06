import { WsContext } from "../router/WsContext";
import { Message, User } from "../../../../domain/entities";
import { sanitizeText } from "../../../middleware/text";
import { K, TTL, incrWithTtl, Channels } from "../../../cache/cacheKeys";

export class MessagesWsController {
  async sendMessageToRoom(
    ctx: WsContext<{ roomId: string; content: string; timestamp?: number; clientMsgId?: string }>
  ) {
    const { userService, messageService, roomService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const { roomId, content, timestamp, clientMsgId } = (ctx.payload || {}) as any;
    if (!roomId || !content)
      return { error: "Not authenticated or missing data." };

    // Fine-grained rate limit per user+room (e.g., 30 msgs / 10s)
    try {
      const rlKey = K.rlSendRoom(roomId, userId);
      const count = await incrWithTtl(redisService, rlKey, TTL.rateWindowSend, 1);
      if (count > 30) {
        return { success: false, error: "Rate limit exceeded. Please slow down." };
      }
    } catch {}

    // Idempotency guard if clientMsgId provided
    if (clientMsgId && typeof clientMsgId === "string") {
      try {
        const idemKey = K.idempMsg(clientMsgId);
        const n = await redisService.incrBy(idemKey, 1);
        if (n === 1) {
          // first time seen -> set expiry
          try { await redisService.expire(idemKey, TTL.idempotency); } catch {}
        } else {
          // duplicate submission -> acknowledge without re-creating
          return { success: true, duplicate: true };
        }
      } catch {}
    }

    const user = await userService.getUserById(userId);
    if (!user) return { error: "User not found." };

    const safeContent = sanitizeText(content);
    const ts = typeof timestamp === "number" ? timestamp : Date.now();
    const msgObj = new Message(user, safeContent, ts);
    await messageService.addMessageToRoom(msgObj, roomId);
    // Update caches/stats
    try {
      // Bump history version so any paginated caches can be considered stale
      try { await redisService.incrBy(K.historyVer(roomId), 1); } catch {}
      // Cache last message for the room (short TTL)
      try { await redisService.set(K.roomLastMessage(roomId), JSON.stringify(msgObj.toJSON()), { EX: TTL.roomHistoryPage }); } catch {}
      // Mark room as active in a ZSET scored by timestamp
      try { await redisService.zAdd(K.roomsActiveZ(), Date.now(), roomId); } catch {}
      // Increment message counters (hour/day buckets) with retention
      try {
        const d = new Date(ts);
        const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
        const hourKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}`;
        const dayKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
        await incrWithTtl(redisService, K.roomMsgsHour(roomId, hourKey), TTL.counterHourRetainSec, 1);
        await incrWithTtl(redisService, K.roomMsgsDay(roomId, dayKey), TTL.counterDayRetainSec, 1);
      } catch {}
      // Leaderboard: active users (increment by 1 per message)
      try { await redisService.zIncrBy(K.lbActiveUsers(), 1, userId); } catch {}
      // Publish light-weight event for internal consumers
      try { await redisService.publish(Channels.messageCreated, JSON.stringify({ roomId, message: msgObj.toJSON() })); } catch {}
    } catch {}

    // Emit to all sockets of room members (not only joined sockets)
    try {
      const members = await roomService.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u: User) => u.id));
      const sockets = await ctx.io.fetchSockets();
      for (const s of sockets) {
        const uid = (s.data as any)?.userId as string | undefined;
        if (uid && memberIds.has(uid)) {
          s.emit("message", { roomId, message: msgObj.toJSON() });
        }
      }
      // Invalidate room history cache
      try {
        await (redisService?.del?.(K.roomHistory(roomId)) ?? Promise.resolve(0));
      } catch {}
      // Invalidate unread cache for all members
      try {
        const keysToDel = Array.from(memberIds).map((id) => K.unread(id));
        await (redisService?.del?.(keysToDel) ?? Promise.resolve(0));
      } catch {}
    } catch {
      ctx.io.to(roomId).emit("message", { roomId, message: msgObj.toJSON() });
    }

    return { success: true };
  }

  async messageDelivered(
    ctx: WsContext<{ messageId: number; roomId: string; timestamp?: number }>
  ) {
    const { messageService, roomService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { messageId, roomId, timestamp } = (ctx.payload || {}) as any;
    if (!messageId || !roomId)
      return { success: false, error: "Missing messageId or roomId." };

    await messageService.markMessageDelivered(messageId, timestamp ?? Date.now());
    try {
      const members = await roomService.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u: User) => u.id));
      const sockets = await ctx.io.fetchSockets();
      for (const s of sockets) {
        const uid = (s.data as any)?.userId as string | undefined;
        if (uid && memberIds.has(uid)) {
          s.emit("messageStatusUpdated", {
            messageId,
            status: "delivered",
            deliveredAt: timestamp ?? Date.now(),
          });
        }
      }
      // Invalidate unread cache for all members
      try {
        const keysToDel = Array.from(memberIds).map((id) => `cache:unread:${id}`);
        await (redisService?.del?.(keysToDel) ?? Promise.resolve(0));
      } catch {}
    } catch {
      ctx.io
        .to(roomId)
        .emit("messageStatusUpdated", {
          messageId,
          status: "delivered",
          deliveredAt: timestamp ?? Date.now(),
        });
    }
    return { success: true };
  }

  async messageRead(
    ctx: WsContext<{ messageId: number; roomId: string; timestamp?: number }>
  ) {
    const {   messageService, roomService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { messageId, roomId, timestamp } = (ctx.payload || {}) as any;
    if (!messageId || !roomId)
      return { success: false, error: "Missing messageId or roomId." };

    await messageService.markMessageRead(messageId, timestamp ?? Date.now());
    // Aggregate read-max per user/room (optional, for future batch flush)
    try {
      if (Number.isFinite(messageId)) {
        await redisService.hSet(K.readMax(roomId), String(userId), String(messageId));
        try { await redisService.expire(K.readMax(roomId), TTL.readMax); } catch {}
      }
    } catch {}
    try {
      const members = await roomService.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u: User) => u.id));
      const sockets = await ctx.io.fetchSockets();
      for (const s of sockets) {
        const uid = (s.data as any)?.userId as string | undefined;
        if (uid && memberIds.has(uid)) {
          s.emit("messageStatusUpdated", {
            messageId,
            status: "read",
            readAt: timestamp ?? Date.now(),
          });
        }
      }
      // Invalidate unread cache for all members
      try {
        const keysToDel = Array.from(memberIds).map((id) => `cache:unread:${id}`);
        await (redisService?.del?.(keysToDel) ?? Promise.resolve(0));
      } catch {}
    } catch {
      ctx.io
        .to(roomId)
        .emit("messageStatusUpdated", {
          messageId,
          status: "read",
          readAt: timestamp ?? Date.now(),
        });
    }
    return { success: true };
  }
}
