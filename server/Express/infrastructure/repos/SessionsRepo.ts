import { CallbackDB } from "../adapters/callbackDb";
import { UserSession } from "../../domain/entities/UserSession";
import { UsersRepo } from "./UsersRepo";
import { ISessionRepo } from "../../domain/interfaces/dbInterfaces/Irepos/ISessionRepo";
import { IDialect } from "../sql/dialect";
import { buildDelete, buildInsert, buildSelect } from "../sql/queryBuilder";

export class SessionsRepo implements ISessionRepo {
  constructor(private db: CallbackDB, private usersRepo: UsersRepo, private dialect: IDialect) {}

  addUserSession(session: UserSession): Promise<void> {
    return new Promise((resolve, reject) => {
      const columns = [
        "id",
        "userId",
        "token",
        "createdAt",
        "expiresAt",
        "refreshToken",
        "refreshTokenExpiresAt",
      ];
      const sql = buildInsert(this.dialect, "user_sessions", columns);
      const params = [
        session.id,
        session.userId,
        session.token,
        session.createdAt,
        session.expiresAt ?? null,
        session.refreshToken ?? null,
        session.refreshTokenExpiresAt ?? null,
      ];
      this.db.run(sql, params, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  deleteAllUserSessionsByUserId(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildDelete(this.dialect, "user_sessions", "userId = ?");
      this.db.run(sql, [userId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_sessions", ["id","userId","token","createdAt","expiresAt","refreshToken","refreshTokenExpiresAt"], { where: "userId = ?" });
      this.db.all(
        sql,
        [userId],
        async (
          err: Error | null,
          rows?: Array<{
            id: string;
            userId: string;
            token: string;
            createdAt: number;
            expiresAt?: number;
            refreshToken?: string;
            refreshTokenExpiresAt?: number;
          }>
        ) => {
          if (err) return reject(err);
          const sessions = await Promise.all(
            (rows || []).map(async (row) => {
              const user = await this.usersRepo.getUserById(row.userId);
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

  async getUserSessionByToken(token: string): Promise<UserSession | null> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_sessions", ["id","userId","token","createdAt","expiresAt","refreshToken","refreshTokenExpiresAt"], { where: "token = ?" });
      this.db.get(
        sql,
        [token],
        async (
          err,
          row:
            | {
                id: string;
                userId: string;
                token: string;
                createdAt: number;
                expiresAt?: number;
                refreshToken?: string;
                refreshTokenExpiresAt?: number;
              }
            | undefined
        ) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          if (row.expiresAt && row.expiresAt < Date.now()) {
            await this.deleteUserSession(token);
            return resolve(null);
          }
          const user = await this.usersRepo.getUserById(row.userId);
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
      const sql = buildDelete(this.dialect, "user_sessions", "token = ?");
      this.db.run(sql, [token], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async getUserSessionByRefreshToken(
    refreshToken: string
  ): Promise<UserSession | null> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_sessions", ["id","userId","token","createdAt","expiresAt","refreshToken","refreshTokenExpiresAt"], { where: "refreshToken = ?" });
      this.db.get(
        sql,
        [refreshToken],
        async (
          err,
          row:
            | {
                id: string;
                userId: string;
                token: string;
                createdAt: number;
                expiresAt?: number;
                refreshToken?: string;
                refreshTokenExpiresAt?: number;
              }
            | undefined
        ) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          const user = await this.usersRepo.getUserById(row.userId);
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
