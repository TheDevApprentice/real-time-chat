import { CallbackDB } from "../adapters/callbackDb";
import { IFriendRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IFriendRepo";
import { IDialect } from "../sql/dialect";
import { buildDelete, buildSelect, buildUpsertOnId, buildUpdate } from "../sql/queryBuilder";

export class FriendsRepo implements IFriendRepo {
  constructor(private db: CallbackDB, private dialect: IDialect) {}

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
      const columns = [
        "id",
        "userA",
        "userB",
        "status",
        "requesterId",
        "createdAt",
        "updatedAt",
      ];
      const updateColumns = ["status", "requesterId", "updatedAt"];
      const sql = buildUpsertOnId(this.dialect, "friends", columns, updateColumns);
      const params = [id, a, b, "pending", requesterId, now, now];
      this.db.run(sql, params, (err) => {
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
      });
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
        const delSql = buildDelete(this.dialect, "friends", "id = ?");
        this.db.run(delSql, [id], (err) => {
          if (err) return reject(err);
          resolve(null);
        });
      } else {
        const updSql = buildUpdate(this.dialect, "friends", ["status", "updatedAt"], "id = ?");
        this.db.run(updSql, ["accepted", now, id], (err) => {
          if (err) return reject(err);
          const selSql = buildSelect(
            this.dialect,
            "friends",
            ["id", "userA", "userB", "status", "requesterId", "createdAt", "updatedAt"],
            { where: "id = ?" }
          );
          this.db.get(selSql, [id], (err2: Error | null, row?: any) => {
            if (err2) return reject(err2);
            resolve(row as any);
          });
        });
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
      const table = `friends f JOIN users u ON u.id = CASE WHEN f.userA = ? THEN f.userB ELSE f.userA END`;
      const columns = [
        "f.id",
        "f.userA",
        "f.userB",
        "f.status",
        "f.requesterId",
        "CASE WHEN f.userA = ? THEN f.userB ELSE f.userA END AS otherId",
        "u.name as otherName",
      ];
      const sql = buildSelect(this.dialect, table, columns, {
        where: "f.userA = ? OR f.userB = ?",
      });
      this.db.all(
        sql,
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
