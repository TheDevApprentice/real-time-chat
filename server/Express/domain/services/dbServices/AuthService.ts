/**
 * AuthService (Domain)
 * --------------------
 * Orchestrates auth/session use cases via the Unit of Work provider.
 * - Uses `uow.noTx` for single-step operations (add/delete/get session).
 * - For multi-step flows (e.g., rotate session = deleteAll + add), call sites
 *   should wrap the sequence in `uow.tx` to ensure atomicity.
 */
import { UserSession } from "../../entities/UserSession";
import { IAuthService } from "../../interfaces/dbInterfaces/Iservices/IAuthService";

// Minimal UnitOfWork-like contract (explicit sessionsRepo shape)
type SessionsUowRunner = <T>(fn: (uow: { sessionsRepo: {
  addUserSession: (session: UserSession) => Promise<void>;
  deleteAllUserSessionsByUserId: (userId: string) => Promise<void>;
  getUserSessionsByUserId: (userId: string) => Promise<UserSession[]>;
  getUserSessionByToken: (token: string) => Promise<UserSession | null>;
  deleteUserSession: (token: string) => Promise<void>;
  getUserSessionByRefreshToken: (refreshToken: string) => Promise<UserSession | null>;
} }) => Promise<T>) => Promise<T>;
type SessionsUowProvider = { tx: SessionsUowRunner; noTx: SessionsUowRunner };

export class AuthService implements IAuthService {
  constructor(private readonly uow: SessionsUowProvider) {}

  addUserSession(session: UserSession): Promise<void> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.addUserSession(session));
  }

  deleteAllUserSessionsByUserId(userId: string): Promise<void> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.deleteAllUserSessionsByUserId(userId));
  }

  getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.getUserSessionsByUserId(userId));
  }

  getUserSessionByToken(token: string): Promise<UserSession | null> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.getUserSessionByToken(token));
  }

  deleteUserSession(token: string): Promise<void> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.deleteUserSession(token));
  }

  getUserSessionByRefreshToken(
    refreshToken: string
  ): Promise<UserSession | null> {
    return this.uow.noTx(async ({ sessionsRepo }) => sessionsRepo.getUserSessionByRefreshToken(refreshToken));
  }
}
