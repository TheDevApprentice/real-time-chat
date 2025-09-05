import { CallbackDB } from "../adapters/callbackDb";
import { User } from "../../models/User";
import { Room } from "../../models/Room";

export class RoomsRepo {
  constructor(private db: CallbackDB) {}

  addRoom(room: Room): Promise<Room> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO rooms (id, name, creatorId, createdAt, type, isPublic) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          room.id,
          room.name,
          room.creatorId,
          room.createdAt,
          room.type,
          room.isPublic ? 1 : 0,
        ],
        (err) => {
          if (err) return reject(err);
          resolve(room);
        }
      );
    });
  }

  getRooms(): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, name, creatorId, createdAt, type, isPublic FROM rooms`,
        undefined,
        async (err: Error | null, rows?: any[]) => {
          if (err) return reject(err);
          const roomObjs: Room[] = [];
          for (const row of (rows as Array<{
            id: string;
            name: string;
            creatorId: string;
            createdAt: number;
            type?: "room" | "user" | null;
            isPublic?: number;
          }>) || []) {
            const users = await this.getUsersForRoom(row.id);
            roomObjs.push(Room.fromDbRow(row, users));
          }
          resolve(roomObjs);
        }
      );
    });
  }

  getRoomById(id: string): Promise<Room | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT id, name, creatorId, createdAt, type, isPublic FROM rooms WHERE id = ?`,
        [id],
        async (
          err,
          row:
            | {
                id: string;
                name: string;
                creatorId: string;
                createdAt: number;
                type?: "room" | "user" | null;
                isPublic?: number;
              }
            | undefined
        ) => {
          if (err) return reject(err);
          if (!row) return resolve(undefined);
          const users = await this.getUsersForRoom(row.id);
          resolve(Room.fromDbRow(row, users));
        }
      );
    });
  }

  addUserToRoom(userId: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO user_rooms (userId, roomId) VALUES (?, ?)`,
        [userId, roomId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 1 FROM user_rooms WHERE userId = ? AND roomId = ?`,
        [userId, roomId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  async addUsersToRoomBulk(userIds: string[], roomId: string): Promise<void> {
    const uniq = Array.from(new Set(userIds));
    for (const uid of uniq) {
      await this.addUserToRoom(uid, roomId);
    }
  }

  getRoomsForUser(userId: string): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.id, r.name, r.creatorId, r.createdAt, r.type, r.isPublic FROM rooms r
         INNER JOIN user_rooms ur ON ur.roomId = r.id WHERE ur.userId = ?`,
        [userId],
        async (err: Error | null, rows?: any[]) => {
          if (err) return reject(err);
          const roomObjs: Room[] = [];
          for (const row of (rows as Array<{
            id: string;
            name: string;
            creatorId: string;
            createdAt: number;
            type?: "room" | "user" | null;
            isPublic?: number;
          }>) || []) {
            const users = await this.getUsersForRoom(row.id);
            roomObjs.push(Room.fromDbRow(row, users));
          }
          resolve(roomObjs);
        }
      );
    });
  }

  getVisibleRoomsForUser(userId: string): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.id, r.name, r.creatorId, r.createdAt, r.type, r.isPublic
         FROM rooms r
         WHERE r.isPublic = 1 OR r.id IN (SELECT roomId FROM user_rooms WHERE userId = ?)
         ORDER BY r.createdAt DESC`,
        [userId],
        async (err: Error | null, rows?: any[]) => {
          if (err) return reject(err);
          const roomObjs: Room[] = [];
          for (const row of (rows as Array<{
            id: string;
            name: string;
            creatorId: string;
            createdAt: number;
            type?: "room" | "user" | null;
            isPublic?: number;
          }>) || []) {
            const users = await this.getUsersForRoom(row.id);
            roomObjs.push(Room.fromDbRow(row, users));
          }
          resolve(roomObjs);
        }
      );
    });
  }

  getUsersForRoom(roomId: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT u.id, u.name FROM users u
         INNER JOIN user_rooms ur ON ur.userId = u.id WHERE ur.roomId = ?`,
        [roomId],
        (err: Error | null, rows?: any[]) => {
          if (err) return reject(err);
          const users = (
            (rows as Array<{ id: string; name: string }>) || []
          ).map(User.fromDbRow);
          resolve(users.filter((u) => u !== undefined));
        }
      );
    });
  }

  async getRoomsAndUsers(): Promise<{ room: Room; users: User[] }[]> {
    const rooms = await this.getRooms();
    const result: { room: Room; users: User[] }[] = [];
    for (const room of rooms) {
      const users = await this.getUsersForRoom(room.id);
      result.push({ room, users });
    }
    return result;
  }
}
