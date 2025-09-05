import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { WsContext } from "../router/WsContext";
import { bruteForceGuard } from "../../../utils/BruteForceGuard";
import { UserSession } from "../../../models";

export class AuthWsController {
  // authenticate via token (auto-login)
  async authenticate(ctx: WsContext<{ token: string }>) {
    const { db } = ctx.services;
    const { token } = ctx.payload!;
    const session = await db.getUserSessionByToken(token);
    if (!session || !session.user) {
      return { success: false, error: "Invalid session." };
    }
    ctx.socket.data.userId = session.user.id;
    ctx.socket.data.user = session.user;
    // initial unread counts
    try {
      const counts = await db.getUnreadCountsForUser(session.user.id);
      ctx.socket.emit("unreadCounts", { counts });
    } catch {}
    return { success: true, id: session.user.id, name: session.user.name };
  }

  // login
  async login(ctx: WsContext<{ username: string; password: string }>) {
    const { db } = ctx.services;
    const { username, password } = ctx.payload!;

    // brute-force guard: IP + username
    const trustProxyEnv = process.env.TRUST_PROXY;
    const trustProxy =
      trustProxyEnv === "true" ||
      (!!trustProxyEnv && trustProxyEnv !== "false");
    const xff = (ctx.socket.handshake.headers as any)["x-forwarded-for"] as
      | string
      | undefined;
    const ip =
      trustProxy && xff
        ? xff.split(",")[0].trim()
        : ctx.socket.handshake.address || "unknown";
    if (bruteForceGuard.isBlockedIP(ip)) {
      return {
        error: "Too many login attempts from this IP. Try again later.",
      };
    }
    if (bruteForceGuard.isBlockedKey(username)) {
      return {
        error: "Too many login attempts for this user. Try again later.",
      };
    }

    const users = await db.getUsers();
    const user = users.find((u) => u.name === username);
    if (!user) {
      bruteForceGuard.onFailure(ip, username);
      return { error: "Invalid credentials." };
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      bruteForceGuard.onFailure(ip, username);
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
    await db.addUserSession(session);

    bruteForceGuard.onSuccess(ip, username);

    return {
      id: user.id,
      name: user.name,
      token: sessionToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  // refresh token
  async refreshToken(ctx: WsContext<{ refreshToken: string }>) {
    const { db } = ctx.services;
    const { refreshToken } = ctx.payload!;
    const session = await db.getUserSessionByRefreshToken(refreshToken);
    if (!session) return { error: "Invalid refresh token." };
    if (
      !session.refreshTokenExpiresAt ||
      session.refreshTokenExpiresAt < Date.now()
    ) {
      await db.deleteUserSession(session.token);
      return { error: "Refresh token expired." };
    }
    await db.deleteUserSession(session.token);
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
    await db.addUserSession(newSession);
    return {
      id: session.userId,
      name: session.user?.name,
      token: newToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    };
  }

  async logout(ctx: WsContext<{ token: string }>) {
    const { db } = ctx.services;
    const { token } = ctx.payload!;
    await db.deleteUserSession(token);
    ctx.socket.data.userId = undefined;
    ctx.socket.data.user = undefined;
    ctx.socket.disconnect(true);
    return { success: true };
  }

  async getSessions(ctx: WsContext) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const sessions = await db.getUserSessionsByUserId(userId);
    return { success: true, sessions: sessions.map((s) => s.toJSON()) };
  }

  async revokeSession(ctx: WsContext<{ token: string }>) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    const { token } = ctx.payload!;
    const session = await db.getUserSessionByToken(token);
    if (!session || session.userId !== userId) {
      return { success: false, error: "Session not found or not owned." };
    }
    await db.deleteUserSession(token);
    return { success: true };
  }

  async logoutAll(ctx: WsContext) {
    const { db } = ctx.services;
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) return { success: false, error: "Not authenticated." };
    await db.deleteAllUserSessionsByUserId(userId);

    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      if ((s.data as any)?.userId === userId) {
        s.emit("forceLogout", { reason: "logoutAll" });
        s.disconnect(true);
      }
    }
    return { success: true };
  }
}
