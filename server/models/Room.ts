import { randomUUID } from 'crypto';
import { User } from './User';

export class Room {
  private _id: string;
  private _name: string;
  private _creatorId: string;
  private _createdAt: number;
  private _users: User[];

  constructor(name: string, creatorId: string, createdAt: number = Date.now(), id?: string, users: User[] = []) {
    this._id = id || randomUUID();
    this._name = name;
    this._creatorId = creatorId;
    this._createdAt = createdAt;
    this._users = users;
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get creatorId(): string { return this._creatorId; }
  get createdAt(): number { return this._createdAt; }

  set name(value: string) { this._name = value; }
  set creatorId(value: string) { this._creatorId = value; }

  get users(): User[] { return this._users; }
  set users(value: User[]) { this._users = value; }

  toJSON() {
    return {
      id: this._id,
      name: this._name,
      creatorId: this._creatorId,
      createdAt: this._createdAt,
      users: this._users.map(u => u.toJSON()),
    };
  }

  // Factory for DB rows
  static fromDbRow(row: { id: string; name: string; creatorId: string; createdAt: number }, users: User[] = []): Room {
    return new Room(row.name, row.creatorId, row.createdAt, row.id, users);
  }
}

