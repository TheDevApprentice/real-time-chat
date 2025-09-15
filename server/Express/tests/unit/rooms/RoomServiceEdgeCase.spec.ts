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
import { RoomService } from "../../../domain/services/dbServices/RoomService";
import { Room } from "../../../domain/entities/Room";
import { User } from "../../../domain/entities/User";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Edge cases for RoomService

describe("RoomService Edge Cases (UoW, MySQL)", () => {
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

  it("adding the same user twice to a room should not duplicate membership", async () => {
    const creator = new User("REC1", "Creator", "pw");
    const user = new User("REC2", "User", "pw");
    await seedUser(creator);
    await seedUser(user);
    const room = new Room("EdgeRoom", creator.id, Date.now(), "RR1");
    await service.addRoom(room);

    await service.addUsersToRoomBulk([user.id], room.id);
    await service.addUsersToRoomBulk([user.id], room.id); // second time

    const members = await service.getUsersForRoom(room.id);
    const count = members.filter((m) => m.id === user.id).length;
    expect(count).toBe(1);
  });

  it("getRoomById for unknown id returns undefined", async () => {
    const res = await service.getRoomById("NO_SUCH_ROOM");
    expect(res).toBeUndefined();
  });

  it("haveSharedRoom returns false when users have no common rooms", async () => {
    const a = new User("REC3", "A", "pw");
    const b = new User("REC4", "B", "pw");
    await seedUser(a);
    await seedUser(b);
    const shared = await service.haveSharedRoom(a.id, b.id);
    expect(shared).toBe(false);
  });
});
