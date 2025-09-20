/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { FriendsRepo } from "../../../infrastructure/repos/FriendsRepo";
import { createMysqlTestDb, clearMysqlTestDb } from "../../helpers/mysqlTestDb";
import type { CallbackDB } from "../../../infrastructure/adapters/callbackDb";
import { createDialect } from "../../../infrastructure/sql/dialect";

// Integration tests for FriendsRepo against MariaDB

describe("FriendsRepo (Integration, MariaDB)", () => {
  let db: CallbackDB;
  const dialect = createDialect();

  const seedUser = async (id: string, name: string, password: string) => {
    await new Promise<void>((resolve, reject) =>
      db.run("INSERT INTO users (id, name, password) VALUES (?, ?, ?)", [id, name, password], (e) => (e ? reject(e) : resolve()))
    );
  };

  beforeAll(async () => {
    jest.setTimeout(5000);
    await clearMysqlTestDb();
    db = await createMysqlTestDb();
    await new Promise<void>((resolve, reject) =>
      db.get("SELECT 1", undefined, (err) => (err ? reject(err) : resolve()))
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => db.close(() => resolve()));
    await clearMysqlTestDb();
  });

  beforeEach(async () => {
    await clearMysqlTestDb();
  });

  it("upserts friend request and fetches it", async () => {
    const repo = new FriendsRepo(db, dialect);
    await seedUser("FA", "Alice", "pw");
    await seedUser("FB", "Bob", "pw");

    const id = "FA:FB";
    await repo.addFriendRequest({ id, userA: "FA", userB: "FB", status: "pending", requesterId: "FA", createdAt: Date.now(), updatedAt: Date.now() });

    // Upsert with same id but different requester should update
    await repo.addFriendRequest({ id, userA: "FA", userB: "FB", status: "pending", requesterId: "FB", createdAt: Date.now(), updatedAt: Date.now() });

    const row = await repo.getFriendRequest(id);
    expect(row).not.toBeNull();
    expect(row!.id).toBe(id);
  });

  it("lists all friend requests for a user", async () => {
    const repo = new FriendsRepo(db, dialect);
    await seedUser("FX", "X", "pw");
    await seedUser("FY", "Y", "pw");

    await repo.addFriendRequest({ id: "FX:FY", userA: "FX", userB: "FY", status: "pending", requesterId: "FX", createdAt: Date.now(), updatedAt: Date.now() });

    const list = await repo.getAllUserFriendRequest("FX");
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
