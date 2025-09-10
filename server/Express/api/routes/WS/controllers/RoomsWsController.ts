import { WsContext } from "../router/WsContext";
import { Room, Message, User } from "../../../../domain/entities";
import { K, TTL } from "../../../cache/cacheKeys";
import { mapRoomToDTO, mapUserToDTO, mapMessageToDTO } from "../../../../domain/dto";

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
    // Distributed lock for DM creation to avoid duplicates (A<->B)
    if ((type ?? "room") === "user") {
      const invitees = Array.isArray(invitedUserIds) ? invitedUserIds.filter((id: string) => !!id && id !== creatorId) : [];
      const otherId = invitees[0];
      if (otherId) {
        const a = creatorId < otherId ? creatorId : otherId;
        const b = creatorId < otherId ? otherId : creatorId;
        const lockKey = K.lock(`dm:${a}:${b}`);
        const locked = await redisService.setNxExpire(lockKey, ctx.socket.id || "1", 5);
        if (!locked) {
          return { success: false, error: "DM déjà en cours de création. Réessayez." };
        }
        // We rely on EX to auto-release shortly; no DEL required
      }
    }
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
      s.emit("rooms", vis.map((r: Room) => mapRoomToDTO(r)));
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
      if (cached) {
        roomsJson = JSON.parse(cached);
        try { await redisService.incrBy(K.statsHit('roomsVisible')); } catch {}
      } else {
        try { await redisService.incrBy(K.statsMiss('roomsVisible')); } catch {}
      }
    } catch {}

    if (!roomsJson) {
      const rooms = await roomService.getVisibleRoomsForUser(userId);
      roomsJson = rooms.map((r: Room) => mapRoomToDTO(r));
      // Extra safety: enforce private visibility server-side
      try {
        roomsJson = (roomsJson || []).filter((r: any) => {
          if (!r) return false;
          if (r.isPublic) return true;
          if (r.creatorId === userId) return true;
          const users = Array.isArray(r.users) ? r.users : [];
          return users.some((u: any) => u && u.id === userId);
        });
      } catch {}
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
        if (cachedUnread) {
          counts = JSON.parse(cachedUnread);
          try { await redisService.incrBy(K.statsHit('unreadCounts')); } catch {}
        } else {
          try { await redisService.incrBy(K.statsMiss('unreadCounts')); } catch {}
        }
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
    // Track online counter for this room
    try {
      const count = await redisService.incrBy(K.roomOnline(roomId), 1);
      try { await redisService.expire(K.roomOnline(roomId), TTL.roomOnlineExpire); } catch {}
      // Notify room about new online count
      ctx.io.to(roomId).emit("roomOnline", { roomId, count });
    } catch {}

    // Invalidate this user's cached visible rooms
    try {
      await (redisService?.del?.(K.roomsVisible(userId)) ?? Promise.resolve(0));
    } catch {}

    // Room history with Redis cache
    let historyJson: any[] | null = null;
    const historyKey = K.roomHistory(roomId);
    try {
      const cachedHistory = await redisService?.get?.(historyKey);
      if (cachedHistory) {
        historyJson = JSON.parse(cachedHistory);
        try { await redisService.incrBy(K.statsHit('roomHistory')); } catch {}
      } else {
        try { await redisService.incrBy(K.statsMiss('roomHistory')); } catch {}
      }
    } catch {}
    if (!historyJson) {
      const messages = await messageService.getMessagesForRoom(roomId);
      historyJson = messages.map((m: Message) => mapMessageToDTO(m));
      try {
        await redisService?.set?.(historyKey, JSON.stringify(historyJson), { EX: 60 });
      } catch {}
    }
    ctx.socket.emit("roomHistory", { roomId, messages: historyJson });

    const users = await roomService.getUsersForRoom(roomId);
    ctx.io
      .to(roomId)
      .emit("roomUsers", { roomId, users: users.map((u: User) => mapUserToDTO(u)) });

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
      // Aggregate typing count and broadcast
      try {
        const cnt = await redisService.incrBy(K.typingCount(roomId), 1);
        try { await redisService.expire(K.typingCount(roomId), 10); } catch {}
        ctx.io.to(roomId).emit("typingCount", { roomId, count: Math.max(0, cnt) });
      } catch {}
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
      // Decrement typing count and broadcast
      try {
        const cnt = await redisService.incrBy(K.typingCount(roomId), -1);
        try { await redisService.expire(K.typingCount(roomId), 10); } catch {}
        ctx.io.to(roomId).emit("typingCount", { roomId, count: Math.max(0, cnt) });
      } catch {}
    } catch {}
    ctx.io.to(roomId).emit("typing", { roomId, userId, typing: false });
    return { success: true };
  }

  // Paginated history loader with versioned cache pages
  async loadRoomHistory(ctx: WsContext<{ roomId: string; cursor?: number; size?: number }>) {
    const { messageService, roomService, redisService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const roomId = (ctx.payload as any)?.roomId as string | undefined;
    let cursor = Number((ctx.payload as any)?.cursor ?? 0) || 0;
    let size = Number((ctx.payload as any)?.size ?? 50) || 50;
    if (!roomId) return { success: false, error: "Missing roomId." };
    if (size > 200) size = 200; // cap page size

    // Resolve version, default 0
    let ver = 0;
    try {
      const v = await redisService.get(K.historyVer(roomId));
      ver = v ? parseInt(v, 10) || 0 : 0;
    } catch {}

    const pageKey = K.historyPage(roomId, ver, cursor, size);
    try {
      const cached = await redisService.get(pageKey);
      if (cached) {
        const data = JSON.parse(cached);
        try { await redisService.incrBy(K.statsHit('roomHistoryPage')); } catch {}
        return { success: true, roomId, cursor, size, ver, messages: data };
      } else {
        try { await redisService.incrBy(K.statsMiss('roomHistoryPage')); } catch {}
      }
    } catch {}

    // Fallback: fetch full history then slice (until repo supports pagination)
    const room = await roomService.getRoomById(roomId);
    if (!room) return { success: false, error: "Room not found." };
    if (!room.isPublic) {
      const isMember = await roomService.isUserInRoom(userId, roomId);
      if (!isMember && room.creatorId !== userId) {
        return { success: false, error: "Access denied." };
      }
    }
    const all = await messageService.getMessagesForRoom(roomId);
    const sliced = all
      .sort((a: Message, b: Message) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .slice(cursor, cursor + size)
      .map((m: Message) => mapMessageToDTO(m));
    try { await redisService.set(pageKey, JSON.stringify(sliced), { EX: TTL.roomHistoryPage }); } catch {}
    return { success: true, roomId, cursor, size, ver, messages: sliced };
  }

  // Top active rooms (by recent activity timestamp)
  async getTopActiveRooms(ctx: WsContext<{ limit?: number }>) {
    const { redisService, roomService } = ctx.services as any;
    let limit = Number((ctx.payload as any)?.limit ?? 10) || 10;
    if (limit > 50) limit = 50;
    try {
      const items: any = await redisService.zRange(K.roomsActiveZ(), -limit, -1, { REV: true, WITHSCORES: true });
      // node-redis returns array of { value, score }
      const roomIds: string[] = Array.isArray(items) ? items.map((x: any) => x.value ?? x) : [];
      // Optional: fetch basic room data to return names
      const rooms = await Promise.all(roomIds.map((rid) => roomService.getRoomById(rid)));
      return { success: true, items: rooms.filter(Boolean).map((r: Room) => mapRoomToDTO(r as Room)) };
    } catch {
      return { success: true, items: [] };
    }
  }

  // Last message for a room (cached)
  async getRoomLastMessage(ctx: WsContext<{ roomId: string }>) {
    const { redisService, messageService } = ctx.services as any;
    const roomId = (ctx.payload as any)?.roomId as string | undefined;
    if (!roomId) return { success: false, error: 'Missing roomId' };
    try {
      const cached = await redisService.get(K.roomLastMessage(roomId));
      if (cached) {
        try { await redisService.incrBy(K.statsHit('roomLastMessage')); } catch {}
        return { success: true, roomId, message: JSON.parse(cached) };
      } else {
        try { await redisService.incrBy(K.statsMiss('roomLastMessage')); } catch {}
      }
    } catch {}
    // Fallback: get all messages and return last
    try {
      const all = await messageService.getMessagesForRoom(roomId);
      const last = all.sort((a: Message,b: Message)=> (a.timestamp??0)-(b.timestamp??0)).at(-1);
      if (last) return { success: true, roomId, message: mapMessageToDTO(last) };
    } catch {}
    return { success: true, roomId, message: null };
  }

  // Active users leaderboard (ZSET)
  async getActiveUsersTop(ctx: WsContext<{ limit?: number }>) {
    const { redisService } = ctx.services as any;
    let limit = Number((ctx.payload as any)?.limit ?? 10) || 10;
    if (limit > 100) limit = 100;
    try {
      const items: any = await redisService.zRange(K.lbActiveUsers(), -limit, -1, { REV: true, WITHSCORES: true });
      const top = (Array.isArray(items) ? items : []).map((x: any) => ({ userId: x.value ?? x, score: x.score ?? 0 }));
      return { success: true, top };
    } catch {
      return { success: true, top: [] };
    }
  }

  // Message counters for a room in a time range (hour/day)
  async getRoomMessageCounts(ctx: WsContext<{ roomId: string; range?: 'hour' | 'day'; from?: number; to?: number }>) {
    const { redisService, roomService } = ctx.services as any;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: 'Not authenticated.' };
    const payload = (ctx.payload as any) || {};
    const roomId = String(payload.roomId || '');
    const range = (payload.range === 'day' ? 'day' : 'hour') as 'hour' | 'day';
    const from = Number(payload.from ?? 0) || 0;
    const to = Number(payload.to ?? Date.now()) || Date.now();
    if (!roomId) return { success: false, error: 'Missing roomId' };
    if (to < from) return { success: false, error: 'Invalid range' };
    // Access control for private rooms
    const room = await roomService.getRoomById(roomId);
    if (!room) return { success: false, error: 'Room not found.' };
    if (!room.isPublic) {
      const isMember = await roomService.isUserInRoom(userId, roomId);
      if (!isMember && room.creatorId !== userId) return { success: false, error: 'Access denied.' };
    }
    const results: Array<{ bucket: string; count: number }> = [];
    const dFrom = new Date(from);
    const dTo = new Date(to);
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    const iter = new Date(Date.UTC(
      dFrom.getUTCFullYear(), dFrom.getUTCMonth(), dFrom.getUTCDate(), range === 'hour' ? dFrom.getUTCHours() : 0, 0, 0, 0
    ));
    let maxBuckets = range === 'hour' ? 24 * 31 : 366; // guardrail
    while (iter.getTime() <= dTo.getTime() && maxBuckets-- > 0) {
      if (range === 'hour') {
        const key = `${iter.getUTCFullYear()}${pad(iter.getUTCMonth() + 1)}${pad(iter.getUTCDate())}${pad(iter.getUTCHours())}`;
        const redisKey = K.roomMsgsHour(roomId, key);
        let v = 0;
        try {
          const s = await redisService.get(redisKey);
          if (s) v = parseInt(s, 10) || 0;
        } catch {}
        results.push({ bucket: key, count: v });
        iter.setUTCHours(iter.getUTCHours() + 1);
      } else {
        const key = `${iter.getUTCFullYear()}${pad(iter.getUTCMonth() + 1)}${pad(iter.getUTCDate())}`;
        const redisKey = K.roomMsgsDay(roomId, key);
        let v = 0;
        try {
          const s = await redisService.get(redisKey);
          if (s) v = parseInt(s, 10) || 0;
        } catch {}
        results.push({ bucket: key, count: v });
        iter.setUTCDate(iter.getUTCDate() + 1);
      }
    }
    return { success: true, roomId, range, from, to, items: results };
  }
}
