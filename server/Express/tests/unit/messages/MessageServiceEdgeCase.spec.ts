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
import { MessageService } from "../../../domain/services/dbServices/MessageService";
import { Message } from "../../../domain/entities/Message";
import { User } from "../../../domain/entities/User";
import { Room } from "../../../domain/entities/Room";
import { clearMysqlTestDb } from "../../helpers/mysqlTestDb";

// Edge cases for MessageService

describe("MessageService Edge Cases (UoW, MySQL)", () => {
  let handle: TestUowHandle;
  let service: MessageService;

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
  const seedRoom = async (room: Room) => {
    await new Promise<void>((resolve, reject) =>
      handle.db.run(
        "INSERT INTO rooms (id, name, creatorId, createdAt, type, isPublic) VALUES (?, ?, ?, ?, 'room', 1)",
        [room.id, room.name, room.creatorId, room.createdAt],
        (err) => (err ? reject(err) : resolve())
      )
    );
  };
  const addUserToRoom = async (user: User, room: Room) => {
    await new Promise<void>((resolve, reject) =>
      handle.db.run(
        "INSERT INTO user_rooms (userId, roomId) VALUES (?, ?)",
        [user.id, room.id],
        (err) => (err ? reject(err) : resolve())
      )
    );
  };

  beforeAll(async () => {
    jest.setTimeout(3000);
    await clearTables();
    handle = await createTestUow();
    service = new MessageService(handle.uow as any);
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

  it("mark delivered/read on unknown id should not throw", async () => {
    await expect(
      service.markMessageDelivered(999999, Date.now())
    ).resolves.toBeUndefined();
    await expect(
      service.markMessageRead(999999, Date.now())
    ).resolves.toBeUndefined();
  });

  it("update/softDelete on unknown id should not throw", async () => {
    await expect(
      service.updateMessageContent(999999, "Edited")
    ).resolves.toBeUndefined();
    await expect(service.softDeleteMessage(999999)).resolves.toBeUndefined();
  });

  it("allows empty content message (if repo permits) and can fetch it", async () => {
    const user = new User("MEC1", "User", "pw");
    const room = new Room("Edge", user.id, Date.now(), "MR1");
    await seedUser(user);
    await seedRoom(room);
    await addUserToRoom(user, room);
    const msg = new Message(user, "", Date.now());
    await service.addMessageToRoom(msg, room.id);
    const list = await service.getMessagesForRoom(room.id);
    expect(list.length).toBeGreaterThan(0);
  });
});
