import { CallbackDB } from "../adapters/callbackDb";
import { User } from "../../domain/entities/User";
import { Room } from "../../domain/entities/Room";
import { IRoomRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IRoomRepo";
import { IDialect } from "../sql/dialect";
import { buildInsert, buildInsertOrIgnore, visibilityPredicate, buildSelect } from "../sql/queryBuilder";
import { runWrite } from "../sql/executor";

export class RoomsRepo implements IRoomRepo {
  constructor(private db: CallbackDB, private dialect: IDialect) {}

  addRoom(room: Room): Promise<Room> {
    return new Promise(async (resolve, reject) => {
      try {
        const columns = ["id", "name", "creatorId", "createdAt", "type", "isPublic"];
        const sql = buildInsert(this.dialect, "rooms", columns);
        const params = [
          room.id,
          room.name,
          room.creatorId,
          room.createdAt,
          room.type,
          this.dialect.boolParam(room.isPublic),
        ];
        await runWrite(this.db, sql, params);
        resolve(room);
      } catch (e) {
        reject(e as any);
      }
    });
  }

  getRooms(): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "rooms", ["id", "name", "creatorId", "createdAt", "type", "isPublic"]);
      this.db.all(sql, undefined, async (err: Error | null, rows?: any[]) => {
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
      });
    });
  }

  getRoomById(id: string): Promise<Room | undefined> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "rooms", ["id","name","creatorId","createdAt","type","isPublic"], { where: "id = ?" });
      this.db.get(
        sql,
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
    const columns = ["userId", "roomId"];
    const sql = buildInsertOrIgnore(this.dialect, "user_rooms", columns, ["userId", "roomId"]);
    return new Promise(async (resolve, reject) => {
      try {
        await runWrite(this.db, sql, [userId, roomId]);
        resolve();
      } catch (e) {
        reject(e as any);
      }
    });
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(this.dialect, "user_rooms", ["1"], { where: "userId = ? AND roomId = ?" });
      this.db.get(sql, [userId, roomId], (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
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
      const table = `rooms r INNER JOIN user_rooms ur ON ur.roomId = r.id`;
      const columns = ["r.id","r.name","r.creatorId","r.createdAt","r.type","r.isPublic"];
      const sql = buildSelect(this.dialect, table, columns, { where: "ur.userId = ?" });
      this.db.all(sql, [userId], async (err: Error | null, rows?: any[]) => {
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
      });
    });
  }

  getVisibleRoomsForUser(userId: string): Promise<Room[]> {
    return new Promise((resolve, reject) => {
      const visibility = visibilityPredicate(this.dialect, "r.isPublic");
      const table = "rooms r";
      const columns = ["r.id","r.name","r.creatorId","r.createdAt","r.type","r.isPublic"];
      const where = `${visibility} OR r.id IN (SELECT roomId FROM user_rooms WHERE userId = ?)`;
      const sql = buildSelect(this.dialect, table, columns, { where, orderBy: "r.createdAt DESC" });
      this.db.all(sql, [userId], async (err: Error | null, rows?: any[]) => {
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
      });
    });
  }

  getUsersForRoom(roomId: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const table = `users u INNER JOIN user_rooms ur ON ur.userId = u.id`;
      const columns = ["u.id","u.name"];
      const sql = buildSelect(this.dialect, table, columns, { where: "ur.roomId = ?" });
      this.db.all(sql, [roomId], (err: Error | null, rows?: any[]) => {
        if (err) return reject(err);
        const users = (
          (rows as Array<{ id: string; name: string }>) || []
        ).map(User.fromDbRow);
        resolve(users.filter((u) => u !== undefined));
      });
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