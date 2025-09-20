import type { SessionDTO } from "../session.dto";
import { UserSession } from "../../entities/UserSession";
import { mapUserToDTO } from "./user.mapper";

export function mapSessionToDTO(s: UserSession): SessionDTO {
  return {
    id: s.id,
    userId: s.userId,
    token: s.token,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    refreshToken: s.refreshToken,
    refreshTokenExpiresAt: s.refreshTokenExpiresAt,
    user: s.user ? mapUserToDTO(s.user) : undefined,
  };
}
