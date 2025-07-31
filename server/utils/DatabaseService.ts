import sqlite3 from 'sqlite3';
import { Logger } from './Logger';

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
      Logger.info(`Connected to SQLite database at ${this.filePath}`);
    });
  }

  static getInstance(filePath: string = './data/chat.sqlite'): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(filePath);
    }
    return DatabaseService.instance;
  }

  init(): void {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        authorId TEXT,
        authorName TEXT,
        content TEXT,
        timestamp INTEGER
      )`);
      Logger.info('Database tables initialized');
    });
  }

  addUser(id: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)`,
        [id, name],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  getUsers(): Promise<Array<{ id: string; name: string }>> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name FROM users`, (err, rows) => {
        err ? reject(err) : resolve(rows as Array<{ id: string; name: string }>);
      });
    });
  }

  addMessage(
    authorId: string,
    authorName: string,
    content: string,
    timestamp: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO messages (authorId, authorName, content, timestamp) VALUES (?, ?, ?, ?)`,
        [authorId, authorName, content, timestamp],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  getMessages(): Promise<
    Array<{ authorId: string; authorName: string; content: string; timestamp: number }>
  > {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT authorId, authorName, content, timestamp FROM messages`,
        (err, rows) => {
          err ? reject(err) : resolve(rows as Array<{ authorId: string; authorName: string; content: string; timestamp: number }>);
        }
      );
    });
  }
}
