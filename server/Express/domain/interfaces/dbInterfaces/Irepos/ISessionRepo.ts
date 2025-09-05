import { UserSession } from "../../../entities/UserSession";

export interface ISessionRepo {
  addUserSession(session: UserSession): Promise<void>;
  deleteAllUserSessionsByUserId(userId: string): Promise<void>;
  getUserSessionsByUserId(userId: string): Promise<UserSession[]>;
  getUserSessionByToken(token: string): Promise<UserSession | null>;
  deleteUserSession(token: string): Promise<void>;
  getUserSessionByRefreshToken(refreshToken: string): Promise<UserSession | null>;
}