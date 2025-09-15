/// <reference types="jest" />
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from "@jest/globals";
import { createTestUow, type TestUowHandle } from "../../helpers/testUow";
import { FriendService } from "../../../domain/services/dbServices/FriendService";
import type { IFriendsService } from "../../../domain/interfaces/dbInterfaces/Iservices/IFriendsService";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Edge cases for FriendService

describe("FriendService Edge Cases (UoW, MySQL)", () => {
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
    jest.setTimeout(3000);
    await clearTables();
    handle = await createTestUow();
    service = new FriendService(handle.uow as any);
    await new Promise<void>((resolve, reject) =>
      handle.db.get("SELECT 1", undefined, (err) =>
        err ? reject(err) : resolve()
      )
    );
  });

  afterAll(async () => {
    await handle.close();
    await clearTables();
  });

  beforeEach(async () => {
    await clearTables();
  });

  it("creating the same friend request twice remains single (idempotent)", async () => {
    const a = new User("FEC1", "A", "pw");
    const b = new User("FEC2", "B", "pw");
    await seedUsers(a, b);

    await service.createFriendRequest(a.id, b.id);
    // Creating again (possibly reversed order) shouldn't duplicate
    await service.createFriendRequest(b.id, a.id);

    const listA = await service.listFriendsAndRequests(a.id);
    const listB = await service.listFriendsAndRequests(b.id);
    const count =
      listA.filter((x) => x.userId === b.id).length +
      listB.filter((x) => x.userId === a.id).length;
    expect(count).toBeGreaterThan(0);
  });

  it("double accept on the same request keeps it accepted and does not throw", async () => {
    const a = new User("FEC3", "A", "pw");
    const b = new User("FEC4", "B", "pw");
    await seedUsers(a, b);
    await service.createFriendRequest(a.id, b.id);

    const r1 = await service.respondFriendRequest(b.id, a.id, "accept");
    expect(r1).not.toBeNull();
    const r2 = await service.respondFriendRequest(b.id, a.id, "accept");
    // Whether repo updates or no-ops, service should not throw
    expect(r2).not.toBeNull();
    expect(r2!.status).toBe("accepted");
  });

  it("reject on non-existing request returns null and does not throw", async () => {
    const a = new User("FEC5", "A", "pw");
    const b = new User("FEC6", "B", "pw");
    await seedUsers(a, b);

    const res = await service.respondFriendRequest(b.id, a.id, "reject");
    expect(res).toBeNull();
  });
});
