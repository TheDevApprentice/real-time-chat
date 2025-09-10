import { CallbackDB } from "../adapters/callbackDb";

// Initialize database schema and best-effort migrations (idempotent)
export function initializeSchema(db: CallbackDB): void {
  db.serialize(() => {
    // Users
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL
      )`,
      undefined,
      () => {}
    );

    // Rooms
    db.run(
      `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creatorId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        type TEXT DEFAULT 'room',
        isPublic INTEGER DEFAULT 1
      )`,
      undefined,
      () => {}
    );

    // User-Rooms pivot
    db.run(
      `CREATE TABLE IF NOT EXISTS user_rooms (
        userId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        PRIMARY KEY (userId, roomId),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )`,
      undefined,
      () => {}
    );

    // Messages
    db.run(
      `CREATE TABLE IF NOT EXISTS messages (
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
      undefined,
      () => {}
    );

    // Sessions
    db.run(
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER,
        refreshToken TEXT,
        refreshTokenExpiresAt INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )`,
      undefined,
      () => {}
    );

    // Best-effort ALTERs (SQLite may error if column already exists; ignore callback errors)
    db.run(`ALTER TABLE user_sessions ADD COLUMN refreshToken TEXT`, undefined, () => {});
    db.run(
      `ALTER TABLE user_sessions ADD COLUMN refreshTokenExpiresAt INTEGER`,
      undefined,
      () => {}
    );

    // Indexes
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refreshToken)`,
      undefined,
      () => {}
    );

    // Older SQLite may not support IF NOT EXISTS in ADD COLUMN; try and ignore errors
    db.run(`ALTER TABLE rooms ADD COLUMN type TEXT DEFAULT 'room'`, undefined, () => {});
    db.run(`ALTER TABLE rooms ADD COLUMN isPublic INTEGER DEFAULT 1`, undefined, () => {});

    // Friends table
    db.run(
      `CREATE TABLE IF NOT EXISTS friends (
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
      undefined,
      () => {}
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_friends_userA ON friends(userA)`,
      undefined,
      () => {}
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_friends_userB ON friends(userB)`,
      undefined,
      () => {}
    );
  });
}
