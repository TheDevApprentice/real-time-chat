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

// Types
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

// Utility to build WsContext inline
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

// End-to-end component test over WS controllers (bypass middleware)
describe("WS Controllers E2E (bypass middleware)", () => {
  let handle: TestUowHandle;
  let dbConn: CallbackDB;

  // Real domain services on real UoW (MariaDB)
  let friendService: FriendService;
  let roomService: RoomService;
  let messageService: MessageService;
  let authService: AuthService;
  let userService: UserService;

  // Controllers
  const authCtrl = new AuthWsController();
  const friendsCtrl = new FriendsWsController();
  const roomsCtrl = new RoomsWsController();
  const messagesCtrl = new MessagesWsController();

  const io = new FakeIo();
  const socketA = new FakeSocket("sock-A");
  const socketB = new FakeSocket("sock-B");
  io.sockets = [socketA, socketB];

  const services = () => ({ friendService, roomService, messageService, authService, userService, redisService: fakeRedis() });

  beforeAll(async () => {
    jest.setTimeout(8000);
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

  it("full scenario: register/login A & B, friend request + accept, create DM room, exchange messages, logout", async () => {
    // Seed users with hashed passwords so AuthWsController.login(bcrypt.compare) passes
    await seedUserRaw(dbConn, "UA", "alice", "pwA");
    await seedUserRaw(dbConn, "UB", "bob", "pwB");

    // Login A
    let resA = await authCtrl.login(makeCtx(services(), io, socketA, { username: "alice", password: "pwA" }));
    expect((resA as any).token).toBeDefined();
    const tokenA = (resA as any).token as string;
    // Login sets socket.data.userId = user's id
    expect(socketA.data.userId).toBe("UA");

    // Login B
    let resB = await authCtrl.login(makeCtx(services(), io, socketB, { username: "bob", password: "pwB" }));
    expect((resB as any).token).toBeDefined();
    const tokenB = (resB as any).token as string;
    expect(socketB.data.userId).toBe("UB");

    // A -> friend request to B
    const frReq = await friendsCtrl.friendRequest(makeCtx(services(), io, socketA, { targetUserId: "UB" }));
    expect((frReq as any).success).toBe(true);

    // B accepts
    const frAcc = await friendsCtrl.friendRespond(makeCtx(services(), io, socketB, { otherUserId: "UA", action: "accept" }));
    expect((frAcc as any).success).toBe(true);

    // A creates a DM room with B (type: 'user')
    const createDm = await roomsCtrl.createRoom(makeCtx(services(), io, socketA, { name: "DM UA<->UB", type: "user", invitedUserIds: ["UB"] }));
    expect((createDm as any).success).toBe(true);

    // Fetch visible rooms for A and get the DM room id from emitted 'rooms'
    await roomsCtrl.getRooms(makeCtx(services(), io, socketA));
    const roomsEvent = socketA.events.find(e => e.event === "rooms");
    expect(roomsEvent).toBeDefined();
    const roomsList = Array.isArray(roomsEvent?.payload) ? roomsEvent?.payload : roomsEvent?.payload; // payload already array
    // Find private room that includes both UA and UB
    const dm = (roomsEvent?.payload as any[]).find((r) => !r.isPublic && Array.isArray(r.users) && r.users.some((u: any) => u.id === "UA") && r.users.some((u: any) => u.id === "UB"));
    expect(dm).toBeDefined();
    const roomId = dm.id as string;

    // A sends message to DM
    const sendA = await messagesCtrl.sendMessageToRoom(makeCtx(services(), io, socketA, { roomId, content: "Hello Bob!" }));
    expect((sendA as any).success).toBe(true);
    // B sends reply
    const sendB = await messagesCtrl.sendMessageToRoom(makeCtx(services(), io, socketB, { roomId, content: "Hello Alice!" }));
    expect((sendB as any).success).toBe(true);

    // Check that message events were emitted to members
    const msgEventsA = socketA.events.filter(e => e.event === "message");
    const msgEventsB = socketB.events.filter(e => e.event === "message");
    expect(msgEventsA.length + msgEventsB.length).toBeGreaterThanOrEqual(2);

    // Logout both
    const outA = await authCtrl.logout(makeCtx(services(), io, socketA, { token: tokenA }));
    const outB = await authCtrl.logout(makeCtx(services(), io, socketB, { token: tokenB }));
    expect((outA as any).success).toBe(true);
    expect((outB as any).success).toBe(true);
  });

  it("same scenario but each user has two sessions and we perform logoutAll to remove all sessions", async () => {
    // Seed distinct users
    await seedUserRaw(dbConn, "UA3", "alice3", "pwA3");
    await seedUserRaw(dbConn, "UB3", "bob3", "pwB3");

    // Add second sockets to simulate two sessions per user
    const socketA2 = new FakeSocket("sock-A-dup");
    const socketB2 = new FakeSocket("sock-B-dup");
    (io.sockets as any).push(socketA2, socketB2);

    // Login for A on two sockets
    const a1 = await authCtrl.login(makeCtx(services(), io, socketA, { username: "alice3", password: "pwA3" }));
    const a2 = await authCtrl.login(makeCtx(services(), io, socketA2, { username: "alice3", password: "pwA3" }));
    expect((a1 as any).token).toBeDefined();
    expect((a2 as any).token).toBeDefined();
    expect(socketA.data.userId).toBe("UA3");
    expect(socketA2.data.userId).toBe("UA3");

    // Login for B on two sockets
    const b1 = await authCtrl.login(makeCtx(services(), io, socketB, { username: "bob3", password: "pwB3" }));
    const b2 = await authCtrl.login(makeCtx(services(), io, socketB2, { username: "bob3", password: "pwB3" }));
    expect((b1 as any).token).toBeDefined();
    expect((b2 as any).token).toBeDefined();
    expect(socketB.data.userId).toBe("UB3");
    expect(socketB2.data.userId).toBe("UB3");

    // Friend flow and DM creation (using one socket per user)
    await friendsCtrl.friendRequest(makeCtx(services(), io, socketA, { targetUserId: "UB3" }));
    await friendsCtrl.friendRespond(makeCtx(services(), io, socketB, { otherUserId: "UA3", action: "accept" }));
    const dmRes = await roomsCtrl.createRoom(makeCtx(services(), io, socketA, { name: "DM UA3<->UB3", type: "user", invitedUserIds: ["UB3"] }));
    expect((dmRes as any).success).toBe(true);

    // Sanity: send one message
    await roomsCtrl.getRooms(makeCtx(services(), io, socketA));
    const roomsEvent = socketA.events.find(e => e.event === "rooms");
    const dm = (roomsEvent?.payload as any[]).find((r: any) => !r.isPublic && r.users?.some((u: any) => u.id === "UA3") && r.users?.some((u: any) => u.id === "UB3"));
    expect(dm).toBeDefined();
    await messagesCtrl.sendMessageToRoom(makeCtx(services(), io, socketA, { roomId: dm.id, content: "Hi from A" }));

    // Perform logoutAll as user A, then as user B
    const outAllA = await authCtrl.logoutAll(makeCtx(services(), io, socketA));
    expect((outAllA as any).success).toBe(true);
    const outAllB = await authCtrl.logoutAll(makeCtx(services(), io, socketB));
    expect((outAllB as any).success).toBe(true);

    // All sockets for UA3 should have received forceLogout
    const aForced1 = socketA.events.some(e => e.event === "forceLogout");
    const aForced2 = socketA2.events.some(e => e.event === "forceLogout");
    expect(aForced1 && aForced2).toBe(true);

    // All sockets for UB3 should have received forceLogout
    const bForced1 = socketB.events.some(e => e.event === "forceLogout");
    const bForced2 = socketB2.events.some(e => e.event === "forceLogout");
    expect(bForced1 && bForced2).toBe(true);

    // Sessions should be cleared for both users
    const sessionsA = await authService.getUserSessionsByUserId("UA3");
    const sessionsB = await authService.getUserSessionsByUserId("UB3");
    expect(sessionsA.length).toBe(0);
    expect(sessionsB.length).toBe(0);
  });

});
