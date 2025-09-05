import { WsContext } from "../router/WsContext";

export class FriendsWsController {
  async friendRequest(ctx: WsContext<{ targetUserId: string }>) {
    const { db } = ctx.services;
    const requesterId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!requesterId) return { success: false, error: "Not authenticated." };
    const { targetUserId } = (ctx.payload || {}) as any;
    if (!targetUserId || targetUserId === requesterId) {
      return { success: false, error: "Invalid targetUserId." };
    }
    const fr = await db.createFriendRequest(requesterId, targetUserId);

    // Notify target user's sockets
    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      if ((s.data as any)?.userId === targetUserId) {
        s.emit("friendUpdated", { type: "request", data: fr });
      }
    }
    return { success: true, request: fr };
  }

  async friendRespond(
    ctx: WsContext<{ otherUserId: string; action: "accept" | "reject" }>
  ) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { otherUserId, action } = (ctx.payload || {}) as any;
    if (!otherUserId || (action !== "accept" && action !== "reject")) {
      return { success: false, error: "Invalid payload." };
    }
    const res = await db.respondFriendRequest(userId, otherUserId, action);

    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      const uid = (s.data as any)?.userId as string | undefined;
      if (uid === userId || uid === otherUserId) {
        s.emit("friendUpdated", { type: "respond", data: res, action });
      }
    }
    return { success: true, result: res };
  }

  async friendList(ctx: WsContext) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const list = await db.listFriendsAndRequests(userId);
    return { success: true, items: list };
  }
}
