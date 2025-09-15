/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { createTestUow, type TestUowHandle } from "../../helpers/testUow";
import { UserService } from "../../../domain/services/dbServices/UserService";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Jest tests for UserService on MariaDB via UoW

describe("UserService (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: UserService;

  const clearTables = async () => {
    await clearMysqlTestDb();
  };

  const seedUser = async (user: User) => {
    await new Promise<void>((resolve, reject) =>
      handle.db.run(
        "INSERT INTO users (id, name, password) VALUES (?, ?, ?)",
        [user.id, user.name, user.password],
        (err) => (err ? reject(err) : resolve())
      )
    );
  };

  beforeAll(async () => {
    jest.setTimeout(3000);
    await clearTables();
    handle = await createTestUow();
    service = new UserService(handle.uow as any);
    await new Promise<void>((resolve, reject) =>
      handle.db.get("SELECT 1", undefined, (err) => (err ? reject(err) : resolve()))
    );
  });

  afterAll(async () => {
    await handle.close();
    await clearTables();
  });

  beforeEach(async () => {
    await clearTables();
  });

  it("should add a user and fetch it by id", async () => {
    const u = new User("U900", "Alice", "pw");
    const created = await service.addUser(u);
    expect(created.id).toBe("U900");

    const byId = await service.getUserById("U900");
    expect(byId).toBeDefined();
    expect(byId!.name).toBe("Alice");
  });

  it("should return all users", async () => {
    const a = new User("U901", "Bob", "pw");
    const b = new User("U902", "Charlie", "pw");
    await service.addUser(a);
    await service.addUser(b);

    const list = await service.getUsers();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = new Set(list.map((x) => x.id));
    expect(ids.has("U901")).toBe(true);
    expect(ids.has("U902")).toBe(true);
  });

  it("should search users by name (LIKE)", async () => {
    const a = new User("U903", "Zed", "pw");
    const b = new User("U904", "Zelda", "pw");
    const c = new User("U905", "Alpha", "pw");
    await seedUser(a);
    await seedUser(b);
    await seedUser(c);

    const res = await service.searchUsersByName("Z", 10);
    const names = new Set(res.map((x) => x.name));
    expect(names.has("Zed")).toBe(true);
    expect(names.has("Zelda")).toBe(true);
  });
});
