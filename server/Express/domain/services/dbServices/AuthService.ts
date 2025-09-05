import { UserSession } from "../../entities/UserSession";
import { IAuthService } from "../../interfaces/dbInterfaces/Iservices/IAuthService";
import { ISessionRepo } from "../../interfaces/dbInterfaces/Irepos/ISessionRepo";

// TODO: replace 'any' with ISessionRepo and IUserRepo interfaces from domain/interfaces/dbInterfaces/Irepos
export class AuthService implements IAuthService {
  private readonly sessionsRepo: ISessionRepo;

  constructor(private readonly _iSessionsRepo: ISessionRepo) {
    this.sessionsRepo = _iSessionsRepo;
  }

  addUserSession(session: UserSession): Promise<void> {
    return this.sessionsRepo.addUserSession(session);
  }

  deleteAllUserSessionsByUserId(userId: string): Promise<void> {
    return this.sessionsRepo.deleteAllUserSessionsByUserId(userId);
  }

  getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return this.sessionsRepo.getUserSessionsByUserId(userId);
  }

  getUserSessionByToken(token: string): Promise<UserSession | null> {
    return this.sessionsRepo.getUserSessionByToken(token);
  }

  deleteUserSession(token: string): Promise<void> {
    return this.sessionsRepo.deleteUserSession(token);
  }

  getUserSessionByRefreshToken(
    refreshToken: string
  ): Promise<UserSession | null> {
    return this.sessionsRepo.getUserSessionByRefreshToken(refreshToken);
  }
}
