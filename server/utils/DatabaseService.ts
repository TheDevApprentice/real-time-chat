import sqlite3 from "sqlite3";
import { Logger } from "./Logger";
import { User } from "../models/User";
import { Message } from "../models/Message";
import { Room } from "../models/Room";
import { UserSession } from "../models/UserSession";

sqlite3.verbose();

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database;

  private constructor(private filePath: string) {
    this.db = new sqlite3.Database(this.filePath, (err) => {
      if (err) {
        Logger.error(`Failed to open database: ${err.message}`);
        throw err;
      }
      // Logger.info(`Connected to SQLite database at ${this.filePath}`);
    });
  }

  static getInstance(filePath: string): DatabaseService {
    if (!DatabaseService.instance) {
      if (!filePath) {
        throw new Error("Database file path is required");
      }
      DatabaseService.instance = new DatabaseService(filePath);
    }
    return DatabaseService.instance;
  }

  init(): void {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creatorId TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS user_rooms (
        userId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        PRIMARY KEY (userId, roomId),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        authorId TEXT,
        authorName TEXT,
        content TEXT,
        timestamp INTEGER,
        roomId TEXT NOT NULL,
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER,
        refreshToken TEXT,
        refreshTokenExpiresAt INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )`);
      // Migration : ajoute les colonnes si elles n'existent pas
      this.db.run(`ALTER TABLE user_sessions ADD COLUMN refreshToken TEXT`, () => {});
      this.db.run(`ALTER TABLE user_sessions ADD COLUMN refreshTokenExpiresAt INTEGER`, () => {});
      // Index pour accélérer la recherche par refreshToken
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refreshToken)`);
      // Logger.info("Database tables initialized (users, rooms, user_rooms, messages, user_sessions)");
    });
  }

  addUser(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, name, password) VALUES (?, ?, ?)`,
        [user.id, user.name, user.password],
        (err) => {
          if (err) {
            Logger.error("Erreur ajout user: " + err.message);
            return reject(err);
          }
          // Logger.infoObj("Ajout user: ", user);
          resolve(user);
        }
      );
    });
  }
  
  getUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name, password FROM users`, (err, rows) => {
        if (err) return reject(err);
        // Map each row to a User instance (OOP strict)
        const users: (User | undefined)[] = (rows as Array<{ id: string; name: string; password: string }> ).map(
          User.fromDbRow
        );
        resolve(users.filter((user) => user !== undefined));
      });
    });
  }

  getUserById(id: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, name, password FROM users WHERE id = ?`,
        [id],
        (err, row: { id: string; name: string; password: string } | undefined) => {
          if (err) return reject(err);
          if (!row) return resolve(undefined);
          resolve(User.fromDbRow(row));
        }
      );
    });
  }
  // Créer une room
  addRoom(room: import('../models/Room').Room): Promise<import('../models/Room').Room> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO rooms (id, name, creatorId, createdAt) VALUES (?, ?, ?, ?)`,
        [room.id, room.name, room.creatorId, room.createdAt],
        (err) => {
          if (err) {
            Logger.error('Erreur ajout room: ' + err.message);
            return reject(err);
          }
          Logger.infoObj('Ajout room: ', room);
          resolve(room);
        }
      );
    });
  }

  // Lister toutes les rooms
  async getRooms(): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name, creatorId, createdAt FROM rooms`, async (err, rows) => {
        if (err) return reject(err);
        // For each room, fetch users and construct Room with users
        const roomObjs: Room[] = [];
        for (const row of rows as Array<{ id: string; name: string; creatorId: string; createdAt: number }>) {
          const users = await this.getUsersForRoom(row.id);
          roomObjs.push(Room.fromDbRow(row, users));
        }
        resolve(roomObjs);
      });
    });
  }

  // Ajouter un user à une room
  addUserToRoom(userId: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO user_rooms (userId, roomId) VALUES (?, ?)`,
        [userId, roomId],
        (err) => {
          if (err) {
            Logger.error('Erreur ajout user_rooms: ' + err.message);
            return reject(err);
          }
          Logger.info(`Ajout user ${userId} à la room ${roomId}`);
          resolve();
        }
      );
    });
  }

  // Lister les rooms d’un user
  async getRoomsForUser(userId: string): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.id, r.name, r.creatorId, r.createdAt FROM rooms r
         INNER JOIN user_rooms ur ON ur.roomId = r.id WHERE ur.userId = ?`,
        [userId],
        async (err, rows) => {
          if (err) return reject(err);
          const roomObjs: Room[] = [];
          for (const row of rows as Array<{ id: string; name: string; creatorId: string; createdAt: number }>) {
            const users = await this.getUsersForRoom(row.id);
            roomObjs.push(Room.fromDbRow(row, users));
          }
          resolve(roomObjs);
        }
      );
    });
  }

  // Lister les users d’une room
  getUsersForRoom(roomId: string): Promise<import('../models/User').User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT u.id, u.name FROM users u
         INNER JOIN user_rooms ur ON ur.userId = u.id WHERE ur.roomId = ?`,
        [roomId],
        (err, rows) => {
          if (err) return reject(err);
          const users = (rows as Array<{ id: string; name: string }> ).map(
            User.fromDbRow
          );
          resolve(users.filter(u => u !== undefined));
        }
      );
    });
  }

  // Ajouter un message dans une room
  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO messages (authorId, authorName, content, timestamp, roomId) VALUES (?, ?, ?, ?, ?)`,
        [
          message.author.id,
          message.author.name,
          message.content,
          message.timestamp,
          roomId,
        ],
        (err) => {
          if (err) {
            Logger.error('Erreur ajout message: ' + err.message);
            return reject(err);
          }
          Logger.info(`Ajout message: ${message.author.name} / ${message.content} / room: ${roomId}`);
          resolve();
        }
      );
    });
  }

  // Récupérer les messages d’une room
  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT authorId, authorName, content, timestamp FROM messages WHERE roomId = ?`,
        [roomId],
        (err, rows) => {
          if (err) return reject(err);
          const messages: (Message | undefined)[] = (
            rows as Array<{
              authorId: string;
              authorName: string;
              content: string;
              timestamp: number;
            }>
          ).map(Message.fromDbRow);
          resolve(messages.filter((message) => message !== undefined));
        }
      );
    });
  }

  // [Optionnel] Récupérer toutes les rooms avec leurs users
  getRoomsAndUsers(): Promise<{ room: import('../models/Room').Room, users: import('../models/User').User[] }[]> {
    return this.getRooms().then(async (rooms) => {
      const result = [];
      for (const room of rooms) {
        const users = await this.getUsersForRoom(room.id);
        result.push({ room, users });
      }
      return result;
    });
  }
  // --- SESSION MANAGEMENT ---
  addUserSession(session: UserSession): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO user_sessions (id, userId, token, createdAt, expiresAt, refreshToken, refreshTokenExpiresAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.userId,
          session.token,
          session.createdAt,
          session.expiresAt ?? null,
          session.refreshToken ?? null,
          session.refreshTokenExpiresAt ?? null
        ],
        (err) => {
          if (err) {
            Logger.error('Erreur ajout session: ' + err.message);
            return reject(err);
          }
          // Logger.infoObj('Ajout session: ', session);
          resolve();
        }
      );
    });
  }



  // Supprimer toutes les sessions d'un utilisateur
async deleteAllUserSessionsByUserId(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(
      `DELETE FROM user_sessions WHERE userId = ?`,
      [userId],
      (err) => {
        if (err) {
          Logger.error('Erreur suppression toutes sessions: ' + err.message);
          return reject(err);
        }
        Logger.info(`Suppression de toutes les sessions pour userId: ${userId}`);
        resolve();
      }
    );
  });
}

// Lister toutes les sessions d'un utilisateur
async getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
  return new Promise((resolve, reject) => {
    this.db.all(
      `SELECT * FROM user_sessions WHERE userId = ?`,
      [userId],
      async (err, rows: Array<{ id: string, userId: string, token: string, createdAt: number, expiresAt?: number, refreshToken?: string, refreshTokenExpiresAt?: number }>) => {
        if (err) return reject(err);
        const sessions = await Promise.all(
          rows.map(async row => {
            const user = await this.getUserById(row.userId);
            return new UserSession(
              row.id,
              row.userId,
              row.token,
              row.createdAt,
              row.expiresAt,
              row.refreshToken,
              row.refreshTokenExpiresAt,
              user
            );
          })
        );
        resolve(sessions);
      }
    );
  });
}
  // Récupérer une session utilisateur par token
  async getUserSessionByToken(token: string): Promise<UserSession | null> {
  return new Promise((resolve, reject) => {
    this.db.get(
      `SELECT * FROM user_sessions WHERE token = ?`,
      [token],
      async (err, row: { id: string, userId: string, token: string, createdAt: number, expiresAt?: number, refreshToken?: string, refreshTokenExpiresAt?: number } | undefined) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        // Vérifier expiration
        if (row.expiresAt && row.expiresAt < Date.now()) {
          // Logger.info(`Session expirée pour token: ${token}`);
          // Supprimer la session expirée
          this.deleteUserSession(token);
          return resolve(null);
        }
        // Charger l'utilisateur lié
        const user = await this.getUserById(row.userId);
        if (!user) return resolve(null);
        const session = new UserSession(
        row.id,
        row.userId,
        row.token,
        row.createdAt,
        row.expiresAt,
        row.refreshToken,
        row.refreshTokenExpiresAt,
        user
      );
        resolve(session);
      }
    );
  });
}

  deleteUserSession(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM user_sessions WHERE token = ?`,
        [token],
        (err) => {
          if (err) {
            Logger.error('Erreur suppression session: ' + err.message);
            return reject(err);
          }
          // Logger.info(`Suppression session pour token: ${token}`);
          resolve();
        }
      );
    });
  }

  // Lookup direct par refreshToken
  async getUserSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM user_sessions WHERE refreshToken = ?`,
        [refreshToken],
        async (
          err,
          row: { id: string; userId: string; token: string; createdAt: number; expiresAt?: number; refreshToken?: string; refreshTokenExpiresAt?: number } | undefined
        ) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          // Vérifier expiration de la session (optionnel) et de refreshToken sera gérée par appelant
          const user = await this.getUserById(row.userId);
          if (!user) return resolve(null);
          const session = new UserSession(
            row.id,
            row.userId,
            row.token,
            row.createdAt,
            row.expiresAt,
            row.refreshToken,
            row.refreshTokenExpiresAt,
            user
          );
          resolve(session);
        }
      );
    });
  }
}
