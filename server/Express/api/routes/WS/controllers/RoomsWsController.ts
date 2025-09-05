import { WsContext } from "../router/WsContext";
import { Room } from "../../../../domain/entities";

export class RoomsWsController {
  async createRoom(
    ctx: WsContext<{
      name: string;
      type?: "room" | "user";
      isPublic?: boolean;
      invitedUserIds?: string[];
    }>
  ) {
    const { roomService } = ctx.services;
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
      // @ts-ignore DatabaseService has addUsersToRoomBulk
      await (db as any).addUsersToRoomBulk(invitees, room.id);
    }

    // Emit personalized visible rooms to connected users
    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      const uid = (s.data as any)?.userId as string | undefined;
      if (!uid) continue;
      const vis = await roomService.getVisibleRoomsForUser(uid);
      s.emit(
        "rooms",
        vis.map((r) => r.toJSON())
      );
    }
    return { success: true };
  }

  async getRooms(ctx: WsContext) {
    const { roomService, messageService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId)
      return { error: "Vous devez être connecté pour envoyer un message." };
    const rooms = await roomService.getVisibleRoomsForUser(userId);
    ctx.socket.emit(
      "rooms",
      rooms.map((r) => r.toJSON())
    );
    try {
      const counts = await messageService.getUnreadCountsForUser(userId);
      ctx.socket.emit("unreadCounts", { counts });
    } catch {}
    return { success: true };
  }

  async joinRoom(ctx: WsContext<{ roomId: string }>) {
    const { userService, roomService, messageService } = ctx.services;
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

    const messages = await messageService.getMessagesForRoom(roomId);
    ctx.socket.emit("roomHistory", {
      roomId,
      messages: messages.map((m) => m.toJSON()),
    });

    const users = await roomService.getUsersForRoom(roomId);
    ctx.io
      .to(roomId)
      .emit("roomUsers", { roomId, users: users.map((u) => u.toJSON()) });

    return { success: true };
  }
}
