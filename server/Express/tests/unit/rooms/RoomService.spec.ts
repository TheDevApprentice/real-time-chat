/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { createTestUow, type TestUowHandle } from "../../helpers/testUow";
import { RoomService } from "../../../domain/services/dbServices/RoomService";
import { Room } from "../../../domain/entities/Room";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Jest tests for RoomService on MariaDB via UoW

describe("RoomService (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: RoomService;

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
    service = new RoomService(handle.uow as any);
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

  it("should create and fetch a room", async () => {
    const user = new User("U100", "Creator", "pw");
    await seedUser(user);
    const room = new Room("General", user.id, Date.now(), "R100");
    const created = await service.addRoom(room);
    expect(created.id).toBe("R100");

    const fetched = await service.getRoomById("R100");
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe("R100");
  });

  it("should add multiple users to a room atomically (tx)", async () => {
    const creator = new User("U200", "Creator", "pw");
    await seedUser(creator);
    const users = [new User("U201", "User1", "pw"), new User("U202", "User2", "pw"), new User("U203", "User3", "pw")];
    for (const user of users) await seedUser(user);

    const room = new Room("Team", creator.id, Date.now(), "R200");
    await service.addRoom(room);

    await service.addUsersToRoomBulk(users.map((u) => u.id), room.id);

    // Verify via service methods where possible
    const members = await service.getUsersForRoom("R200");
    const memberIds = new Set(members.map((u) => u.id));
    expect(memberIds.has("U201")).toBe(true);
    expect(memberIds.has("U202")).toBe(true);
    expect(memberIds.has("U203")).toBe(true);
  });

  it("should detect shared rooms between two users", async () => {
    const creator = new User("U300", "Creator", "pw");
    await seedUser(creator);
    const uA = new User("U301", "A", "pw");
    const uB = new User("U302", "B", "pw");
    await seedUser(uA);
    await seedUser(uB);

    const room = new Room("Shared", creator.id, Date.now(), "R300");
    await service.addRoom(room);

    await service.addUsersToRoomBulk([uA.id, uB.id], room.id);

    const shared = await service.haveSharedRoom(uA.id, uB.id);
    expect(shared).toBe(true);
  });
});
