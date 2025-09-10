import type { UserDTO } from "./user.dto";

export interface LoginRequestDTO {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  user: UserDTO;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: UserDTO;
}

export interface LogoutRequestDTO {
  token: string;
}

export interface RevokeSessionRequestDTO {
  token: string;
}
