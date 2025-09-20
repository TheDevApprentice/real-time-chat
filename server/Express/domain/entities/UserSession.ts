import { User } from "./User";

export class UserSession {
  private _id: string;
  private _userId: string;
  private _token: string;
  private _createdAt: number;
  private _expiresAt?: number;
  private _refreshToken?: string;
  private _refreshTokenExpiresAt?: number;
  private _user?: User;

  constructor(
    id: string,
    userId: string,
    token: string,
    createdAt: number,
    expiresAt?: number,
    refreshToken?: string,
    refreshTokenExpiresAt?: number,
    user?: User
  ) {
    this._id = id;
    this._userId = userId;
    this._token = token;
    this._createdAt = createdAt;
    this._expiresAt = expiresAt;
    this._refreshToken = refreshToken;
    this._refreshTokenExpiresAt = refreshTokenExpiresAt;
    this._user = user;
  }

  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }

  get userId(): string { return this._userId; }
  set userId(value: string) { this._userId = value; }

  get token(): string { return this._token; }
  set token(value: string) { this._token = value; }

  get createdAt(): number { return this._createdAt; }
  set createdAt(value: number) { this._createdAt = value; }

  get expiresAt(): number | undefined { return this._expiresAt; }
  set expiresAt(value: number | undefined) { this._expiresAt = value; }

  get refreshToken(): string | undefined { return this._refreshToken; }
  set refreshToken(value: string | undefined) { this._refreshToken = value; }

  get refreshTokenExpiresAt(): number | undefined { return this._refreshTokenExpiresAt; }
  set refreshTokenExpiresAt(value: number | undefined) { this._refreshTokenExpiresAt = value; }

  get user(): User | undefined { return this._user; }
  set user(value: User | undefined) { this._user = value; }

  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      token: this._token,
      createdAt: this._createdAt,
      expiresAt: this._expiresAt,
      refreshToken: this._refreshToken,
      refreshTokenExpiresAt: this._refreshTokenExpiresAt,
      user: this._user ? this._user.toJSON() : undefined,
    };
  }
}
