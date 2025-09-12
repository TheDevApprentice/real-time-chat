import { CallbackDB } from "../adapters/callbackDb";
import { UserSession } from "../../domain/entities/UserSession";
import { UsersRepo } from "./UsersRepo";
import { ISessionRepo } from "../../domain/interfaces/dbInterfaces/Irepos/ISessionRepo";
import { IDialect } from "../sql/dialect";
import { buildDelete, buildInsert, buildSelect } from "../sql/queryBuilder";
import { Logger } from "../../utils/LoggerUtil";

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
      Logger.infoObj("deleteAllUserSessionsByUserId sql", sql);
      this.db.run(sql, [userId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_sessions", ["id","userId","token","createdAt","expiresAt","refreshToken","refreshTokenExpiresAt"], { where: "userId = ?" });
      Logger.infoObj("getUserSessionsByUserId sql", sql);
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
              const createdAt = Number((row as any).createdAt);
              const expiresAt = (row as any).expiresAt != null ? Number((row as any).expiresAt) : undefined;
              const refreshTokenExpiresAt = (row as any).refreshTokenExpiresAt != null ? Number((row as any).refreshTokenExpiresAt) : undefined;
              const user = await this.usersRepo.getUserById(row.userId);
              return new UserSession(
                row.id,
                row.userId,
                row.token,
                isNaN(createdAt) ? undefined as any : createdAt,
                isNaN(expiresAt as any) ? undefined : (expiresAt as number | undefined),
                row.refreshToken,
                isNaN(refreshTokenExpiresAt as any) ? undefined : (refreshTokenExpiresAt as number | undefined),
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
    Logger.info("Getting user session by token");
    Logger.infoObj("token", token);
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_sessions", ["id","userId","token","createdAt","expiresAt","refreshToken","refreshTokenExpiresAt"], { where: "token = ?" });
      Logger.infoObj("getUserSessionByToken sql", sql);
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
          Logger.infoObj("getUserSessionByToken err", err);
          if (err) return reject(err);
          Logger.infoObj("getUserSessionByToken row", row);
          if (!row) return resolve(null);
          const createdAt = Number((row as any).createdAt);
          const expiresAt = (row as any).expiresAt != null ? Number((row as any).expiresAt) : undefined;
          const refreshTokenExpiresAt = (row as any).refreshTokenExpiresAt != null ? Number((row as any).refreshTokenExpiresAt) : undefined;
          if (expiresAt && expiresAt < Date.now()) {
            await this.deleteUserSession(token);
            Logger.infoObj("getUserSessionByToken session expired", token);
            return resolve(null);
          }
          Logger.infoObj("getUserSessionByToken expiresAt", expiresAt);
          Logger.infoObj("getUserSessionByToken refreshTokenExpiresAt", refreshTokenExpiresAt);
          Logger.infoObj("getUserSessionByToken user.id", row.userId);
          const user = await this.usersRepo.getUserById(row.userId);
          Logger.infoObj("getUserSessionByToken user", user?.toJSON());
          if (!user) return resolve(null);
          const session = new UserSession(
            row.id,
            row.userId,
            row.token,
            isNaN(createdAt) ? undefined as any : createdAt,
            isNaN(expiresAt as any) ? undefined : (expiresAt as number | undefined),
            row.refreshToken,
            isNaN(refreshTokenExpiresAt as any) ? undefined : (refreshTokenExpiresAt as number | undefined),
            user
          );
          Logger.infoObj("getUserSessionByToken session", session.toJSON());
          resolve(session);
        }
      );
    });
  }

  deleteUserSession(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildDelete(this.dialect, "user_sessions", "token = ?");
      Logger.infoObj("deleteUserSession sql", sql);
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
      Logger.infoObj("getUserSessionByRefreshToken sql", sql);
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
          const createdAt = Number((row as any).createdAt);
          const expiresAt = (row as any).expiresAt != null ? Number((row as any).expiresAt) : undefined;
          const refreshTokenExpiresAt = (row as any).refreshTokenExpiresAt != null ? Number((row as any).refreshTokenExpiresAt) : undefined;
          const user = await this.usersRepo.getUserById(row.userId);
          if (!user) return resolve(null);
          const session = new UserSession(
            row.id,
            row.userId,
            row.token,
            isNaN(createdAt) ? undefined as any : createdAt,
            isNaN(expiresAt as any) ? undefined : (expiresAt as number | undefined),
            row.refreshToken,
            isNaN(refreshTokenExpiresAt as any) ? undefined : (refreshTokenExpiresAt as number | undefined),
            user
          );
          resolve(session);
        }
      );
    });
  }
}
