/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { FriendService } from "../../../domain/services/dbServices/FriendService";
import type { IFriendsService } from "../../../domain/interfaces/dbInterfaces/Iservices/IFriendsService";
import { createTestUow } from "../../helpers/testUow";
import type { TestUowHandle } from "../../helpers/testUow";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Jest test suite for FriendService using MariaDB via createMysqlCallbackDb

describe("FriendService (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: IFriendsService;

  const clearTables = async () => {
    await clearMysqlTestDb();
  };

  const seedUsers = async (...users: User[]) => {
    for (const user of users) {
      await new Promise<void>((resolve, reject) =>
        handle.db.run(
          "INSERT INTO users (id, name, password) VALUES (?, ?, ?)",
          [user.id, user.name, user.password],
          (err) => (err ? reject(err) : resolve())
        )
      );
    }
  };

  beforeAll(async () => {
    // Increase timeout for MySQL container cold start / first connection
    jest.setTimeout(3000);
    await clearTables();

    handle = await createTestUow();
    service = new FriendService(handle.uow);
    // Sanity check the DB connectivity (fail fast with clearer error)
    await new Promise<void>((resolve, reject) =>
      handle.db.get("SELECT 1 AS ok", undefined, (err) => (err ? reject(err) : resolve()))
    );
  });

  afterAll(async () => {
    await handle.close();
    await clearTables();

  });

  beforeEach(async () => {
    await clearTables();
  });

  it("should create a friend request (pending)", async () => {
    const userA = new User("AAAAA", "UserA", "aaaaaa");
    const userB = new User("BBBBB", "UserB", "bbbbbb");
    await seedUsers(userA, userB);
    const req = await service.createFriendRequest(userA.id, userB.id);
    expect(req.status).toBe("pending");
    expect(req.id).toBe("AAAAA:BBBBB");
    expect(req.userA).toBe("AAAAA");
    expect(req.userB).toBe("BBBBB");
  });

  it("should accept a friend request atomically under tx", async () => {
    const userA = new User("AAAAA", "UserA", "aaaaaa");
    const userB = new User("BBBBB", "UserB", "bbbbbb");
    await seedUsers(userA, userB);
    await service.createFriendRequest(userA.id, userB.id);
    const res = await service.respondFriendRequest(userB.id, userA.id, "accept");
    expect(res).not.toBeNull();
    expect(res!.status).toBe("accepted");
  });

  it("should reject a friend request under tx (delete)", async () => {
    const userA = new User("AAAAA", "UserA", "aaaaaa");
    const userB = new User("BBBBB", "UserB", "bbbbbb");
    await seedUsers(userA, userB);
    await service.createFriendRequest(userA.id, userB.id);
    const res = await service.respondFriendRequest(userB.id, userA.id, "reject");
    expect(res).toBeNull();
  });
});
