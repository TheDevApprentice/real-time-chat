export type FriendStatus = "pending" | "accepted";

export class Friend {
  private _id: string;
  private _userA: string;
  private _userB: string;
  private _status: FriendStatus;
  private _requesterId: string;
  private _createdAt: number;
  private _updatedAt: number;

  constructor(
    id: string,
    userA: string,
    userB: string,
    status: FriendStatus,
    requesterId: string,
    createdAt: number,
    updatedAt: number
  ) {
    this._id = id;
    this._userA = userA;
    this._userB = userB;
    this._status = status;
    this._requesterId = requesterId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): string {
    return this._id;
  }
  set id(value: string) {
    this._id = value;
  }

  get userA(): string {
    return this._userA;
  }
  set userA(value: string) {
    this._userA = value;
  }

  get userB(): string {
    return this._userB;
  }
  set userB(value: string) {
    this._userB = value;
  }

  get status(): FriendStatus {
    return this._status;
  }
  set status(value: FriendStatus) {
    this._status = value;
  }

  get requesterId(): string {
    return this._requesterId;
  }
  set requesterId(value: string) {
    this._requesterId = value;
  }

  get createdAt(): number {
    return this._createdAt;
  }
  set createdAt(value: number) {
    this._createdAt = value;
  }

  get updatedAt(): number {
    return this._updatedAt;
  }
  set updatedAt(value: number) {
    this._updatedAt = value;
  }

  toJSON() {
    return {
      id: this._id,
      userA: this._userA,
      userB: this._userB,
      status: this._status,
      requesterId: this._requesterId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromDbRow(row: {
    id: string;
    userA: string;
    userB: string;
    status: FriendStatus;
    requesterId: string;
    createdAt: number;
    updatedAt: number;
  }): Friend {
    return new Friend(
      row.id,
      row.userA,
      row.userB,
      row.status,
      row.requesterId,
      row.createdAt,
      row.updatedAt
    );
  }

  otherUserId(forUserId: string): string {
    return this._userA === forUserId ? this._userB : this._userA;
  }
}
