import { CallbackDB } from "../adapters/callbackDb";
import { User } from "../../../domain/entities/User";
import { IUserRepo } from "../../../domain/interfaces/dbInterfaces/Irepos/IUserRepo";

export class UsersRepo implements IUserRepo {
  constructor(private db: CallbackDB) {}

  addUser(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, name, password) VALUES (?, ?, ?)`,
        [user.id, user.name, user.password],
        (err) => {
          if (err) return reject(err);
          resolve(user);
        }
      );
    });
  }

  getUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, name, password FROM users`,
        undefined,
        (err, rows?: any[]) => {
          if (err) return reject(err);
          const users = (
            (rows as Array<{ id: string; name: string; password: string }>) ||
            []
          ).map(User.fromDbRow);
          resolve(users.filter((u) => u !== undefined));
        }
      );
    });
  }

  getUserById(id: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, name, password FROM users WHERE id = ?`,
        [id],
        (
          err,
          row: { id: string; name: string; password: string } | undefined
        ) => {
          if (err) return reject(err);
          if (!row) return resolve(undefined);
          resolve(User.fromDbRow(row));
        }
      );
    });
  }

  searchUsersByName(query: string, limit = 20): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const like = `%${query.replace(/%/g, "").replace(/_/g, "")}%`;
      this.db.all(
        `SELECT id, name, password FROM users WHERE name LIKE ? ORDER BY name LIMIT ?`,
        [like, limit],
        (err, rows) => {
          if (err) return reject(err);
          const users = (
            rows as Array<{ id: string; name: string; password: string }>
          ).map(User.fromDbRow);
          resolve(users.filter((u) => u !== undefined));
        }
      );
    });
  }
}
