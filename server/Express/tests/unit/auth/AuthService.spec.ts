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
import { AuthService } from "../../../domain/services/dbServices/AuthService";
import { User } from "../../../domain/entities/User";
import { UserSession } from "../../../domain/entities/UserSession";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Jest tests for AuthService on MariaDB via UoW

describe("AuthService (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: AuthService;

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
    service = new AuthService(handle.uow as any);
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

  it("should add and fetch sessions by user id", async () => {
    const user = new User("UAUTH1", "AuthUser", "pw");
    await seedUser(user);

    const s1 = new UserSession(
      "S1",
      user.id,
      "tok1",
      Date.now(),
      Date.now() + 3600_000,
      "ref1",
      Date.now() + 7200_000
    );
    const s2 = new UserSession(
      "S2",
      user.id,
      "tok2",
      Date.now(),
      Date.now() + 3600_000,
      "ref2",
      Date.now() + 7200_000
    );

    await service.addUserSession(s1);
    await service.addUserSession(s2);

    const list = await service.getUserSessionsByUserId(user.id);
    expect(list.length).toBe(2);
  });

  it("should get session by token and by refresh token", async () => {
    const user = new User("UAUTH2", "AuthUser2", "pw");
    await seedUser(user);

    const s = new UserSession(
      "S3",
      user.id,
      "tok3",
      Date.now(),
      Date.now() + 3600_000,
      "ref3",
      Date.now() + 7200_000
    );
    await service.addUserSession(s);

    const byToken = await service.getUserSessionByToken("tok3");
    expect(byToken).not.toBeNull();
    expect(byToken!.userId).toBe(user.id);

    const byRefresh = await service.getUserSessionByRefreshToken("ref3");
    expect(byRefresh).not.toBeNull();
    expect(byRefresh!.userId).toBe(user.id);
  });

  it("should delete sessions (single and all by user)", async () => {
    const user = new User("UAUTH3", "AuthUser3", "pw");
    await seedUser(user);

    const s1 = new UserSession("S4", user.id, "tok4", Date.now());
    const s2 = new UserSession("S5", user.id, "tok5", Date.now());

    await service.addUserSession(s1);
    await service.addUserSession(s2);

    await service.deleteUserSession("tok4");
    let list = await service.getUserSessionsByUserId(user.id);
    expect(list.length).toBe(1);

    await service.deleteAllUserSessionsByUserId(user.id);
    list = await service.getUserSessionsByUserId(user.id);
    expect(list.length).toBe(0);
  });
});
