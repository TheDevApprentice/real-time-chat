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

// Jest tests for MessageService on MariaDB via UoW

describe("MessageService (UoW, MySQL)", () => {
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

  it("should add and fetch messages for a room", async () => {
    const user = new User("U1", "User1", "aaaaaa");
    const room = new Room("General", user.id, Date.now(), "R1");
    await seedUser(user);
    await seedRoom(room);
    await addUserToRoom(user, room);

    const msg = new Message(user, "Hello", Date.now());
    await service.addMessageToRoom(msg, room.id);

    const list = await service.getMessagesForRoom(room.id);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("should mark message delivered and read, update content, and soft delete", async () => {
    const user = new User("U2", "User2", "pw");
    const room = new Room("Random", user.id, Date.now(), "R2");
    await seedUser(user);
    await seedRoom(room);
    await addUserToRoom(user, room);

    const msg = new Message(user, "Original", Date.now());
    await service.addMessageToRoom(msg, room.id);
    const messages = await service.getMessagesForRoom(room.id);
    expect(messages.length).toBeGreaterThan(0);
    const created = messages[messages.length - 1];
    const createdID = Number(created.id);
    await service.markMessageDelivered(createdID, Date.now());
    await service.markMessageRead(createdID, Date.now());

    await service.updateMessageContent(createdID, "Edited");
    const fetched = await service.getMessageById(createdID);
    expect(fetched).not.toBeNull();

    await service.softDeleteMessage(createdID);
    const after = await service.getMessageById(createdID);
    expect(after).not.toBeNull();
  });
});
