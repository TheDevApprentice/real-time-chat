/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { createTestUow, type TestUowHandle } from "../../helpers/testUow";
import { clearMysqlTestDb, createMysqlTestDb } from "../../helpers/mysqlTestDb";
import type { CallbackDB } from "../../../infrastructure/adapters/callbackDb";
import bcrypt from "bcryptjs";

// Domain services
import { FriendService } from "../../../domain/services/dbServices/FriendService";
import { RoomService } from "../../../domain/services/dbServices/RoomService";
import { MessageService } from "../../../domain/services/dbServices/MessageService";
import { AuthService } from "../../../domain/services/dbServices/AuthService";
import { UserService } from "../../../domain/services/dbServices/UserService";

// WS controllers
import { AuthWsController } from "../../../api/routes/WS/controllers/AuthWsController";
import { FriendsWsController } from "../../../api/routes/WS/controllers/FriendsWsController";
import { RoomsWsController } from "../../../api/routes/WS/controllers/RoomsWsController";
import { MessagesWsController } from "../../../api/routes/WS/controllers/MessagesWsController";

import type { WsContext } from "../../../api/routes/WS/router/WsContext";

// Minimal socket/io test doubles
class FakeSocket {
  id: string;
  data: Record<string, any> = {};
  rooms: Set<string> = new Set();
  events: Array<{ event: string; payload: any }> = [];
  constructor(id: string) { this.id = id; }
  emit(event: string, payload?: any) { this.events.push({ event, payload }); }
  join(roomId: string) { this.rooms.add(roomId); }
  disconnect() { /* noop */ }
}
class FakeIo {
  sockets: FakeSocket[] = [];
  to(roomId: string) { return { emit: (_evt: string, _payload: any) => {} }; }
  async fetchSockets(): Promise<Array<FakeSocket>> { return this.sockets; }
}

// Minimal redis test double
const fakeRedis = () => ({
  async get(_k: string) { return null; },
  async set(_k: string, _v: string, _opts?: any) { return "OK"; },
  async del(_kOrArr: any) { return 1; },
  async incrBy(_k: string, _n: number) { return _n; },
  async expire(_k: string, _sec: number) { return 1; },
  async setNxExpire(_k: string, _v: string, _sec: number) { return true; },
  async zAdd(_k: string, _score: number, _member: string) { return 1; },
  async zIncrBy(_k: string, _incr: number, _member: string) { return 1; },
  async publish(_ch: string, _msg: string) { return 1; },
  async ttl(_k: string) { return 0; },
  async hSet(_k: string, _field: string, _value: string) { return 1; },
});

function makeCtx<TPayload = any>(services: any, io: FakeIo, socket: FakeSocket, payload?: TPayload): WsContext<TPayload> {
  return { services, io: io as any, socket: socket as any, payload } as any;
}

async function seedUserRaw(db: CallbackDB, id: string, name: string, rawPassword: string) {
  const hash = await bcrypt.hash(rawPassword, 10);
  await new Promise<void>((resolve, reject) =>
    db.run(
      "INSERT INTO users (id, name, password) VALUES (?, ?, ?)",
      [id, name, hash],
      (err) => (err ? reject(err) : resolve())
    )
  );
}

describe("WS Controllers E2E #2 (pagination + edit/delete with permissions)", () => {
  let handle: TestUowHandle;
  let dbConn: CallbackDB;

  let friendService: FriendService;
  let roomService: RoomService;
  let messageService: MessageService;
  let authService: AuthService;
  let userService: UserService;

  const authCtrl = new AuthWsController();
  const friendsCtrl = new FriendsWsController();
  const roomsCtrl = new RoomsWsController();
  const messagesCtrl = new MessagesWsController();

  const io = new FakeIo();
  const socketA = new FakeSocket("sock-A2");
  const socketB = new FakeSocket("sock-B2");
  io.sockets = [socketA, socketB];

  const services = () => ({ friendService, roomService, messageService, authService, userService, redisService: fakeRedis() });

  beforeAll(async () => {
    jest.setTimeout(10000);
    await clearMysqlTestDb();
    handle = await createTestUow();
    dbConn = await createMysqlTestDb();
    friendService = new FriendService(handle.uow as any);
    roomService = new RoomService(handle.uow as any);
    messageService = new MessageService(handle.uow as any);
    authService = new AuthService(handle.uow as any);
    userService = new UserService(handle.uow as any);
    await new Promise<void>((resolve, reject) =>
      handle.db.get("SELECT 1", undefined, (err) => (err ? reject(err) : resolve()))
    );
  });

  afterAll(async () => {
    await handle.close();
    await new Promise<void>((resolve) => dbConn.close(() => resolve()));
    await clearMysqlTestDb();
  });

  beforeEach(async () => {
    socketA.events = [];
    socketB.events = [];
    socketA.data = {};
    socketB.data = {};
    await clearMysqlTestDb();
  });

  it("login A/B, DM, send message, paginate, edit allowed, edit forbidden by other, delete by author", async () => {
    await seedUserRaw(dbConn, "UA2", "alice2", "pwA");
    await seedUserRaw(dbConn, "UB2", "bob2", "pwB");

    const resA = await authCtrl.login(makeCtx(services(), io, socketA, { username: "alice2", password: "pwA" }));
    expect((resA as any).token).toBeDefined();
    const resB = await authCtrl.login(makeCtx(services(), io, socketB, { username: "bob2", password: "pwB" }));
    expect((resB as any).token).toBeDefined();

    // friend A->B then B accepts
    await friendsCtrl.friendRequest(makeCtx(services(), io, socketA, { targetUserId: "UB2" }));
    await friendsCtrl.friendRespond(makeCtx(services(), io, socketB, { otherUserId: "UA2", action: "accept" }));

    // A creates a DM with B
    const cr = await roomsCtrl.createRoom(makeCtx(services(), io, socketA, { name: "DM-2", type: "user", invitedUserIds: ["UB2"] }));
    expect((cr as any).success).toBe(true);

    // Fetch visible rooms and get DM id
    await roomsCtrl.getRooms(makeCtx(services(), io, socketA));
    const roomsEvent = socketA.events.find(e => e.event === "rooms");
    const dm = (roomsEvent?.payload as any[]).find((r) => !r.isPublic && Array.isArray(r.users) && r.users.some((u: any) => u.id === "UA2") && r.users.some((u: any) => u.id === "UB2"));
    expect(dm).toBeDefined();
    const roomId = dm.id as string;

    // A sends a message
    const sendA = await messagesCtrl.sendMessageToRoom(makeCtx(services(), io, socketA, { roomId, content: "First msg" }));
    expect((sendA as any).success).toBe(true);

    // Capture messageId from events
    const evA = socketA.events.find(e => e.event === "message");
    expect(evA).toBeDefined();
    const messageId = Number(evA?.payload?.message?.id ?? evA?.payload?.messageId);
    expect(Number.isFinite(messageId)).toBe(true);

    // Paginate history size=1 starting at cursor=0
    const page1 = await roomsCtrl.loadRoomHistory(makeCtx(services(), io, socketA, { roomId, cursor: 0, size: 1 } as any));
    expect((page1 as any).success).toBe(true);
    expect((page1 as any).page?.items?.length).toBeGreaterThanOrEqual(1);

    // Edit by author should succeed
    const editOk = await messagesCtrl.messageEdit(makeCtx(services(), io, socketA, { roomId, messageId, newContent: "Edited by A" } as any));
    expect((editOk as any).success).toBe(true);

    // Edit by other user should be forbidden
    const editKo = await messagesCtrl.messageEdit(makeCtx(services(), io, socketB, { roomId, messageId, newContent: "Edited by B" } as any));
    expect((editKo as any).success).toBe(false);

    // Delete by author should succeed
    const delOk = await messagesCtrl.messageDelete(makeCtx(services(), io, socketA, { roomId, messageId } as any));
    expect((delOk as any).success).toBe(true);
  });
});
