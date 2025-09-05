import { WsContext } from "../router/WsContext";
import { Room, Message, User } from "../../../../domain/entities";

export class RoomsWsController {
  async createRoom(
    ctx: WsContext<{
      name: string;
      type?: "room" | "user";
      isPublic?: boolean;
      invitedUserIds?: string[];
    }>
  ) {
    const { roomService, redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour créer une room." };

    const { name, type, isPublic, invitedUserIds } = (ctx.payload || {}) as any;
    const creatorId = userId;
    const room = new Room(name, creatorId, Date.now(), undefined, [], {
      type: type ?? "room",
      isPublic: isPublic ?? false,
    });
    await roomService.addRoom(room);
    // Always add creator
    await roomService.addUserToRoom(creatorId, room.id);
    // If private, add invitees (distinct and not the creator)
    const invitees = Array.isArray(invitedUserIds)
      ? invitedUserIds.filter((id: string) => !!id && id !== creatorId)
      : [];
    if (!room.isPublic && invitees.length > 0) {
      await roomService.addUsersToRoomBulk(invitees, room.id);
    }

    // Invalidate cached visible rooms for impacted users
    try {
      const keysToDel = [
        `cache:rooms:visible:${creatorId}`,
        ...invitees.map((id) => `cache:rooms:visible:${id}`),
      ];
      await (redisService?.del?.(keysToDel) ?? Promise.resolve(0));
    } catch {}

    // Emit personalized visible rooms to connected users
    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      const uid = (s.data as any)?.userId as string | undefined;
      if (!uid) continue;
      const vis = await roomService.getVisibleRoomsForUser(uid);
      s.emit(
        "rooms",
        vis.map((r: Room) => r.toJSON())
      );
    }
    return { success: true };
  }

  async getRooms(ctx: WsContext) {
    const { roomService, messageService, redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const cacheKey = `cache:rooms:visible:${userId}`;
    let roomsJson: any[] | null = null;
    try {
      const cached = await redisService?.get?.(cacheKey);
      if (cached) roomsJson = JSON.parse(cached);
    } catch {}

    if (!roomsJson) {
      const rooms = await roomService.getVisibleRoomsForUser(userId);
      roomsJson = rooms.map((r: Room) => r.toJSON());
      try {
        await redisService?.set?.(cacheKey, JSON.stringify(roomsJson), { EX: 60 });
      } catch {}
    }

    ctx.socket.emit("rooms", roomsJson);
    // Unread counts with cache-aside
    const unreadKey = `cache:unread:${userId}`;
    try {
      let counts: Record<string, number> | null = null;
      try {
        const cachedUnread = await redisService?.get?.(unreadKey);
        if (cachedUnread) counts = JSON.parse(cachedUnread);
      } catch {}
      if (!counts) {
        counts = await messageService.getUnreadCountsForUser(userId);
        try {
          await redisService?.set?.(unreadKey, JSON.stringify(counts), { EX: 45 });
        } catch {}
      }
      ctx.socket.emit("unreadCounts", { counts });
    } catch {}
    return { success: true };
  }

  async joinRoom(ctx: WsContext<{ roomId: string }>) {
    const { userService, roomService, messageService, redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };

    const { roomId } = (ctx.payload || {}) as any;
    if (!roomId) return { error: "Missing roomId." };

    const user = await userService.getUserById(userId);
    if (!user) return { error: "User not found." };

    const room = await roomService.getRoomById(roomId);
    if (!room) return { error: "Room not found." };
    if (!room.isPublic) {
      const isMember = await roomService.isUserInRoom(userId, roomId);
      if (!isMember && room.creatorId !== userId) {
        return { error: "Access denied to private room." };
      }
    }

    await roomService.addUserToRoom(userId, roomId);
    ctx.socket.join(roomId);

    // Invalidate this user's cached visible rooms
    try {
      await (redisService?.del?.(`cache:rooms:visible:${userId}`) ?? Promise.resolve(0));
    } catch {}

    // Room history with Redis cache
    let historyJson: any[] | null = null;
    const historyKey = `cache:room:history:${roomId}`;
    try {
      const cachedHistory = await redisService?.get?.(historyKey);
      if (cachedHistory) historyJson = JSON.parse(cachedHistory);
    } catch {}
    if (!historyJson) {
      const messages = await messageService.getMessagesForRoom(roomId);
      historyJson = messages.map((m: Message) => m.toJSON());
      try {
        await redisService?.set?.(historyKey, JSON.stringify(historyJson), { EX: 60 });
      } catch {}
    }
    ctx.socket.emit("roomHistory", { roomId, messages: historyJson });

    const users = await roomService.getUsersForRoom(roomId);
    ctx.io
      .to(roomId)
      .emit("roomUsers", { roomId, users: users.map((u: User) => u.toJSON()) });

    return { success: true };
  }
  
  // Typing indicators using Redis ephemeral keys
  async typingStart(ctx: WsContext<{ roomId: string }>) {
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const roomId = (ctx.payload as any)?.roomId as string | undefined;
    if (!roomId) return { success: false, error: "Missing roomId." };
    try {
      await redisService?.set?.(`typing:${roomId}:${userId}`, "1", { EX: 10 });
    } catch {}
    ctx.io.to(roomId).emit("typing", { roomId, userId, typing: true });
    return { success: true };
  }

  async typingStop(ctx: WsContext<{ roomId: string }>) {
    const { redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const roomId = (ctx.payload as any)?.roomId as string | undefined;
    if (!roomId) return { success: false, error: "Missing roomId." };
    try {
      await redisService?.del?.(`typing:${roomId}:${userId}`);
    } catch {}
    ctx.io.to(roomId).emit("typing", { roomId, userId, typing: false });
    return { success: true };
  }
}
