export type FriendStatus = 'pending' | 'accepted';

export class Friend {
  constructor(
    public id: string,
    public userA: string,
    public userB: string,
    public status: FriendStatus,
    public requesterId: string,
    public createdAt: number,
    public updatedAt: number
  ) {}

  toJSON() {
    return {
      id: this.id,
      userA: this.userA,
      userB: this.userB,
      status: this.status,
      requesterId: this.requesterId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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
    return this.userA === forUserId ? this.userB : this.userA;
  }
}
