import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { DatabaseService } from "../../../services/DatabaseService";
import { Logger } from "../../../utils/Logger";
import {
  WsAuthenticateSchema,
  WsLoginSchema,
  WsRefreshTokenSchema,
  WsCreateRoomSchema,
  WsJoinRoomSchema,
  WsSendMessageSchema,
  parseOrThrow,
} from "../../../utils/validation";
import { WsRouter } from "./WsRouter";
import { AuthWsController } from "../controllers/AuthWsController";
import { RoomsWsController } from "../controllers/RoomsWsController";
import { MessagesWsController } from "../controllers/MessagesWsController";
import { FriendsWsController } from "../controllers/FriendsWsController";
import { WsContext } from "./WsContext";

export class WebSocketGateway {
  private io: SocketServer;
  // Simple per-socket rate limiter storage
  private socketRates: Map<
    string,
    Record<string, { count: number; windowStart: number }>
  > = new Map();
  // WS Router + Controllers
  private router: WsRouter;
  private authCtrl: AuthWsController;
  private roomsCtrl: RoomsWsController;
  private messagesCtrl: MessagesWsController;
  private friendsCtrl: FriendsWsController;
  private routerInitialized = false;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: process.env.FRONTEND_URL, credentials: true },
    });
    this.router = new WsRouter();
    this.authCtrl = new AuthWsController();
    this.roomsCtrl = new RoomsWsController();
    this.messagesCtrl = new MessagesWsController();
    this.friendsCtrl = new FriendsWsController();
    this.registerRoutes();
    this.handleConnections();
  }

  private allowSocket(socketId: string, key: string, limit: number, windowMs: number): boolean {
    const rec = this.socketRates.get(socketId) || {};
    const now = Date.now();
    const item = rec[key] || { count: 0, windowStart: now };
    if (now - item.windowStart > windowMs) {
      item.count = 0;
      item.windowStart = now;
    }
    item.count += 1;
    rec[key] = item;
    this.socketRates.set(socketId, rec);
    return item.count <= limit;
  }

  private registerRoutes(): void {
    if (this.routerInitialized) return;

    // Auth events
    this.router.register("authenticate", async (ctx: WsContext) => {
      const payload = parseOrThrow(WsAuthenticateSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.authCtrl.authenticate(ctx as any);
    });
    this.router.register("login", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "auth:login", 10, 60_000)) return { error: "Rate limit exceeded." };
      const payload = parseOrThrow(WsLoginSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.authCtrl.login(ctx as any);
    });
    this.router.register("refreshToken", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "auth:refresh", 20, 60_000)) return { error: "Rate limit exceeded." };
      const payload = parseOrThrow(WsRefreshTokenSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.authCtrl.refreshToken(ctx as any);
    });
    this.router.register("logout", async (ctx: WsContext) => this.authCtrl.logout(ctx as any));
    this.router.register("getSessions", async (ctx: WsContext) => this.authCtrl.getSessions(ctx as any));
    this.router.register("revokeSession", async (ctx: WsContext) => this.authCtrl.revokeSession(ctx as any));
    this.router.register("logoutAll", async (ctx: WsContext) => this.authCtrl.logoutAll(ctx as any));

    // Rooms events
    this.router.register("createRoom", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "chat:createRoom", 10, 60_000)) return { error: "Rate limit exceeded." };
      const payload = parseOrThrow(WsCreateRoomSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.roomsCtrl.createRoom(ctx as any);
    });
    this.router.register("getRooms", async (ctx: WsContext) => this.roomsCtrl.getRooms(ctx as any));
    this.router.register("joinRoom", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "chat:joinRoom", 20, 60_000)) return { error: "Rate limit exceeded." };
      const payload = parseOrThrow(WsJoinRoomSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.roomsCtrl.joinRoom(ctx as any);
    });

    // Messages events
    this.router.register("sendMessageToRoom", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "chat:sendMessage", 60, 10_000)) return { error: "Rate limit exceeded." };
      const payload = parseOrThrow(WsSendMessageSchema, (ctx as any).payload);
      (ctx as any).payload = payload;
      return this.messagesCtrl.sendMessageToRoom(ctx as any);
    });
    this.router.register("messageDelivered", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "chat:msgDelivered", 120, 60_000)) return { success: false, error: "Rate limit exceeded." };
      return this.messagesCtrl.messageDelivered(ctx as any);
    });
    this.router.register("messageRead", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "chat:msgRead", 120, 60_000)) return { success: false, error: "Rate limit exceeded." };
      return this.messagesCtrl.messageRead(ctx as any);
    });

    // Friends events
    this.router.register("friendRequest", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "friend:request", 30, 60_000)) return { success: false, error: "Rate limit exceeded." };
      return this.friendsCtrl.friendRequest(ctx as any);
    });
    this.router.register("friendRespond", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "friend:respond", 60, 60_000)) return { success: false, error: "Rate limit exceeded." };
      return this.friendsCtrl.friendRespond(ctx as any);
    });
    this.router.register("friendList", async (ctx: WsContext) => {
      if (!this.allowSocket(ctx.socket.id, "friend:list", 60, 60_000)) return { success: false, error: "Rate limit exceeded." };
      return this.friendsCtrl.friendList(ctx as any);
    });

    this.routerInitialized = true;
  }

  private handleConnections(): void {
    const dbService = DatabaseService.getInstance();

    this.io.on("connection", async (socket: Socket) => {
      // --- SESSION RESTORE VIA TOKEN OR COOKIE ---
      let token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        const cookieHeader = (socket.handshake.headers as any)["cookie"] as
          | string
          | undefined;
        if (cookieHeader) {
          // Prefer hardened __Host-session cookie name
          let m = cookieHeader.match(/(?:^|; )__Host-session=([^;]+)/);
          if (!m) {
            // Dev fallback for legacy cookie name
            m = cookieHeader.match(/(?:^|; )session_token=([^;]+)/);
          }

          if (m) token = decodeURIComponent(m[1]);
        }
      }
      if (token) {
        try {
          const session = await dbService.getUserSessionByToken(token);
          if (session && session.user) {
            socket.data.userId = session.user.id;
            socket.data.user = session.user;
            socket.emit("sessionRestored", { user: session.user.toJSON() });
          }
        } catch (err) {
          Logger.error(
            "Session restore failed: " +
              (err instanceof Error ? err.message : String(err))
          );
        }
      }
      // Logger.info(`Client connected: ${socket.id}`);
      socket.on("disconnect", () => {
        this.socketRates.delete(socket.id);
      });

      // ---------------- WS ROUTER ATTACHMENT ----------------
      const makeContext = (sock: Socket): WsContext => ({
        io: this.io,
        socket: sock,
        services: { db: dbService },
        env: {
          FRONTEND_URL: process.env.FRONTEND_URL,
          TRUST_PROXY: process.env.TRUST_PROXY,
        },
      });

      const attach = this.router.attach(makeContext);
      attach(socket);
      // Prevent legacy duplicate handlers from being registered below
      return;
    });
  }
}
