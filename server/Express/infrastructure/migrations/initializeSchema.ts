import { CallbackDB } from "../adapters/callbackDb";
import { Logger } from "../../utils/LoggerUtil";
import { SupportedDBDrivers } from "../factory";

// Initialize database schema per dialect (idempotent as much as possible)
export function initializeSchema(
  db: CallbackDB,
  driver: SupportedDBDrivers = "sqlite"
): void {
  type Ddl = {
    users: string;
    rooms: string;
    userRooms: string;
    messages: string;
    sessions: string;
    friends: string;
    indexes: string[];
    sqliteAlters?: string[];
  };

  const ddl: Ddl = (() => {
    switch (driver) {
      case "mysql":
        return {
          users: `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL
          )`,
          rooms: `CREATE TABLE IF NOT EXISTS rooms (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            creatorId VARCHAR(255) NOT NULL,
            createdAt BIGINT NOT NULL,
            type VARCHAR(32) DEFAULT 'room',
            isPublic TINYINT(1) DEFAULT 1
          )`,
          userRooms: `CREATE TABLE IF NOT EXISTS user_rooms (
            userId VARCHAR(255) NOT NULL,
            roomId VARCHAR(255) NOT NULL,
            PRIMARY KEY (userId, roomId),
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (roomId) REFERENCES rooms(id)
          )`,
          messages: `CREATE TABLE IF NOT EXISTS messages (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            authorId VARCHAR(255),
            authorName VARCHAR(255),
            content TEXT,
            timestamp BIGINT,
            roomId VARCHAR(255) NOT NULL,
            status VARCHAR(32) DEFAULT 'sent',
            sentAt BIGINT,
            deliveredAt BIGINT,
            readAt BIGINT,
            FOREIGN KEY (roomId) REFERENCES rooms(id)
          )`,
          sessions: `CREATE TABLE IF NOT EXISTS user_sessions (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL,
            createdAt BIGINT NOT NULL,
            expiresAt BIGINT,
            refreshToken VARCHAR(255),
            refreshTokenExpiresAt BIGINT,
            FOREIGN KEY (userId) REFERENCES users(id)
          )`,
          friends: `CREATE TABLE IF NOT EXISTS friends (
            id VARCHAR(255) PRIMARY KEY,
            userA VARCHAR(255) NOT NULL,
            userB VARCHAR(255) NOT NULL,
            status VARCHAR(32) NOT NULL,
            requesterId VARCHAR(255) NOT NULL,
            createdAt BIGINT NOT NULL,
            updatedAt BIGINT NOT NULL,
            UNIQUE(userA, userB),
            FOREIGN KEY (userA) REFERENCES users(id),
            FOREIGN KEY (userB) REFERENCES users(id)
          )`,
          indexes: [
            `CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refreshToken)`,
            `CREATE INDEX IF NOT EXISTS idx_friends_userA ON friends(userA)`,
            `CREATE INDEX IF NOT EXISTS idx_friends_userB ON friends(userB)`,
          ],
          // sqliteAlters: [],
        };
      case "sqlite":
      default:
        return {
          users: `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL
          )`,
          rooms: `CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            creatorId TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            type TEXT DEFAULT 'room',
            isPublic INTEGER DEFAULT 1
          )`,
          userRooms: `CREATE TABLE IF NOT EXISTS user_rooms (
            userId TEXT NOT NULL,
            roomId TEXT NOT NULL,
            PRIMARY KEY (userId, roomId),
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (roomId) REFERENCES rooms(id)
          )`,
          messages: `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            authorId TEXT,
            authorName TEXT,
            content TEXT,
            timestamp INTEGER,
            roomId TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            sentAt INTEGER,
            deliveredAt INTEGER,
            readAt INTEGER,
            FOREIGN KEY (roomId) REFERENCES rooms(id)
          )`,
          sessions: `CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            token TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            expiresAt INTEGER,
            refreshToken TEXT,
            refreshTokenExpiresAt INTEGER,
            FOREIGN KEY (userId) REFERENCES users(id)
          )`,
          friends: `CREATE TABLE IF NOT EXISTS friends (
            id TEXT PRIMARY KEY,
            userA TEXT NOT NULL,
            userB TEXT NOT NULL,
            status TEXT NOT NULL, -- 'pending' | 'accepted'
            requesterId TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            UNIQUE(userA, userB),
            FOREIGN KEY (userA) REFERENCES users(id),
            FOREIGN KEY (userB) REFERENCES users(id)
          )`,
          indexes: [
            `CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refreshToken)`,
            `CREATE INDEX IF NOT EXISTS idx_friends_userA ON friends(userA)`,
            `CREATE INDEX IF NOT EXISTS idx_friends_userB ON friends(userB)`,
          ],
          sqliteAlters: [
            `ALTER TABLE user_sessions ADD COLUMN refreshToken TEXT`,
            `ALTER TABLE user_sessions ADD COLUMN refreshTokenExpiresAt INTEGER`,
            `ALTER TABLE rooms ADD COLUMN type TEXT DEFAULT 'room'`,
            `ALTER TABLE rooms ADD COLUMN isPublic INTEGER DEFAULT 1`,
          ],
        };
    }
  })();

  db.serialize(() => {
    switch (driver) {
      case "sqlite":
        // SQLite path: run statements individually; serialize() enforces ordering
        Logger.info(`[Schema] Running batch DDL for ${driver}...`);
        Logger.info(`[Schema] Running batch tables creation.`);
        db.run(ddl.users, undefined, () => {});
        db.run(ddl.rooms, undefined, () => {});
        db.run(ddl.userRooms, undefined, () => {});
        db.run(ddl.messages, undefined, () => {});
        db.run(ddl.sessions, undefined, () => {});
        db.run(ddl.friends, undefined, () => {});
        Logger.info(`[Schema] Batch tables creation completed.`);
        Logger.info(`[Schema] Running batch indexes creation.`);
        for (const idx of ddl.indexes) {
          db.run(idx, undefined, () => {});
        }
        Logger.info(`[Schema] Batch indexes creation completed.`);
        if (ddl.sqliteAlters) {
          Logger.info(`[Schema] Batch sqlite alters started.`);
          for (const alt of ddl.sqliteAlters) {
            db.run(alt, undefined, () => {});
          }
          Logger.info(`[Schema] Batch sqlite alters completed.`);
        }
        Logger.info(`[Schema] Batch DDL completed for ${driver}.`);
        break;
      case "mysql":
        // SQLite path: run statements individually; serialize() enforces ordering
        Logger.info(`[Schema] Running batch DDL for ${driver}...`);
        Logger.info(`[Schema] Running batch tables creation.`);
        db.run(ddl.users, undefined, () => {});
        db.run(ddl.rooms, undefined, () => {});
        db.run(ddl.userRooms, undefined, () => {});
        db.run(ddl.messages, undefined, () => {});
        db.run(ddl.sessions, undefined, () => {});
        db.run(ddl.friends, undefined, () => {});
        Logger.info(`[Schema] Batch tables creation completed.`);
        Logger.info(`[Schema] Running batch indexes creation.`);
        for (const idx of ddl.indexes) {
          db.run(idx, undefined, () => {});
        }
        Logger.info(`[Schema] Batch indexes creation completed.`);
        Logger.info(`[Schema] Batch DDL completed for ${driver}.`);
        break;
      default:
        // SQLite path: run statements individually; serialize() enforces ordering
        Logger.info(`[Schema] Running batch DDL for ${driver}...`);
        Logger.info(`[Schema] Running batch tables creation.`);
        db.run(ddl.users, undefined, () => {});
        db.run(ddl.rooms, undefined, () => {});
        db.run(ddl.userRooms, undefined, () => {});
        db.run(ddl.messages, undefined, () => {});
        db.run(ddl.sessions, undefined, () => {});
        db.run(ddl.friends, undefined, () => {});
        for (const idx of ddl.indexes) {
          db.run(idx, undefined, () => {});
        }
        Logger.info(`[Schema] Batch tables creation completed.`);
        Logger.info(`[Schema] Running batch sqlite alters.`);
        if (driver === "sqlite") {
          if (ddl.sqliteAlters) {
            for (const alt of ddl.sqliteAlters) {
              db.run(alt, undefined, () => {});
            }
          }
        }
        Logger.info(`[Schema] Batch sqlite alters completed.`);
        Logger.info(`[Schema] Batch DDL completed for ${driver}.`);
        break;
    }
  });
}
