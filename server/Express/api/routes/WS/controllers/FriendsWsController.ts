import { WsContext } from "../router/WsContext";

export class FriendsWsController {
  async friendRequest(ctx: WsContext<{ targetUserId: string }>) {
    const { friendService } = ctx.services;
    const { redisService } = ctx.services as any;
    const requesterId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!requesterId) return { success: false, error: "Not authenticated." };
    const { targetUserId } = (ctx.payload || {}) as any;
    if (!targetUserId || targetUserId === requesterId) {
      return { success: false, error: "Invalid targetUserId." };
    }
    const fr = await friendService.createFriendRequest(requesterId, targetUserId);

    // Invalidate both users' friends cache
    try {
      await (redisService?.del?.([
        `cache:friends:${requesterId}`,
        `cache:friends:${targetUserId}`,
      ]) ?? Promise.resolve(0));
    } catch {}

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
    const { friendService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { otherUserId, action } = (ctx.payload || {}) as any;
    if (!otherUserId || (action !== "accept" && action !== "reject")) {
      return { success: false, error: "Invalid payload." };
    }
    const res = await friendService.respondFriendRequest(userId, otherUserId, action);

    // Invalidate both users' friends cache
    try {
      await (redisService?.del?.([
        `cache:friends:${userId}`,
        `cache:friends:${otherUserId}`,
      ]) ?? Promise.resolve(0));
    } catch {}

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
    const { friendService } = ctx.services;
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const key = `cache:friends:${userId}`;
    try {
      const cached = await redisService?.get?.(key);
      if (cached) {
        const items = JSON.parse(cached);
        return { success: true, items };
      }
    } catch {}
    const list = await friendService.listFriendsAndRequests(userId);
    try {
      await redisService?.set?.(key, JSON.stringify(list), { EX: 300 });
    } catch {}
    return { success: true, items: list };
  }
}
