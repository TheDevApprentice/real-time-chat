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
import { UserService } from "../../../domain/services/dbServices/UserService";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Edge cases for UserService

describe("UserService Edge Cases (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: UserService;

  const clearTables = async () => {
    await clearMysqlTestDb();
  };

  beforeAll(async () => {
    jest.setTimeout(3000);
    await clearTables();
    handle = await createTestUow();
    service = new UserService(handle.uow as any);
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

  it("searchUsersByName should respect limit and return matching rows only", async () => {
    await service.addUser(new User("UEC1", "Alpha", "pw"));
    await service.addUser(new User("UEC2", "Alfred", "pw"));
    await service.addUser(new User("UEC3", "Beta", "pw"));

    const res = await service.searchUsersByName("Al", 1);
    expect(res.length).toBeLessThanOrEqual(1);
    expect(res.some((u) => u.name.includes("Al"))).toBe(true);
  });

  it("searchUsersByName with no match returns empty array", async () => {
    await service.addUser(new User("UEC4", "Gamma", "pw"));
    const res = await service.searchUsersByName("ZzzDoesNotExist", 10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  it("getUserById for unknown id returns undefined", async () => {
    const user = await service.getUserById("NoSuchId");
    expect(user).toBeUndefined();
  });
});
