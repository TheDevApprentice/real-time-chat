import { CallbackDB } from "../adapters/callbackDb";
import { UserSession } from "../../models/UserSession";
import { UsersRepo } from "./UsersRepo";

export class SessionsRepo {
  constructor(private db: CallbackDB, private usersRepo: UsersRepo) {}

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
          session.refreshTokenExpiresAt ?? null,
        ],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  deleteAllUserSessionsByUserId(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM user_sessions WHERE userId = ?`,
        [userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM user_sessions WHERE userId = ?`,
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
      this.db.get(
        `SELECT * FROM user_sessions WHERE token = ?`,
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
      this.db.run(
        `DELETE FROM user_sessions WHERE token = ?`,
        [token],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async getUserSessionByRefreshToken(
    refreshToken: string
  ): Promise<UserSession | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM user_sessions WHERE refreshToken = ?`,
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
