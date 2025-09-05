import { WsContext } from "../router/WsContext";
import { Message, User } from "../../../../domain/entities";
import { sanitizeText } from "../../../middleware/text";

export class MessagesWsController {
  async sendMessageToRoom(
    ctx: WsContext<{ roomId: string; content: string; timestamp?: number }>
  ) {
    const { userService, messageService, roomService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const { roomId, content, timestamp } = (ctx.payload || {}) as any;
    if (!roomId || !content)
      return { error: "Not authenticated or missing data." };

    const user = await userService.getUserById(userId);
    if (!user) return { error: "User not found." };

    const safeContent = sanitizeText(content);
    const ts = typeof timestamp === "number" ? timestamp : Date.now();
    const msgObj = new Message(user, safeContent, ts);
    await messageService.addMessageToRoom(msgObj, roomId);

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
        await (redisService?.del?.(`cache:room:history:${roomId}`) ?? Promise.resolve(0));
      } catch {}
      // Invalidate unread cache for all members
      try {
        const keysToDel = Array.from(memberIds).map((id) => `cache:unread:${id}`);
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
