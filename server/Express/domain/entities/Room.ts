import { randomUUID } from "crypto";
import { User } from "./User";

export class Room {
  private _id: string;
  private _name: string;
  private _creatorId: string;
  private _createdAt: number;
  private _users: User[];
  private _type: "room" | "user";
  private _isPublic: boolean;

  constructor(
    name: string,
    creatorId: string,
    createdAt: number = Date.now(),
    id?: string,
    users: User[] = [],
    opts?: { type?: "room" | "user"; isPublic?: boolean }
  ) {
    this._id = id || randomUUID();
    this._name = name;
    this._creatorId = creatorId;
    this._createdAt = createdAt;
    this._users = users;
    this._type = opts?.type ?? "room";
    this._isPublic = opts?.isPublic ?? this._type === "room";
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get creatorId(): string {
    return this._creatorId;
  }
  get createdAt(): number {
    return this._createdAt;
  }
  get type(): "room" | "user" {
    return this._type;
  }
  get isPublic(): boolean {
    return this._isPublic;
  }

  set name(value: string) {
    this._name = value;
  }
  set creatorId(value: string) {
    this._creatorId = value;
  }
  set type(value: "room" | "user") {
    this._type = value;
  }
  set isPublic(value: boolean) {
    this._isPublic = value;
  }

  get users(): User[] {
    return this._users;
  }
  set users(value: User[]) {
    this._users = value;
  }

  toJSON() {
    return {
      id: this._id,
      name: this._name,
      creatorId: this._creatorId,
      createdAt: this._createdAt,
      type: this._type,
      isPublic: this._isPublic,
      users: this._users.map((u) => u.toJSON()),
    };
  }

  // Factory for DB rows
  static fromDbRow(
    row: {
      id: string;
      name: string;
      creatorId: string;
      createdAt: number;
      type?: "room" | "user" | null;
      isPublic?: number;
    },
    users: User[] = []
  ): Room {
    return new Room(row.name, row.creatorId, row.createdAt, row.id, users, {
      type: (row.type as "room" | "user") ?? "room",
      isPublic: row.isPublic !== undefined ? !!row.isPublic : undefined,
    });
  }
}
