import { WsContext } from "../router/WsContext";
import { Message, User } from "../../../../domain/entities";
import { sanitizeText } from "../../../../utils/TextUtil";
import { K, TTL, incrWithTtl, jsonSet, jsonGet } from "../../../cache/cacheKeys";
import { mapMessageToDTO } from "../../../../domain/dto";
import type { CreateMessageDTO, EditMessageDTO, DeleteMessageDTO, MessageDeliveryReceiptDTO, MessageReadReceiptDTO } from "../../../../domain/dto";
import { RateLimitedLogger } from "../../../../utils/RateLimitedLogger";

export class MessagesWsController {
  async sendMessageToRoom(
    ctx: WsContext<CreateMessageDTO & { timestamp?: number; attachments?: string[] }>
  ) {
    const { userService, messageService, roomService, redisService, attachmentFinalizer, messageEffects } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const { roomId, content, timestamp, clientMsgId, attachments } = (ctx.payload || {}) as any;
    if (!roomId)
      return { error: "Not authenticated or missing data." };

    // Fine-grained rate limit per user+room (e.g., 30 msgs / 10s)
    try {
      const rlKey = K.rlSendRoom(roomId, userId);
      const count = await incrWithTtl(redisService, rlKey, TTL.rateWindowSend, 1);
      if (count > 30) {
        return { success: false, error: "Rate limit exceeded. Please slow down." };
      }
    } catch { RateLimitedLogger.warn("ws:msg:rateLimit", `Failed to apply rate limit for ${userId}:${roomId}`); }

    // Idempotency guard if clientMsgId provided
    if (clientMsgId && typeof clientMsgId === "string") {
      try {
        const idemKey = K.idempMsg(clientMsgId);
        const n = await redisService.incrBy(idemKey, 1);
        if (n === 1) {
          // first time seen -> set expiry
          try { await redisService.expire(idemKey, TTL.idempotency); } catch { RateLimitedLogger.warn("ws:msg:idemp:expire", `Failed to set idempotency TTL for ${clientMsgId}`); }
        } else {
          // duplicate submission -> acknowledge without re-creating
          return { success: true, duplicate: true };
        }
      } catch { RateLimitedLogger.warn("ws:msg:idemp", `Failed idempotency check for ${clientMsgId}`); }
    }

    const user = await userService.getUserById(userId);
    if (!user) return { error: "User not found." };

    let safeContent = sanitizeText(String(content || ""));
    const ts = typeof timestamp === "number" ? timestamp : Date.now();

    // Finalize attachments via service
    let normalizedKeys: string[] = [];
    let copyFailed: string[] = [];
    let finalUrls: string[] = [];
    try {
      const fin = await attachmentFinalizer.finalize(roomId, userId, ts, attachments);
      normalizedKeys = fin.normalizedKeys;
      copyFailed = fin.copyFailed;
      finalUrls = fin.finalUrls;
      if (fin.safeAppend) {
        safeContent = safeContent ? `${safeContent}\n${fin.safeAppend}` : fin.safeAppend;
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (!safeContent || !safeContent.trim()) {
      return { error: "Message must contain text or attachments." };
    }
    const msgObj = new Message(user, safeContent, ts);
    await messageService.addMessageToRoom(msgObj, roomId);
    // Update caches/stats via service
    try { await messageEffects.onMessageCreated(roomId, userId, msgObj, ts); } catch { RateLimitedLogger.warn("ws:msg:effects", `Failed to apply message effects for ${roomId}`); }

    // Emit to all sockets of room members (not only joined sockets)
    try {
      const members = await roomService.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u: User) => u.id));
      const sockets = await ctx.io.fetchSockets();
      for (const s of sockets) {
        const uid = (s.data as any)?.userId as string | undefined;
        if (uid && memberIds.has(uid)) {
          s.emit("message", { roomId, message: mapMessageToDTO(msgObj) });
        }
      }
      // Invalidate caches
      try { await messageEffects.invalidateRoomHistory(roomId); } catch { RateLimitedLogger.warn("ws:msg:invalidate:history", `Failed to invalidate room history for ${roomId}`); }
      try { await messageEffects.invalidateUnreadForUsers(memberIds); } catch { RateLimitedLogger.warn("ws:msg:invalidate:unread", `Failed to invalidate unread for ${roomId}`); }
    } catch {
      RateLimitedLogger.warn("ws:msg:broadcastFallback", `Falling back to room emit for ${roomId}`);
      ctx.io.to(roomId).emit("message", { roomId, message: mapMessageToDTO(msgObj) });
    }

    return {
      success: true,
      finalUrls,
      message: mapMessageToDTO(msgObj),
      normalizedKeys,
      copyFailed,
    };
  }

  async messageDelivered(
    ctx: WsContext<MessageDeliveryReceiptDTO & { timestamp?: number }>
  ) {
    const { messageService, roomService, messageEffects } = ctx.services;
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
      try { await messageEffects.invalidateUnreadForUsers(memberIds); } catch {}
    } catch {
      RateLimitedLogger.warn("ws:msg:delivered:broadcastFallback", `Falling back room emit for delivered ${roomId}`);
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
    ctx: WsContext<MessageReadReceiptDTO & { timestamp?: number }>
  ) {
    const { messageService, roomService, redisService} = ctx.services;
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
        try { await redisService.expire(K.readMax(roomId), TTL.readMax); } catch { RateLimitedLogger.warn("ws:msg:read:expire", `Failed to set readMax TTL for ${roomId}`); }
      }
    } catch { RateLimitedLogger.warn("ws:msg:read:hset", `Failed to set readMax for ${roomId}`); }
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
      } catch { RateLimitedLogger.warn("ws:msg:read:invalidateUnread", `Failed to invalidate unread for ${roomId}`); }
    } catch {
      RateLimitedLogger.warn("ws:msg:read:broadcastFallback", `Falling back room emit for read ${roomId}`);
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

  async messageEdit(
    ctx: WsContext<EditMessageDTO>
  ) {
    const { messageService, roomService, redisService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { roomId, messageId, newContent } = (ctx.payload || {}) as any;
    if (!roomId || typeof messageId !== 'number' || !newContent) return { success: false, error: 'Missing fields' };
    // Ownership
    const orig = await messageService.getMessageById(messageId);
    if (!orig) return { success: false, error: 'Message not found' };
    if (orig.author?.id !== userId) return { success: false, error: 'Only author can edit' };
    const clean = sanitizeText(String(newContent || '').slice(0, 2000));
    // Snapshot for undo (per user)
    try {
      await jsonSet(redisService, K.msgUndo(userId, messageId), {
        roomId,
        messageId,
        prevContent: orig.content,
        at: Date.now(),
      }, TTL.undo);
    } catch { RateLimitedLogger.warn("ws:msg:edit:snapshot", `Failed to snapshot undo for ${userId}:${messageId}`); }
    await messageService.updateMessageContent(messageId, clean);
    // Broadcast update
    try {
      ctx.io.to(roomId).emit('messageEdited', { roomId, messageId, content: clean });
    } catch { RateLimitedLogger.warn("ws:msg:edit:emit", `Failed to emit messageEdited for ${roomId}:${messageId}`); }
    return { success: true };
  }

  async messageDelete(
    ctx: WsContext<DeleteMessageDTO>
  ) {
    const { messageService, roomService, redisService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { roomId, messageId } = (ctx.payload || {}) as any;
    if (!roomId || typeof messageId !== 'number') return { success: false, error: 'Missing fields' };
    const orig = await messageService.getMessageById(messageId);
    if (!orig) return { success: false, error: 'Message not found' };
    // Author or room owner can delete
    let allowed = orig.author?.id === userId;
    if (!allowed) {
      try { const room = await roomService.getRoomById(roomId); allowed = !!room && room.creatorId === userId; } catch { RateLimitedLogger.warn("ws:msg:delete:roomGet", `Failed to fetch room for permission check ${roomId}`); }
    }
    if (!allowed) return { success: false, error: 'Not allowed' };
    // Snapshot for undo (per user)
    try {
      await jsonSet(redisService, K.msgUndo(userId, messageId), {
        roomId,
        messageId,
        prevContent: orig.content,
        at: Date.now(),
      }, TTL.undo);
    } catch {}
    await messageService.softDeleteMessage(messageId);
    try {
      ctx.io.to(roomId).emit('messageDeleted', { roomId, messageId });
    } catch { RateLimitedLogger.warn("ws:msg:delete:emit", `Failed to emit messageDeleted for ${roomId}:${messageId}`); }
    return { success: true };
  }

  async messageUndo(
    ctx: WsContext<DeleteMessageDTO>
  ) {
    const { messageService, redisService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { roomId, messageId } = (ctx.payload || {}) as any;
    if (!roomId || typeof messageId !== 'number') return { success: false, error: 'Missing fields' };
    const snap = await jsonGet<{ roomId: string; messageId: number; prevContent: string }>(redisService, K.msgUndo(userId, messageId)).catch(() => null);
    if (!snap || snap.roomId !== roomId) return { success: false, error: 'Nothing to undo' };
    const clean = sanitizeText(String(snap.prevContent || '').slice(0, 2000));
    await messageService.updateMessageContent(messageId, clean);
    try { await redisService.del(K.msgUndo(userId, messageId)); } catch { RateLimitedLogger.warn("ws:msg:undo:del", `Failed to delete undo snapshot for ${userId}:${messageId}`); }
    // Emit with restored flag so clients can avoid '(edited)' tag for delete undo
    try { ctx.io.to(roomId).emit('messageEdited', { roomId, messageId, content: clean, restored: true }); } catch { RateLimitedLogger.warn("ws:msg:undo:emit", `Failed to emit messageEdited(restored) for ${roomId}:${messageId}`); }
    return { success: true };
  }

  async getUndoTTL(
    ctx: WsContext<DeleteMessageDTO>
  ) {
    const { redisService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { roomId, messageId } = (ctx.payload || {}) as any;
    if (!roomId || typeof messageId !== 'number') return { success: false, error: 'Missing fields' };
    try {
      const ttl = await redisService.ttl?.(K.msgUndo(userId, messageId));
      const ttlSeconds = typeof ttl === 'number' && ttl > 0 ? ttl : 0;
      return { success: true, ttlSeconds };
    } catch {
      return { success: true, ttlSeconds: 0 };
    }
  }
}
