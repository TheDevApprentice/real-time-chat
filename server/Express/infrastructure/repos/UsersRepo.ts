import { CallbackDB } from "../adapters/callbackDb";
import { User } from "../../domain/entities/User";
import { IUserRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IUserRepo";
import { IDialect } from "../sql/dialect";
import { buildSelect, buildLikePredicate, prepareLikeParam, buildInsert } from "../sql/queryBuilder";

export class UsersRepo implements IUserRepo {
  constructor(private db: CallbackDB, private dialect: IDialect) {}

  addUser(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      const sql = buildInsert(this.dialect, "users", ["id", "name", "password"]);
      this.db.run(sql, [user.id, user.name, user.password], (err) => {
        if (err) return reject(err);
        resolve(user);
      });
    });
  }

  getUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "users", ["id", "name", "password"]);
      this.db.all(sql, undefined, (err, rows?: any[]) => {
        if (err) return reject(err);
        const users = (
          (rows as Array<{ id: string; name: string; password: string }>) ||
          []
        ).map(User.fromDbRow);
        resolve(users.filter((u) => u !== undefined));
      });
    });
  }

  getUserById(id: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "users", ["id", "name", "password"], { where: "id = ?" });
      this.db.get(
        sql,
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
      const where = buildLikePredicate(this.dialect, "name", true);
      const sql = buildSelect(this.dialect, "users", ["id", "name", "password"], {
        where,
        orderBy: "name",
        limit,
      });
      const like = prepareLikeParam(this.dialect, query.replace(/\s+/g, " "), "contains", true);
      this.db.all(
        sql,
        [like],
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
