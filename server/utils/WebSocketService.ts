import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { Message } from "../models/Message";
import { UserSession } from "../models/UserSession";
import { DatabaseService } from "./DatabaseService";
import { Logger } from "./Logger";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { bruteForceGuard } from "./BruteForceGuard";
import { 
  WsAuthenticateSchema,
  WsLoginSchema,
  WsRefreshTokenSchema,
  WsCreateRoomSchema,
  WsJoinRoomSchema,
  WsSendMessageSchema,
  RegisterSchema,
  parseOrThrow,
} from "./validation";

export class WebSocketService {
  private io: SocketServer;
  // Simple per-socket rate limiter storage
  private socketRates: Map<string, Record<string, { count: number; windowStart: number }>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: process.env.FRONTEND_URL, credentials: true },
    });
    this.handleConnections();
  }

  private handleConnections(): void {

    const sqliteFile = process.env.SQLITE_FILE;
    if (!sqliteFile) {
      throw new Error("SQLITE_FILE environment variable is not defined");
    }
    const dbService = DatabaseService.getInstance(sqliteFile);

    this.io.on("connection", async (socket: Socket) => {
      // helper: rate limit check
      const allow = (key: string, limit: number, windowMs: number): boolean => {
        const id = socket.id;
        const rec = this.socketRates.get(id) || {};
        const now = Date.now();
        const item = rec[key] || { count: 0, windowStart: now };
        if (now - item.windowStart > windowMs) {
          item.count = 0;
          item.windowStart = now;
        }
        item.count += 1;
        rec[key] = item;
        this.socketRates.set(id, rec);
        return item.count <= limit;
      };

      const sanitizeText = (input: string): string => {
        const trimmed = (input ?? "").toString().trim();
        const limited = trimmed.slice(0, 2000);
        // escape minimal HTML entities to prevent injection in clients that might render dangerously
        return limited
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      };
      // --- SESSION RESTORE VIA TOKEN OR COOKIE ---
      let token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        const cookieHeader = (socket.handshake.headers as any)["cookie"] as string | undefined;
        if (cookieHeader) {
          // Prefer hardened __Host-session cookie name
          let m = cookieHeader.match(/(?:^|; )__Host-session=([^;]+)/);
          if (!m) {
            // Dev fallback for legacy cookie name
            m = cookieHeader.match(/(?:^|; )session_token=([^;]+)/);
          }

          if (m) token = decodeURIComponent(m[1]);
        }
      }
      if (token) {
        try {
          const session = await dbService.getUserSessionByToken(token);
          if (session && session.user) {
            socket.data.userId = session.user.id;
            socket.data.user = session.user;
            socket.emit("sessionRestored", { user: session.user.toJSON() });
          }
        } catch (err) {
          Logger.error(
            "Session restore failed: " +
              (err instanceof Error ? err.message : String(err))
          );
        }
      }
      // Logger.info(`Client connected: ${socket.id}`);
      socket.on("disconnect", () => {
        this.socketRates.delete(socket.id);
      });

      // --- MESSAGE STATUS: delivered ---
      socket.on("messageDelivered", async (data, callback) => {
        try {
          if (!allow("chat:msgDelivered", 120, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          const userId = socket.data.userId as string | undefined;
          if (!userId) return callback && callback({ success: false, error: "Not authenticated." });
          const { messageId, roomId, timestamp } = (data || {}) as { messageId?: number; roomId?: string; timestamp?: number };
          if (!messageId || !roomId) return callback && callback({ success: false, error: "Missing messageId or roomId." });
          await dbService.markMessageDelivered(messageId, timestamp ?? Date.now());
          // Notify all sockets of room members (not only those joined to Socket.IO room)
          try {
            const members = await dbService.getUsersForRoom(roomId);
            const memberIds = new Set((members || []).map((u) => u.id));
            const sockets = await this.io.fetchSockets();
            for (const s of sockets) {
              const uid = s.data.userId as string | undefined;
              if (uid && memberIds.has(uid)) {
                s.emit("messageStatusUpdated", { messageId, status: "delivered", deliveredAt: timestamp ?? Date.now() });
              }
            }
          } catch {
            this.io.to(roomId).emit("messageStatusUpdated", { messageId, status: "delivered", deliveredAt: timestamp ?? Date.now() });
          }
          callback && callback({ success: true });
        } catch (err) {
          callback && callback({ success: false, error: "Failed to mark delivered." });
        }
      });

      // --- MESSAGE STATUS: read ---
      socket.on("messageRead", async (data, callback) => {
        try {
          if (!allow("chat:msgRead", 120, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          const userId = socket.data.userId as string | undefined;
          if (!userId) return callback && callback({ success: false, error: "Not authenticated." });
          const { messageId, roomId, timestamp } = (data || {}) as { messageId?: number; roomId?: string; timestamp?: number };
          if (!messageId || !roomId) return callback && callback({ success: false, error: "Missing messageId or roomId." });
          await dbService.markMessageRead(messageId, timestamp ?? Date.now());
          // Notify all sockets of room members (not only those joined to Socket.IO room)
          try {
            const members = await dbService.getUsersForRoom(roomId);
            const memberIds = new Set((members || []).map((u) => u.id));
            const sockets = await this.io.fetchSockets();
            for (const s of sockets) {
              const uid = s.data.userId as string | undefined;
              if (uid && memberIds.has(uid)) {
                s.emit("messageStatusUpdated", { messageId, status: "read", readAt: timestamp ?? Date.now() });
              }
            }
          } catch {
            this.io.to(roomId).emit("messageStatusUpdated", { messageId, status: "read", readAt: timestamp ?? Date.now() });
          }
          callback && callback({ success: true });
        } catch (err) {
          callback && callback({ success: false, error: "Failed to mark read." });
        }
      });

      // --- FRIENDS: create request ---
      socket.on("friendRequest", async (data, callback) => {
        try {
          if (!allow("friend:request", 30, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          const requesterId = socket.data.userId as string | undefined;
          if (!requesterId) return callback && callback({ success: false, error: "Not authenticated." });
          const { targetUserId } = (data || {}) as { targetUserId?: string };
          if (!targetUserId || targetUserId === requesterId) {
            return callback && callback({ success: false, error: "Invalid targetUserId." });
          }
          const fr = await dbService.createFriendRequest(requesterId, targetUserId);
          // Notify target user's sockets
          const sockets = await this.io.fetchSockets();
          for (const s of sockets) {
            if (s.data.userId === targetUserId) {
              s.emit("friendUpdated", { type: "request", data: fr });
            }
          }
          callback && callback({ success: true, request: fr });
        } catch (err) {
          callback && callback({ success: false, error: "Failed to create friend request." });
        }
      });

      // --- FRIENDS: respond to request ---
      socket.on("friendRespond", async (data, callback) => {
        try {
          if (!allow("friend:respond", 60, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          const userId = socket.data.userId as string | undefined;
          if (!userId) return callback && callback({ success: false, error: "Not authenticated." });
          const { otherUserId, action } = (data || {}) as { otherUserId?: string; action?: "accept" | "reject" };
          if (!otherUserId || (action !== "accept" && action !== "reject")) {
            return callback && callback({ success: false, error: "Invalid payload." });
          }
          const res = await dbService.respondFriendRequest(userId, otherUserId, action);
          // Notify both users
          const sockets = await this.io.fetchSockets();
          for (const s of sockets) {
            if (s.data.userId === userId || s.data.userId === otherUserId) {
              s.emit("friendUpdated", { type: "respond", data: res, action });
            }
          }
          callback && callback({ success: true, result: res });
        } catch (err) {
          callback && callback({ success: false, error: "Failed to respond to friend request." });
        }
      });

      // --- FRIENDS: list ---
      socket.on("friendList", async (data, callback) => {
        try {
          if (!allow("friend:list", 60, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          const userId = socket.data.userId as string | undefined;
          if (!userId) return callback && callback({ success: false, error: "Not authenticated." });
          const list = await dbService.listFriendsAndRequests(userId);
          callback && callback({ success: true, items: list });
        } catch (err) {
          callback && callback({ success: false, error: "Failed to list friends." });
        }
      });

      // AUTH: Authenticate via token (auto-login)
      socket.on("authenticate", async (data, callback) => {
        try {
          const { token } = parseOrThrow(WsAuthenticateSchema, data);
          if (!allow("auth:authenticate", 20, 60_000)) {
            return callback && callback({ success: false, error: "Rate limit exceeded." });
          }
          if (!token)
            return (
              callback &&
              callback({ success: false, error: "No token provided." })
            );
          const session = await dbService.getUserSessionByToken(token);
          if (!session || !session.user) {
            return (
              callback &&
              callback({ success: false, error: "Invalid session." })
            );
          }
          socket.data.userId = session.user.id;
          socket.data.user = session.user;
          callback &&
            callback({
              success: true,
              id: session.user.id,
              name: session.user.name,
            });
        } catch (err) {
          callback && callback({ success: false, error: "Auth failed." });
        }
      });

      // AUTH: Login
      socket.on("login", async (data, callback) => {
        if (!allow("auth:login", 10, 60_000)) {
          return callback && callback({ error: "Rate limit exceeded." });
        }
        const { username, password } = parseOrThrow(WsLoginSchema, data);
        try {
          // --- BRUTE FORCE PROTECTION (IP + username) via BruteForceGuard ---
          const trustProxyEnv = process.env.TRUST_PROXY;
          const trustProxy = trustProxyEnv === "true" || (!!trustProxyEnv && trustProxyEnv !== "false");
          const xff = (socket.handshake.headers as any)["x-forwarded-for"] as string | undefined;
          const ip = trustProxy && xff ? xff.split(",")[0].trim() : (socket.handshake.address || "unknown");
          if (bruteForceGuard.isBlockedIP(ip)) {
            return callback && callback({ error: "Too many login attempts from this IP. Try again later." });
          }
          if (bruteForceGuard.isBlockedKey(username)) {
            return callback && callback({ error: "Too many login attempts for this user. Try again later." });
          }

          const users = await dbService.getUsers();
          const user = users.find((u) => u.name === username);
          if (!user) {
            bruteForceGuard.onFailure(ip, username);
            return callback && callback({ error: "Invalid credentials." });
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            bruteForceGuard.onFailure(ip, username);
            return callback && callback({ error: "Invalid credentials." });
          }
          // Stocker l'ID utilisateur sur le socket
          socket.data.userId = user.id;

          // --- SESSION CREATION ---
          const sessionToken = randomUUID();
          const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
          const refreshToken = randomUUID();
          const refreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 jours
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
          await dbService.addUserSession(session);

          // Succès : reset compteurs via guard
          bruteForceGuard.onSuccess(ip, username);

          callback &&
            callback({
              id: user.id,
              name: user.name,
              token: sessionToken,
              refreshToken,
              refreshTokenExpiresAt,
            });
        } catch (err) {
          callback && callback({ error: "Login failed." });
        }
      });

      // Envoyer la liste des rooms à la connexion
      // dbService
      //   .getRooms()
      //   .then((rooms) => {
      //     socket.emit(
      //       "rooms",
      //       rooms.map((r) => r.toJSON())
      //     );
      //   })
      //   .catch((err: Error) => Logger.error(err.toString()));

      // --- REFRESH TOKEN EVENT ---
      
      socket.on("refreshToken", async (data, callback) => {
        if (!allow("auth:refresh", 20, 60_000)) {
          return callback && callback({ error: "Rate limit exceeded." });
        }
        const { refreshToken } = parseOrThrow(WsRefreshTokenSchema, data);
        try {
          // Recherche la session avec ce refreshToken (requête directe optimisée)
          const session = await dbService.getUserSessionByRefreshToken(refreshToken);
          if (!session) {
            return callback && callback({ error: "Invalid refresh token." });
          }
          if (
            !session.refreshTokenExpiresAt ||
            session.refreshTokenExpiresAt < Date.now()
          ) {
            await dbService.deleteUserSession(session.token);
            return callback && callback({ error: "Refresh token expired." });
          }
          // Rotation: supprimer l'ancienne session
          await dbService.deleteUserSession(session.token);
          // Créer une nouvelle session
          const newToken = randomUUID();
          const newRefreshToken = randomUUID();
          const newRefreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
          const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours, aligné sur REST/cookie
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
          await dbService.addUserSession(newSession);
          callback &&
            callback({
              id: session.userId,
              name: session.user?.name,
              token: newToken,
              refreshToken: newRefreshToken,
              refreshTokenExpiresAt: newRefreshTokenExpiresAt,
            });
        } catch (err) {
          callback && callback({ error: "Refresh token failed." });
        }
      });

      // Création d'une room
      socket.on("createRoom", async (data) => {
        try {
          if (!allow("chat:createRoom", 10, 60_000)) {
            return socket.emit("error", { error: "Rate limit exceeded." });
          }
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour créer une room.",
            });
            return;
          }
          const { name, type, isPublic, invitedUserIds } = parseOrThrow(WsCreateRoomSchema, data);
          const creatorId = socket.data.userId;
          // Vérifier que creatorId correspond à l'utilisateur connecté
          if (creatorId !== socket.data.userId) {
            socket.emit("error", {
              error: "Identifiant utilisateur invalide.",
            });
            return;
          }
          const Room = (await import("../models/Room")).Room;
          const room = new Room(name, creatorId, Date.now(), undefined, [], { type: type ?? 'room', isPublic });
          await dbService.addRoom(room);
          // Always add creator as member
          await dbService.addUserToRoom(creatorId, room.id);
          // If private, add invited users
          const invitees = Array.isArray(invitedUserIds) ? invitedUserIds.filter((id: string) => !!id && id !== creatorId) : [];
          if (!room.isPublic && invitees.length > 0) {
            // @ts-ignore addUsersToRoomBulk exists in DatabaseService
            await (dbService as any).addUsersToRoomBulk(invitees, room.id);
          }
          // Emit personalized visible rooms to connected users
          const sockets = await this.io.fetchSockets();
          for (const s of sockets) {
            const uid = s.data.userId as string | undefined;
            if (!uid) continue;
            const vis = await dbService.getVisibleRoomsForUser(uid);
            s.emit("rooms", vis.map((r) => r.toJSON()));
          }
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Récupérer la liste des rooms (à la demande)
      socket.on("getRooms", async () => {
        try {
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour envoyer un message.",
            });
            return;
          }
          const rooms = await dbService.getVisibleRoomsForUser(socket.data.userId);
          socket.emit(
            "rooms",
            rooms.map((r) => r.toJSON())
          );
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Rejoindre une room (Socket.IO join)
      socket.on("joinRoom", async (payload) => {
        try {
          if (!allow("chat:joinRoom", 20, 60_000)) {
            return socket.emit("error", { error: "Rate limit exceeded." });
          }
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour envoyer un message.",
            });
            return;
          }
          const { roomId } = parseOrThrow(WsJoinRoomSchema, payload);
          const userId = socket.data.userId;
          if (!roomId || !userId) {
            socket.emit("error", {
              error: "Not authenticated or missing roomId.",
            });
            return;
          }
          // Vérifier que l'utilisateur existe
          const user = await dbService.getUserById(userId);
          if (!user) {
            socket.emit("error", { error: "User not found." });
            return;
          }
          // Check room and permissions
          const room = await dbService.getRoomById(roomId);
          if (!room) {
            socket.emit("error", { error: "Room not found." });
            return;
          }
          if (!room.isPublic) {
            const isMember = await dbService.isUserInRoom(userId, roomId);
            if (!isMember && room.creatorId !== userId) {
              socket.emit("error", { error: "Access denied to private room." });
              return;
            }
          }
          // Add membership on join (idempotent)
          await dbService.addUserToRoom(userId, roomId);
          socket.join(roomId);
          // Envoyer l'historique des messages de la room
          const messages = await dbService.getMessagesForRoom(roomId);
          socket.emit("roomHistory", {
            roomId,
            messages: messages.map((m) => m.toJSON()),
          });
          // Envoyer la nouvelle liste des users de la room
          const users = await dbService.getUsersForRoom(roomId);
          this.io
            .to(roomId)
            .emit("roomUsers", { roomId, users: users.map((u) => u.toJSON()) });
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Envoyer un message dans une room
      socket.on("sendMessageToRoom", async (data) => {
        try {
          if (!allow("chat:sendMessage", 60, 10_000)) {
            return socket.emit("error", { error: "Rate limit exceeded." });
          }
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour envoyer un message.",
            });
            return;
          }
          const { roomId, content, timestamp } = parseOrThrow(WsSendMessageSchema, data);
          const userId = socket.data.userId;
          if (!roomId || !userId || !content) {
            socket.emit("error", {
              error: "Not authenticated or missing data.",
            });
            return;
          }
          // Vérifier que l'utilisateur existe
          const user = await dbService.getUserById(userId);
          if (!user) {
            socket.emit("error", { error: "User not found." });
            return;
          }
          const safeContent = sanitizeText(content);
          const msgObj = new Message(user, safeContent, timestamp);
          await dbService.addMessageToRoom(msgObj, roomId);
          // Diffuser le message à tous les sockets des utilisateurs membres de la room,
          // même si leur socket n'a pas explicitement "join" la room côté Socket.IO.
          // Cela garantit la réception (unread + delivered) même depuis la liste des rooms.
          try {
            const members = await dbService.getUsersForRoom(roomId);
            const memberIds = new Set((members || []).map((u) => u.id));
            const sockets = await this.io.fetchSockets();
            for (const s of sockets) {
              const uid = s.data.userId as string | undefined;
              if (uid && memberIds.has(uid)) {
                s.emit("message", { roomId, message: msgObj.toJSON() });
              }
            }
          } catch (e) {
            // Fallback: au cas où, on continue d'émettre dans la room Socket.IO
            this.io.to(roomId).emit("message", { roomId, message: msgObj.toJSON() });
          }
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Dans handleConnections()
      socket.on("logout", async (data, callback) => {
        try {
          // Logger.infoObj('Logout data: ', data.token);
          // Récupérer le token depuis les cookies du header handshake
          // const cookieHeader = socket.handshake.headers.cookie;
          // Logger.infoObj('Logout cookieHeader: ', data.token);
          let token: string | undefined;
          if (data.token) {
            const match = data.token.match(/([^;]+)/);
            // Logger.infoObj('Logout match: ', match);
            if (match) token = match[1];
          }
          if (!token) {
            return (
              callback &&
              callback({ success: false, error: "No token provided." })
            );
          }
          // Logger.infoObj('Logout token: ', token);
          await dbService.deleteUserSession(token);
          socket.data.userId = undefined;
          socket.data.user = undefined;
          callback && callback({ success: true });
          socket.disconnect(true);
        } catch (err) {
          callback && callback({ success: false, error: "Logout failed." });
        }
      });

      // Lister les sessions actives de l'utilisateur connecté
      socket.on("getSessions", async (data, callback) => {
        try {
          const userId = socket.data.userId;
          if (!userId) {
            return (
              callback &&
              callback({ success: false, error: "Not authenticated." })
            );
          }
          const sessions = await dbService.getUserSessionsByUserId(userId);
          callback &&
            callback({
              success: true,
              sessions: sessions.map((s) => s.toJSON()),
            });
        } catch (err) {
          callback &&
            callback({ success: false, error: "Failed to fetch sessions." });
        }
      });

      // Révoquer une session/token précis
      socket.on("revokeSession", async ({ token }, callback) => {
        try {
          const userId = socket.data.userId;
          if (!userId || !token) {
            return (
              callback &&
              callback({
                success: false,
                error: "Not authenticated or missing token.",
              })
            );
          }
          // Vérifier que la session appartient bien à l'utilisateur
          const session = await dbService.getUserSessionByToken(token);
          if (!session || session.userId !== userId) {
            return (
              callback &&
              callback({
                success: false,
                error: "Session not found or not owned.",
              })
            );
          }
          await dbService.deleteUserSession(token);
          callback && callback({ success: true });
        } catch (err) {
          callback &&
            callback({ success: false, error: "Failed to revoke session." });
        }
      });

      // Déconnexion de toutes les sessions de l'utilisateur
      socket.on("logoutAll", async (data, callback) => {
        try {
          const userId = socket.data.userId;
          if (!userId) {
            return (
              callback &&
              callback({ success: false, error: "Not authenticated." })
            );
          }
          await dbService.deleteAllUserSessionsByUserId(userId);
          callback && callback({ success: true });

          // Déconnecte tous les sockets de cet utilisateur et envoie un événement
          const sockets = await this.io.fetchSockets();
          Logger.info(`Déconnexion de tous les sockets de l'utilisateur ${userId}`);
          Logger.info(`Nombre de sockets: ${sockets.length}`);
          Logger.infoObj("sockets", sockets);
          for (const s of sockets) {
            if (s.data.userId === userId) {
              s.emit("forceLogout", { reason: "logoutAll" });
              s.disconnect(true);
            }
          }
        } catch (err) {
          callback && callback({ success: false, error: "Logout all failed." });
        }
      });
    });
  }
}
