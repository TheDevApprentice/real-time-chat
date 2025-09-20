/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { SessionsRepo } from "../../../infrastructure/repos/SessionsRepo";
import { UsersRepo } from "../../../infrastructure/repos/UsersRepo";
import { createMysqlTestDb, clearMysqlTestDb } from "../../helpers/mysqlTestDb";
import type { CallbackDB } from "../../../infrastructure/adapters/callbackDb";
import { createDialect } from "../../../infrastructure/sql/dialect";
import { UserSession } from "../../../domain/entities/UserSession";

// Integration tests for SessionsRepo against MariaDB

describe("SessionsRepo (Integration, MariaDB)", () => {
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

  it("add, get by userId, get by token, delete", async () => {
    const usersRepo = new UsersRepo(db, dialect);
    const repo = new SessionsRepo(db, usersRepo, dialect);

    await seedUser("SU1", "Alice", "pw");
    const now = Date.now();
    const s1 = new UserSession("SID1", "SU1", "tok-1", now, now + 60_000, "ref-1", now + 120_000);

    await repo.addUserSession(s1);
    const byUser = await repo.getUserSessionsByUserId("SU1");
    expect(byUser.length).toBe(1);

    const byTok = await repo.getUserSessionByToken("tok-1");
    expect(byTok).not.toBeNull();
    expect(byTok!.userId).toBe("SU1");

    await repo.deleteUserSession("tok-1");
    const afterDel = await repo.getUserSessionsByUserId("SU1");
    expect(afterDel.length).toBe(0);
  });

  it("getUserSessionByToken returns null and deletes when expired", async () => {
    const usersRepo = new UsersRepo(db, dialect);
    const repo = new SessionsRepo(db, usersRepo, dialect);

    await seedUser("SU2", "Bob", "pw");
    const now = Date.now();
    const expired = new UserSession("SID2", "SU2", "tok-exp", now, now - 1, undefined, undefined);
    await repo.addUserSession(expired);

    const byTok = await repo.getUserSessionByToken("tok-exp");
    expect(byTok).toBeNull();

    const list = await repo.getUserSessionsByUserId("SU2");
    expect(list.length).toBe(0);
  });

  it("getUserSessionByRefreshToken returns session when exists", async () => {
    const usersRepo = new UsersRepo(db, dialect);
    const repo = new SessionsRepo(db, usersRepo, dialect);

    await seedUser("SU3", "Cara", "pw");
    const now = Date.now();
    const s = new UserSession("SID3", "SU3", "tok-3", now, now + 60_000, "ref-3", now + 120_000);
    await repo.addUserSession(s);

    const byRef = await repo.getUserSessionByRefreshToken("ref-3");
    expect(byRef).not.toBeNull();
    expect(byRef!.userId).toBe("SU3");
  });
});
