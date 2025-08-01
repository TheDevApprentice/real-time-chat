import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { Message } from "../models/Message";
import { UserSession } from "../models/UserSession";
import { User } from "../models/User";
import { DatabaseService } from "./DatabaseService";
import { Logger } from "./Logger";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// Protection brute-force login (en mémoire)
const loginAttemptsByIP = new Map<string, { count: number, lastAttempt: number, blockedUntil?: number }>();
const loginAttemptsByUsername = new Map<string, { count: number, lastAttempt: number, blockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

function isBlocked(attempt: { count: number, lastAttempt: number, blockedUntil?: number }) {
  return attempt.blockedUntil && attempt.blockedUntil > Date.now();
}

export class WebSocketService {
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: "*" },
    });
    this.handleConnections();
  }

  private handleConnections(): void {
    require("@dotenvx/dotenvx").config();
    const sqliteFile = process.env.SQLITE_FILE;
    if (!sqliteFile) {
      throw new Error("SQLITE_FILE environment variable is not defined");
    }
    const dbService = DatabaseService.getInstance(sqliteFile);

    this.io.on("connection", async (socket: Socket) => {
      // --- SESSION RESTORE VIA TOKEN ---
      const token = socket.handshake.auth?.token;
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
      Logger.info(`Client connected: ${socket.id}`);

      // AUTH: Authenticate via token (auto-login)
      socket.on("authenticate", async (data, callback) => {
        try {
          const { token } = data;
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

      // AUTH: Register
      socket.on("register", async (data, callback) => {
        const { username, password, confirmPassword } = data;
        Logger.info(`Register attempt: ${username}`);
        Logger.info(`Register attempt: ${password}`);
        Logger.info(`Register attempt: ${confirmPassword}`);
        if (!username || !password || !confirmPassword) {
          return callback && callback({ error: "All fields are required." });
        }
        if (password !== confirmPassword) {
          return callback && callback({ error: "Passwords do not match." });
        }
        try {
          const users = await dbService.getUsers();
          if (users.find((u) => u.name === username)) {
            return callback && callback({ error: "Username already exists." });
          }
          const hashed = await bcrypt.hash(password, 10);
          Logger.info(`Hashed password: ${hashed}`);
          const newUser = new User(randomUUID(), username, hashed);
          Logger.infoObj("newUser: ", newUser.toJSON().name);
          await dbService.addUser(newUser);

          // --- SESSION CREATION ---
          // const sessionToken = randomUUID();
          // const session = new UserSession(randomUUID(), newUser.id, sessionToken, Date.now(), undefined, newUser);
          // await dbService.addUserSession(session);

          callback &&
            callback({ id: newUser.id, name: newUser.name, token: "" });
        } catch (err) {
          callback && callback({ error: "Registration failed." });
        }
      });

      // AUTH: Login
      socket.on("login", async (data, callback) => {
        const { username, password } = data;
        if (!username || !password) {
          return (
            callback && callback({ error: "Username and password required." })
          );
        }
        try {
          const users = await dbService.getUsers();
          const user = users.find((u) => u.name === username);
          if (!user) {
            return callback && callback({ error: "Invalid credentials." });
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
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
      dbService
        .getRooms()
        .then((rooms) => {
          socket.emit(
            "rooms",
            rooms.map((r) => r.toJSON())
          );
        })
        .catch((err: Error) => Logger.error(err.toString()));

      // --- REFRESH TOKEN EVENT ---
      socket.on("refreshToken", async (data, callback) => {
        const { refreshToken } = data;
        if (!refreshToken) {
          return callback && callback({ error: "refreshToken is required." });
        }
        try {
          // Recherche la session avec ce refreshToken
          let session = null;
          const users = await dbService.getUsers();
          for (const user of users) {
            const userSessions = await dbService.getUserSessionsByUserId(user.id);
            for (const s of userSessions) {
              if (s.refreshToken === refreshToken) {
                session = s;
                break;
              }
            }
            if (session) break;
          }
          if (!session) {
            return callback && callback({ error: "Invalid refresh token." });
          }
          if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt < Date.now()) {
            await dbService.deleteUserSession(session.token);
            return callback && callback({ error: "Refresh token expired." });
          }
          // Rotation: supprimer l'ancienne session
          await dbService.deleteUserSession(session.token);
          // Créer une nouvelle session
          const newToken = randomUUID();
          const newRefreshToken = randomUUID();
          const newRefreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
          const newSession = new UserSession(
            randomUUID(),
            session.userId,
            newToken,
            Date.now(),
            undefined,
            newRefreshToken,
            newRefreshTokenExpiresAt,
            session.user
          );
          await dbService.addUserSession(newSession);
          callback && callback({
            id: session.userId,
            name: session.user?.name,
            token: newToken,
            refreshToken: newRefreshToken,
            refreshTokenExpiresAt: newRefreshTokenExpiresAt
          });
        } catch (err) {
          callback && callback({ error: "Refresh token failed." });
        }
      });

      // Création d'une room
      socket.on("createRoom", async (data) => {
        try {
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour créer une room.",
            });
            return;
          }
          const { name, creatorId } = data;
          if (!name || !creatorId) return;
          // Vérifier que creatorId correspond à l'utilisateur connecté
          if (creatorId !== socket.data.userId) {
            socket.emit("error", {
              error: "Identifiant utilisateur invalide.",
            });
            return;
          }
          const Room = (await import("../models/Room")).Room;
          const room = new Room(name, creatorId);
          await dbService.addRoom(room);
          // Broadcast la nouvelle room à tous
          const rooms = await dbService.getRooms();
          this.io.emit(
            "rooms",
            rooms.map((r) => r.toJSON())
          );
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
          const rooms = await dbService.getRooms();
          socket.emit(
            "rooms",
            rooms.map((r) => r.toJSON())
          );
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Rejoindre une room (Socket.IO join)
      socket.on("joinRoom", async ({ roomId }) => {
        try {
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour envoyer un message.",
            });
            return;
          }
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
          // Vérifier que l'utilisateur est connecté
          if (!socket.data.userId) {
            socket.emit("error", {
              error: "Vous devez être connecté pour envoyer un message.",
            });
            return;
          }
          const { roomId, content, timestamp } = data;
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
          const msgObj = new Message(user, content, timestamp);
          await dbService.addMessageToRoom(msgObj, roomId);
          // Broadcast à la room uniquement
          this.io
            .to(roomId)
            .emit("message", { roomId, message: msgObj.toJSON() });
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Dans handleConnections()
      socket.on("logout", async (data, callback) => {
        try {
          // Récupérer le token depuis les cookies du header handshake
          const cookieHeader = socket.handshake.headers.cookie;
          let token: string | undefined;
          if (cookieHeader) {
            const match = cookieHeader.match(/token=([^;]+)/);
            if (match) token = match[1];
          }
          if (!token) {
            return callback && callback({ success: false, error: "No token provided." });
          }
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
      return callback && callback({ success: false, error: "Not authenticated." });
    }
    const sessions = await dbService.getUserSessionsByUserId(userId);
    callback && callback({ success: true, sessions: sessions.map(s => s.toJSON()) });
  } catch (err) {
    callback && callback({ success: false, error: "Failed to fetch sessions." });
  }
});

// Révoquer une session/token précis
socket.on("revokeSession", async ({ token }, callback) => {
  try {
    const userId = socket.data.userId;
    if (!userId || !token) {
      return callback && callback({ success: false, error: "Not authenticated or missing token." });
    }
    // Vérifier que la session appartient bien à l'utilisateur
    const session = await dbService.getUserSessionByToken(token);
    if (!session || session.userId !== userId) {
      return callback && callback({ success: false, error: "Session not found or not owned." });
    }
    await dbService.deleteUserSession(token);
    callback && callback({ success: true });
  } catch (err) {
    callback && callback({ success: false, error: "Failed to revoke session." });
  }
});

// Déconnexion de toutes les sessions de l'utilisateur
socket.on("logoutAll", async (data, callback) => {
  try {
    const userId = socket.data.userId;
    if (!userId) {
      return callback && callback({ success: false, error: "Not authenticated." });
    }
    await dbService.deleteAllUserSessionsByUserId(userId);
    callback && callback({ success: true });
    socket.disconnect(true);
  } catch (err) {
    callback && callback({ success: false, error: "Logout all failed." });
  }
});
    });
  }
}
