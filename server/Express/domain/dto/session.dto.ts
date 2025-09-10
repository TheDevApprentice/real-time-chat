import type { UserDTO } from "./user.dto";

export interface SessionDTO {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
  refreshToken?: string;
  refreshTokenExpiresAt?: number;
  user?: UserDTO;
}
