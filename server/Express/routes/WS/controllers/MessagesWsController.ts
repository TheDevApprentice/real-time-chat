import { WsContext } from "../router/WsContext";
import { Message } from "../../../models";
import { sanitizeText } from "../../../utils/text";

export class MessagesWsController {
  async sendMessageToRoom(
    ctx: WsContext<{ roomId: string; content: string; timestamp?: number }>
  ) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const { roomId, content, timestamp } = (ctx.payload || {}) as any;
    if (!roomId || !content)
      return { error: "Not authenticated or missing data." };

    const user = await db.getUserById(userId);
    if (!user) return { error: "User not found." };

    const safeContent = sanitizeText(content);
    const ts = typeof timestamp === "number" ? timestamp : Date.now();
    const msgObj = new Message(user, safeContent, ts);
    await db.addMessageToRoom(msgObj, roomId);

    // Emit to all sockets of room members (not only joined sockets)
    try {
      const members = await db.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u) => u.id));
      const sockets = await ctx.io.fetchSockets();
      for (const s of sockets) {
        const uid = (s.data as any)?.userId as string | undefined;
        if (uid && memberIds.has(uid)) {
          s.emit("message", { roomId, message: msgObj.toJSON() });
        }
      }
    } catch {
      ctx.io.to(roomId).emit("message", { roomId, message: msgObj.toJSON() });
    }

    return { success: true };
  }

  async messageDelivered(
    ctx: WsContext<{ messageId: number; roomId: string; timestamp?: number }>
  ) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { messageId, roomId, timestamp } = (ctx.payload || {}) as any;
    if (!messageId || !roomId)
      return { success: false, error: "Missing messageId or roomId." };

    await db.markMessageDelivered(messageId, timestamp ?? Date.now());
    try {
      const members = await db.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u) => u.id));
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
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { messageId, roomId, timestamp } = (ctx.payload || {}) as any;
    if (!messageId || !roomId)
      return { success: false, error: "Missing messageId or roomId." };

    await db.markMessageRead(messageId, timestamp ?? Date.now());
    try {
      const members = await db.getUsersForRoom(roomId);
      const memberIds = new Set((members || []).map((u) => u.id));
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
