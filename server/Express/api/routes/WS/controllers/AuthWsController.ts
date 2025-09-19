import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { WsContext } from "../router/WsContext";
import { User, UserSession } from "../../../../domain/entities";
import { Logger } from "../../../../utils/LoggerUtil";
import { mapSessionToDTO, mapUserToDTO } from "../../../../domain/dto";
import type { LoginRequestDTO, RefreshTokenRequestDTO } from "../../../../domain/dto";
import { RateLimitedLogger } from "../../../../utils/RateLimitedLogger";
import { K, TTL } from "../../../cache/cacheKeys";

export class AuthWsController {
  // authenticate via token (auto-login)
  async authenticate(ctx: WsContext<{ token: string }>) {
    const { authService, messageService, friendService, redisService } = ctx.services;
    const { token } = ctx.payload!;
    Logger.info("Authenticating via token");
    Logger.infoObj("token", token);
    const session = await authService.getUserSessionByToken(token);
    if (!session || !session.user) {
      return { success: false, error: "Invalid session." };
    }
    ctx.socket.data.userId = session.user.id;
    ctx.socket.data.user = session.user;
    // Touch presence immediately (in case presence interval hasn't started yet)
    try {
      await redisService.set(K.presence(session.user.id), "online", { EX: TTL.presenceOnline });
      await redisService.set(K.socketUser(ctx.socket.id), session.user.id, { EX: TTL.presenceOnline });
      try { await redisService.sAdd(K.userSockets(session.user.id), ctx.socket.id); } catch {}
    } catch { RateLimitedLogger.warn("ws:auth:touchPresence", `Failed to touch presence on authenticate for ${session.user.id}`); }
    // Broadcast presenceChanged (online) to friends' sockets only
    try {
      const rel = await friendService.listFriendsAndRequests(session.user.id);
      const friendIds = (rel || []).filter((r: any) => r && r.status === 'accepted').map((r: any) => String(r.userId));
      for (const fid of friendIds) {
        try {
          const sids = await redisService.sMembers(K.userSockets(fid));
          for (const sid of sids || []) ctx.io.to(sid).emit("presenceChanged", { userId: session.user.id, status: "online", lastSeen: null });
        } catch {}
      }
    } catch {}
    // initial unread counts
    try {
      const counts = await messageService.getUnreadCountsForUser(session.user.id);
      ctx.socket.emit("unreadCounts", { counts });
    } catch { RateLimitedLogger.warn("ws:auth:unreadCounts", `Failed to emit unreadCounts for ${session.user.id}`); }
    return {
      success: true,
      user: mapUserToDTO(session.user),
    };
  }

  // login
  async login(ctx: WsContext<LoginRequestDTO>) {
    const { userService, authService, friendService, redisService } = ctx.services;
    const { username, password } = ctx.payload!;

    const users = await userService.getUsers();
    const user = users.find((u: User) => u.name === username);
    if (!user) {
      return { error: "Invalid credentials." };
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: "Invalid credentials." };
    }

    ctx.socket.data.userId = user.id;

    const sessionToken = randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const refreshToken = randomUUID();
    const refreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const session = new UserSession(
      randomUUID(),
      user.id,
      sessionToken,
      Date.now(),
      expiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      user
    );
    await authService.addUserSession(session);
    // Touch presence immediately
    try {
      await redisService.set(K.presence(user.id), "online", { EX: TTL.presenceOnline });
      await redisService.set(K.socketUser(ctx.socket.id), user.id, { EX: TTL.presenceOnline });
      try { await redisService.sAdd(K.userSockets(user.id), ctx.socket.id); } catch {}
    } catch { RateLimitedLogger.warn("ws:auth:touchPresence", `Failed to touch presence on login for ${user.id}`); }
    // Broadcast presenceChanged (online) to friends' sockets only
    try {
      const rel = await friendService.listFriendsAndRequests(user.id);
      const friendIds = (rel || []).filter((r: any) => r && r.status === 'accepted').map((r: any) => String(r.userId));
      for (const fid of friendIds) {
        try {
          const sids = await redisService.sMembers(K.userSockets(fid));
          for (const sid of sids || []) ctx.io.to(sid).emit("presenceChanged", { userId: user.id, status: "online", lastSeen: null });
        } catch {}
      }
    } catch {}

    return {
      user: mapUserToDTO(user),
      token: sessionToken,
      refreshToken,
      expiresAt,
      refreshTokenExpiresAt,
    };
  }

  // refresh token
  async refreshToken(ctx: WsContext<RefreshTokenRequestDTO>) {
    const { authService, friendService, redisService } = ctx.services;
    const { refreshToken } = ctx.payload!;
    const session = await authService.getUserSessionByRefreshToken(refreshToken);
    if (!session) return { error: "Invalid refresh token." };
    if (
      !session.refreshTokenExpiresAt ||
      session.refreshTokenExpiresAt < Date.now()
    ) {
      await authService.deleteUserSession(session.token);
      return { error: "Refresh token expired." };
    }
    await authService.deleteUserSession(session.token);
    const newToken = randomUUID();
    const newRefreshToken = randomUUID();
    const newRefreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const newSession = new UserSession(
      randomUUID(),
      session.userId,
      newToken,
      Date.now(),
      newExpiresAt,
      newRefreshToken,
      newRefreshTokenExpiresAt,
      session.user
    );
    await authService.addUserSession(newSession);
    return {
      user: session.user ? mapUserToDTO(session.user) : undefined,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    };
  }

  async logout(ctx: WsContext<{ token: string }>) {
    Logger.info("Logout requested");
    // Logger.infoObj("token", ctx.payload?.token);
    const { authService, friendService, redisService } = ctx.services;
    const { token } = ctx.payload!;
    await authService.deleteUserSession(token);
    // Handle presence cleanup BEFORE clearing userId so disconnect flow has the right uid
    try {
      const uid = (ctx.socket.data as any)?.userId as string | undefined;
      if (uid) {
        try { await redisService.del(K.socketUser(ctx.socket.id)); } catch {}
        try { await redisService.sRem(K.userSockets(uid), ctx.socket.id); } catch {}
        try {
          const devs = await redisService.sMembers(K.userSockets(uid));
          if (!devs || devs.length === 0) {
            const now = Date.now();
            try { await redisService.set(K.lastSeen(uid), String(now)); } catch {}
            try { await redisService.del(K.presence(uid)); } catch {}
            // Broadcast to friends only
            try {
              const rel = await friendService.listFriendsAndRequests(uid);
              const friendIds = (rel || []).filter((r: any) => r && r.status === 'accepted').map((r: any) => String(r.userId));
              for (const fid of friendIds) {
                try {
                  const sids = await redisService.sMembers(K.userSockets(fid));
                  for (const sid of sids || []) ctx.io.to(sid).emit("presenceChanged", { userId: uid, status: "offline", lastSeen: now });
                } catch {}
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}
    // Now clear local session data
    ctx.socket.data.userId = undefined;
    ctx.socket.data.user = undefined;
    // Important: return success first so the WS ack can be sent,
    // then disconnect on a short delay to avoid dropping the ack.
    setTimeout(() => {
      try { ctx.socket.disconnect(true); } catch { RateLimitedLogger.warn("ws:auth:disconnect", `Failed to disconnect socket on logout`); }
    }, 25);
    return { success: true };
  }

  async getSessions(ctx: WsContext) {
    const { authService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const sessions = await authService.getUserSessionsByUserId(userId);
    return { success: true, sessions: sessions.map((s: UserSession) => mapSessionToDTO(s)) };
  }

  async revokeSession(ctx: WsContext<{ token: string }>) {
    const { authService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { token } = ctx.payload!;
    const session = await authService.getUserSessionByToken(token);
    if (!session || session.userId !== userId) {
      return { success: false, error: "Session not found or not owned." };
    }
    await authService.deleteUserSession(token);
    return { success: true };
  }

  async logoutAll(ctx: WsContext) {
    const { authService } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    await authService.deleteAllUserSessionsByUserId(userId);
    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      if ((s.data as any)?.userId === userId) {
        s.emit("forceLogout", { reason: "logoutAll" });
        // Defer disconnect so current handler can return success and WS ack can be sent
        setTimeout(() => {
          try { s.disconnect(true); } catch {}
        }, 25);
      }
    }
    // Return success immediately so caller receives the ack
    return { success: true };
  }
}
