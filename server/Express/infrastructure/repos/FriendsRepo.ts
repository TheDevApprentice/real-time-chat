/**
 * FriendsRepo (Infrastructure)
 * ---------------------------
 * Atomic DB adapter for the Friends domain. Under the Unit of Work pattern,
 * services orchestrate multi-step business logic using unitOfWork.tx/noTx.
 * This repository provides single-statement primitives only:
 * - addFriendRequest(record)
 * - updateFriendRequest(id, patch)
 * - deleteFriendRequest(id)
 * - getFriendRequest(id)
 * - getAllUserFriendRequest(userId)
 *
 * Concurrency & idempotency:
 * - addFriendRequest uses an upsert on the deterministic id `${a}:${b}` to avoid duplicates
 *   when concurrent requests happen.
 */
import { CallbackDB } from "../adapters/callbackDb";
import { IFriendRepo, FriendRecord } from "../../domain/interfaces/dbInterfaces/Irepos/IFriendRepo";
import { IDialect } from "../sql/dialect";
import { buildDelete, buildSelect, buildUpsertOnId, buildUpdate } from "../sql/queryBuilder";
import { runWrite } from "../sql/executor";

export class FriendsRepo implements IFriendRepo {
  constructor(private db: CallbackDB, private dialect: IDialect) {}

  // Atomic add (upsert on id)
  async addFriendRequest(record: FriendRecord): Promise<void> {
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
    const params = [
      record.id,
      record.userA,
      record.userB,
      record.status,
      record.requesterId,
      record.createdAt,
      record.updatedAt,
    ];
    await runWrite(this.db, sql, params);
  }

  async updateFriendRequest(
    id: string,
    patch: Partial<Pick<FriendRecord, "status" | "requesterId" | "updatedAt">>
  ): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];
    if (typeof patch.status !== "undefined") { sets.push("status"); params.push(patch.status); }
    if (typeof patch.requesterId !== "undefined") { sets.push("requesterId"); params.push(patch.requesterId); }
    if (typeof patch.updatedAt !== "undefined") { sets.push("updatedAt"); params.push(patch.updatedAt); }
    if (sets.length === 0) return; // nothing to update
    const sql = buildUpdate(this.dialect, "friends", sets, "id = ?");
    params.push(id);
    await runWrite(this.db, sql, params);
  }

  async deleteFriendRequest(id: string): Promise<void> {
    const sql = buildDelete(this.dialect, "friends", "id = ?");
    await runWrite(this.db, sql, [id]);
  }

  async getFriendRequest(id: string): Promise<FriendRecord | null> {
    const sql = buildSelect(
      this.dialect,
      "friends",
      ["id", "userA", "userB", "status", "requesterId", "createdAt", "updatedAt"],
      { where: "id = ?" }
    );
    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row?: any) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        resolve({
          id: row.id,
          userA: row.userA,
          userB: row.userB,
          status: row.status,
          requesterId: row.requesterId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      });
    });
  }

  async getAllUserFriendRequest(
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
