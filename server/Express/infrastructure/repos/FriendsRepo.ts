import { CallbackDB } from "../adapters/callbackDb";
import { IFriendRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IFriendRepo";

export class FriendsRepo implements IFriendRepo {
  constructor(private db: CallbackDB) {}

  private orderPair(a: string, b: string): { a: string; b: string } {
    return a < b ? { a, b } : { a: b, b: a };
  }

  async createFriendRequest(
    requesterId: string,
    targetUserId: string
  ): Promise<{
    id: string;
    status: "pending";
    userA: string;
    userB: string;
    requesterId: string;
    createdAt: number;
    updatedAt: number;
  }> {
    const { a, b } = this.orderPair(requesterId, targetUserId);
    const id = `${a}:${b}`;
    const now = Date.now();
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO friends (id, userA, userB, status, requesterId, createdAt, updatedAt) VALUES (?, ?, ?, 'pending', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status, requesterId=excluded.requesterId, updatedAt=excluded.updatedAt`,
        [id, a, b, requesterId, now, now],
        (err) => {
          if (err) return reject(err);
          resolve({
            id,
            status: "pending",
            userA: a,
            userB: b,
            requesterId,
            createdAt: now,
            updatedAt: now,
          });
        }
      );
    });
  }

  async respondFriendRequest(
    userId: string,
    otherUserId: string,
    action: "accept" | "reject"
  ): Promise<{
    id: string;
    status: "accepted" | "pending";
    userA: string;
    userB: string;
    requesterId: string;
    createdAt: number;
    updatedAt: number;
  } | null> {
    const { a, b } = this.orderPair(userId, otherUserId);
    const id = `${a}:${b}`;
    const now = Date.now();
    return new Promise((resolve, reject) => {
      if (action === "reject") {
        this.db.run(`DELETE FROM friends WHERE id = ?`, [id], (err) => {
          if (err) return reject(err);
          resolve(null);
        });
      } else {
        this.db.run(
          `UPDATE friends SET status = 'accepted', updatedAt = ? WHERE id = ?`,
          [now, id],
          (err) => {
            if (err) return reject(err);
            this.db.get(
              `SELECT id, userA, userB, status, requesterId, createdAt, updatedAt FROM friends WHERE id = ?`,
              [id],
              (err2: Error | null, row?: any) => {
                if (err2) return reject(err2);
                resolve(row as any);
              }
            );
          }
        );
      }
    });
  }

  async listFriendsAndRequests(
    userId: string
  ): Promise<
    Array<{
      id: string;
      userId: string;
      name: string;
      status: "pending" | "accepted";
      isRequester: boolean;
    }>
  > {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT f.id, f.userA, f.userB, f.status, f.requesterId,
                CASE WHEN f.userA = ? THEN f.userB ELSE f.userA END AS otherId,
                u.name as otherName
         FROM friends f
         JOIN users u ON u.id = CASE WHEN f.userA = ? THEN f.userB ELSE f.userA END
         WHERE f.userA = ? OR f.userB = ?`,
        [userId, userId, userId, userId],
        (
          err: Error | null,
          rows?: Array<{
            id: string;
            userA: string;
            userB: string;
            status: "pending" | "accepted";
            requesterId: string;
            otherId: string;
            otherName: string;
          }>
        ) => {
          if (err) return reject(err);
          const mapped = (rows || []).map((r) => ({
            id: r.id,
            userId: r.otherId,
            name: r.otherName,
            status: r.status,
            isRequester: r.requesterId === userId,
          }));
          resolve(mapped);
        }
      );
    });
  }
}
