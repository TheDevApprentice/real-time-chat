/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { RoomsRepo } from "../../../infrastructure/repos/RoomsRepo";
import { createMysqlTestDb, clearMysqlTestDb } from "../../helpers/mysqlTestDb";
import type { CallbackDB } from "../../../infrastructure/adapters/callbackDb";
import { createDialect } from "../../../infrastructure/sql/dialect";
import { Room } from "../../../domain/entities/Room";

// Integration tests for RoomsRepo against MariaDB

describe("RoomsRepo (Integration, MariaDB)", () => {
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

  it("addRoom and getRoomById with users", async () => {
    const repo = new RoomsRepo(db, dialect);
    await seedUser("RU1", "U1", "pw");
    await seedUser("RU2", "U2", "pw");
    const room = new Room("General", "RU1", Date.now(), "RR1");
    await repo.addRoom(room);
    await repo.addUsersToRoomBulk(["RU1", "RU2"], room.id);

    const fetched = await repo.getRoomById(room.id);
    expect(fetched).toBeDefined();
    const users = await repo.getUsersForRoom(room.id);
    const ids = new Set(users.map((u) => u.id));
    expect(ids.has("RU1")).toBe(true);
    expect(ids.has("RU2")).toBe(true);
  });

  it("getRoomsForUser returns rooms where the user is a member", async () => {
    const repo = new RoomsRepo(db, dialect);
    await seedUser("RX1", "X", "pw");
    await seedUser("RX2", "Y", "pw");
    const r1 = new Room("Team", "RX1", Date.now(), "R1");
    const r2 = new Room("Rand", "RX1", Date.now(), "R2");
    await repo.addRoom(r1);
    await repo.addRoom(r2);
    await repo.addUsersToRoomBulk(["RX1", "RX2"], r1.id);

    const rooms = await repo.getRoomsForUser("RX2");
    const set = new Set(rooms.map((r) => r.id));
    expect(set.has("R1")).toBe(true);
    expect(set.has("R2")).toBe(false);
  });
});
