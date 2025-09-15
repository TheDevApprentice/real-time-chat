/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { MessagesRepo } from "../../../infrastructure/repos/MessagesRepo";
import { createMysqlTestDb, clearMysqlTestDb } from "../../helpers/mysqlTestDb";
import type { CallbackDB } from "../../../infrastructure/adapters/callbackDb";
import { createDialect } from "../../../infrastructure/sql/dialect";
import { Message } from "../../../domain/entities/Message";

// Integration tests for MessagesRepo against MariaDB

describe("MessagesRepo (Integration, MariaDB)", () => {
  let db: CallbackDB;
  const dialect = createDialect();

  const seedUser = async (id: string, name: string, password: string) => {
    await new Promise<void>((resolve, reject) =>
      db.run("INSERT INTO users (id, name, password) VALUES (?, ?, ?)", [id, name, password], (e) => (e ? reject(e) : resolve()))
    );
  };
  const seedRoom = async (id: string, name: string, creatorId: string, createdAt: number) => {
    await new Promise<void>((resolve, reject) =>
      db.run(
        "INSERT INTO rooms (id, name, creatorId, createdAt, type, isPublic) VALUES (?, ?, ?, ?, 'room', 1)",
        [id, name, creatorId, createdAt],
        (e) => (e ? reject(e) : resolve())
      )
    );
  };
  const addUserToRoom = async (userId: string, roomId: string) => {
    await new Promise<void>((resolve, reject) =>
      db.run("INSERT INTO user_rooms (userId, roomId) VALUES (?, ?)", [userId, roomId], (e) => (e ? reject(e) : resolve()))
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

  it("insert and fetch message by room and id, then update/edit flags", async () => {
    const repo = new MessagesRepo(db, dialect);
    await seedUser("MU1", "Alice", "pw");
    const ts = Date.now();
    await seedRoom("MR1", "General", "MU1", ts);
    await addUserToRoom("MU1", "MR1");

    const msg = new Message({ id: "MU1", name: "Alice", password: "" } as any, "hello", ts);
    await repo.addMessageToRoom(msg, "MR1");

    const list = await repo.getMessagesForRoom("MR1");
    expect(list.length).toBeGreaterThan(0);
    const last = list[list.length - 1];
    expect(last.content).toBe("hello");

    const byId = await repo.getMessageById(Number(last.id));
    expect(byId).not.toBeNull();

    await repo.markMessageDelivered(Number(last.id), Date.now());
    await repo.markMessageRead(Number(last.id), Date.now());

    await repo.updateMessageContent(Number(last.id), "edited");
    const afterEdit = await repo.getMessageById(Number(last.id));
    expect(afterEdit!.content).toBe("edited");

    await repo.softDeleteMessage(Number(last.id));
    const afterDelete = await repo.getMessageById(Number(last.id));
    expect(afterDelete!.content).toBe("[deleted]");
  });
});
