import { CallbackDB } from "../adapters/callbackDb";
import { User } from "../../domain/entities/User";
import { Room } from "../../domain/entities/Room";
import { IRoomRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IRoomRepo";

export class RoomsRepo implements IRoomRepo {
  constructor(private db: CallbackDB) {}

  addRoom(room: Room): Promise<Room> {
    return new Promise((resolve, reject) => {
      const driver = String(process.env.DATABASE_DRIVER || '').toLowerCase();
      let isPublicVal: any;
      switch (driver) {
        case 'postgres':
          isPublicVal = !!room.isPublic;
          break;
        case 'mysql':
        case 'sqlite':
        default:
          isPublicVal = room.isPublic ? 1 : 0;
          break;
      }
      this.db.run(
        `INSERT INTO rooms (id, name, creatorId, createdAt, type, isPublic) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          room.id,
          room.name,
          room.creatorId,
          room.createdAt,
          room.type,
          isPublicVal,
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
    const driver = String(process.env.DATABASE_DRIVER || '').toLowerCase();
    let sql: string;
    switch (driver) {
      case 'mysql':
        sql = `INSERT IGNORE INTO user_rooms (userId, roomId) VALUES (?, ?)`;
        break;
      case 'postgres':
        sql = `INSERT INTO user_rooms (userId, roomId) VALUES (?, ?) ON CONFLICT (userId, roomId) DO NOTHING`;
        break;
      case 'sqlite':
      default:
        sql = `INSERT OR IGNORE INTO user_rooms (userId, roomId) VALUES (?, ?)`;
        break;
    }
    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, roomId], (err) => {
        if (err) return reject(err);
        resolve();
      });
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
      const driver = String(process.env.DATABASE_DRIVER || '').toLowerCase();
      let sql: string;
      switch (driver) {
        case 'postgres':
          sql = `SELECT r.id, r.name, r.creatorId, r.createdAt, r.type, r.isPublic
                 FROM rooms r
                 WHERE r.isPublic = TRUE OR r.id IN (SELECT roomId FROM user_rooms WHERE userId = ?)
                 ORDER BY r.createdAt DESC`;
          break;
        case 'mysql':
        case 'sqlite':
        default:
          sql = `SELECT r.id, r.name, r.creatorId, r.createdAt, r.type, r.isPublic
                 FROM rooms r
                 WHERE r.isPublic = 1 OR r.id IN (SELECT roomId FROM user_rooms WHERE userId = ?)
                 ORDER BY r.createdAt DESC`;
          break;
      }
      this.db.all(
        sql,
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
