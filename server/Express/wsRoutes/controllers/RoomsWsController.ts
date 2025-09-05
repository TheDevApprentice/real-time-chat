import { WsContext } from "../WsContext";
import { Room } from "../../models";

export class RoomsWsController {
  async createRoom(ctx: WsContext<{ name: string; type?: 'room' | 'user'; isPublic: boolean; invitedUserIds?: string[] }>) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { error: "Vous devez être connecté pour créer une room." };

    const { name, type, isPublic, invitedUserIds } = (ctx.payload || {}) as any;
    const creatorId = userId;
    const room = new Room(name, creatorId, Date.now(), undefined, [], { type: type ?? 'room', isPublic });
    await db.addRoom(room);
    // Always add creator
    await db.addUserToRoom(creatorId, room.id);
    // If private, add invitees (distinct and not the creator)
    const invitees = Array.isArray(invitedUserIds) ? invitedUserIds.filter((id: string) => !!id && id !== creatorId) : [];
    if (!room.isPublic && invitees.length > 0) {
      // @ts-ignore DatabaseService has addUsersToRoomBulk
      await (db as any).addUsersToRoomBulk(invitees, room.id);
    }

    // Emit personalized visible rooms to connected users
    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      const uid = (s.data as any)?.userId as string | undefined;
      if (!uid) continue;
      const vis = await db.getVisibleRoomsForUser(uid);
      s.emit("rooms", vis.map((r) => r.toJSON()));
    }
    return { success: true };
  }

  async getRooms(ctx: WsContext) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { error: "Vous devez être connecté pour envoyer un message." };
    const rooms = await db.getVisibleRoomsForUser(userId);
    ctx.socket.emit("rooms", rooms.map((r) => r.toJSON()));
    try {
      const counts = await db.getUnreadCountsForUser(userId);
      ctx.socket.emit("unreadCounts", { counts });
    } catch {}
    return { success: true };
  }

  async joinRoom(ctx: WsContext<{ roomId: string }>) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { error: "Vous devez être connecté pour envoyer un message." };

    const { roomId } = (ctx.payload || {}) as any;
    if (!roomId) return { error: "Missing roomId." };

    const user = await db.getUserById(userId);
    if (!user) return { error: "User not found." };

    const room = await db.getRoomById(roomId);
    if (!room) return { error: "Room not found." };
    if (!room.isPublic) {
      const isMember = await db.isUserInRoom(userId, roomId);
      if (!isMember && room.creatorId !== userId) {
        return { error: "Access denied to private room." };
      }
    }

    await db.addUserToRoom(userId, roomId);
    ctx.socket.join(roomId);

    const messages = await db.getMessagesForRoom(roomId);
    ctx.socket.emit("roomHistory", { roomId, messages: messages.map((m) => m.toJSON()) });

    const users = await db.getUsersForRoom(roomId);
    ctx.io.to(roomId).emit("roomUsers", { roomId, users: users.map((u) => u.toJSON()) });

    return { success: true };
  }
}
