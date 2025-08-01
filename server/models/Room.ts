import { randomUUID } from 'crypto';

export class Room {
  private _id: string;
  private _name: string;
  private _creatorId: string;
  private _createdAt: number;

  constructor(name: string, creatorId: string, createdAt: number = Date.now(), id?: string) {
    this._id = id || randomUUID();
    this._name = name;
    this._creatorId = creatorId;
    this._createdAt = createdAt;
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get creatorId(): string { return this._creatorId; }
  get createdAt(): number { return this._createdAt; }

  set name(value: string) { this._name = value; }
  set creatorId(value: string) { this._creatorId = value; }

  toJSON() {
    return {
      id: this._id,
      name: this._name,
      creatorId: this._creatorId,
      createdAt: this._createdAt,
    };
  }

  // Factory for DB rows
  static fromDbRow(row: { id: string; name: string; creatorId: string; createdAt: number }): Room {
    return new Room(row.name, row.creatorId, row.createdAt, row.id);
  }
}
