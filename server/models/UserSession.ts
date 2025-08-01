import { User } from './User';

export class UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
  user?: User;

  constructor(id: string, userId: string, token: string, createdAt: number, expiresAt?: number, user?: User) {
    this.id = id;
    this.userId = userId;
    this.token = token;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.user = user;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      user: this.user ? this.user.toJSON() : undefined,
    };
  }
}
