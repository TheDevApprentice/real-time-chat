import sqlite3 from "sqlite3";
import { Logger } from "./Logger";
import { User } from "../models/User";
import { Message } from "../models/Message";

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
        name TEXT NOT NULL
      )`);
      this.db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        authorId TEXT,
        authorName TEXT,
        content TEXT,
        timestamp INTEGER
      )`);
      Logger.info("Database tables initialized");
    });
  }

  addUser(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, name) VALUES (?, ?)`,
        [user.id, user.name],
        (err) => {
          if (err) {
            Logger.error("Erreur ajout user: " + err.message);
            return reject(err);
          }
          Logger.infoObj("Ajout user: ", user);
          resolve(user);
        }
      );
    });
  }
  
  getUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name FROM users`, (err, rows) => {
        if (err) return reject(err);
        // Map each row to a User instance (OOP strict)
        const users: (User | undefined)[] = (rows as Array<{ id: string; name: string }>).map(
          User.fromDbRow
        );
        resolve(users.filter((user) => user !== undefined));
      });
    });
  }

  getUserById(id: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, name FROM users WHERE id = ?`,
        [id],
        (err, row: User | undefined) => {
          if (err) return reject(err);
          if (!row) return resolve(undefined);
          resolve(User.fromDbRow(row));
        }
      );
    });
  }

  addMessage(message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO messages (authorId, authorName, content, timestamp) VALUES (?, ?, ?, ?)`,
        [
          message.author.id,
          message.author.name,
          message.content,
          message.timestamp,
        ],
        (err) => {
          if (err) {
            Logger.error("Erreur ajout message: " + err.message);
            return reject(err);
          }
          Logger.info(`Ajout message: ${message.author.name} / ${message.content}`);
          resolve();
        }
      );
    });
  }

  getMessages(): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT authorId, authorName, content, timestamp FROM messages`,
        (err, rows) => {
          if (err) return reject(err);
          // Map each row to a Message (OOP strict)
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
}
