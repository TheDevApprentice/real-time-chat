import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { Logger } from "../../../../utils/LoggerUtil";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis as IoRedis } from "ioredis";
import {
  WsAuthenticateSchema,
  WsLoginSchema,
  WsRefreshTokenSchema,
  WsCreateRoomSchema,
  WsJoinRoomSchema,
  WsSendMessageSchema,
  WsMessageEditSchema,
  WsMessageDeleteSchema,
  WsMessageUndoSchema,
  WsUndoTtlSchema,
  WsCallRequestSchema,
  WsCallAcceptSchema,
  WsCallDeclineSchema,
  WsCallCancelSchema,
  WsCallOfferSchema,
  WsCallAnswerSchema,
  WsCallIceSchema,
  WsCallHangupSchema,
} from "../../../../utils/ValidationUtil";
import { WsRouter } from "./WsRouter";
import { AuthWsController } from "../controllers/AuthWsController";
import { RoomsWsController } from "../controllers/RoomsWsController";
import { MessagesWsController } from "../controllers/MessagesWsController";
import { FriendsWsController } from "../controllers/FriendsWsController";
import { CallsWsController } from "../controllers/CallsWsController";
import { WsContext } from "./WsContext";
import { validateWSMiddleware } from "../middlewares/validateWSMiddleware";
import { rateLimitRedisPerUserWSMiddleware, rateLimitRedisPerSocketWSMiddleware, rateLimitRedisByIpWSMiddleware } from "../middlewares/rateLimitRedisWSMiddleware";
import { requireAuthWSMiddleware } from "../middlewares/requireAuthWSMiddleware";
import { bruteForceRedisWSMiddleware } from "../middlewares/bruteForceRedisWSMiddleware";
import { requireCsrfWSMiddleware } from "../middlewares/requireCsrfWSMiddleware";
import type { z } from "zod";
import { getServices } from "../../../di/container";
import { K, TTL } from "../../../cache/cacheKeys";

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
  private callsCtrl: CallsWsController;
  private routerInitialized = false;
  private pubClient?: IoRedis;
  private subClient?: IoRedis;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: process.env.FRONTEND_URL, credentials: true },
    });
    // Configure cross-instance broadcasting using Redis adapter (no-op if Redis unavailable)
    void this.configureRedisAdapter();
    this.router = new WsRouter();
    this.authCtrl = new AuthWsController();
    this.roomsCtrl = new RoomsWsController();
    this.messagesCtrl = new MessagesWsController();
    this.friendsCtrl = new FriendsWsController();
    this.callsCtrl = new CallsWsController();
    this.registerRoutes();
    this.handleConnections();
  }

  public async dispose(): Promise<void> {
    // Graceful shutdown of adapter clients (no throw on errors)
    try {
      if (this.subClient) {
        try { 
          Logger.info("Redis subClient disconnecting");
          await this.subClient.quit(); 
        } catch {}
      }
    } catch {}
    try {
      if (this.pubClient) {
        try { 
          Logger.info("Redis pubClient disconnecting");
          await this.pubClient.quit(); 
        } catch {}
      }
    } catch {}
  }

  private async configureRedisAdapter(): Promise<void> {
    try {
      const url = process.env.REDIS_URL;
      let pub: IoRedis;
      let sub: IoRedis;
      if (typeof url === "string" && url.trim().length > 0) {
        // Connect using a single URL (redis://... or rediss://...)
        pub = new IoRedis(url);
        sub = pub.duplicate();
        Logger.info("Socket.IO Redis adapter (ioredis) enabled with URL: " + url);
      } else {
        // Build from individual envs (fallback similar to RedisService)
        const host = process.env.REDIS_HOST || "redis";
        const port = Number(process.env.REDIS_PORT || "6379");
        const username = process.env.REDIS_USER || undefined;
        const password = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || undefined;
        const useTLS = (process.env.REDIS_TLS || "false").toLowerCase() === "true";
        const options: any = { host, port };
        if (username) options.username = username;
        if (password) options.password = password;
        if (useTLS) options.tls = {};
        pub = new IoRedis(options);
        sub = pub.duplicate();
        Logger.info("Socket.IO Redis adapter (ioredis) enabled with options: " + JSON.stringify(options));
      }
      // ioredis auto-connects; no explicit await needed
      this.io.adapter(createAdapter(pub as any, sub as any));
      this.pubClient = pub;
      this.subClient = sub;
      Logger.info("Socket.IO Redis adapter (ioredis) enabled");
    } catch (err) {
      Logger.warn(
        "Socket.IO Redis adapter disabled: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  private registerRoutes(): void {
    if (this.routerInitialized) return;

    // Auth events
    this.router.register(
      "authenticate",
      validateWSMiddleware(WsAuthenticateSchema),
      async (ctx: WsContext<z.infer<typeof WsAuthenticateSchema>>) => this.authCtrl.authenticate(ctx)
    );

    // Calls (Phase 1: signaling scaffolding)
    this.router.register(
      "callRequest",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:request", 20, 60),
      validateWSMiddleware(WsCallRequestSchema),
      async (ctx: WsContext<z.infer<typeof WsCallRequestSchema>>) => this.callsCtrl.callRequest(ctx)
    );
    this.router.register(
      "callAccept",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:accept", 60, 60),
      validateWSMiddleware(WsCallAcceptSchema),
      async (ctx: WsContext<z.infer<typeof WsCallAcceptSchema>>) => this.callsCtrl.callAccept(ctx)
    );
    this.router.register(
      "callDecline",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:decline", 60, 60),
      validateWSMiddleware(WsCallDeclineSchema),
      async (ctx: WsContext<z.infer<typeof WsCallDeclineSchema>>) => this.callsCtrl.callDecline(ctx)
    );
    this.router.register(
      "callCancel",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:cancel", 60, 60),
      validateWSMiddleware(WsCallCancelSchema),
      async (ctx: WsContext<z.infer<typeof WsCallCancelSchema>>) => this.callsCtrl.callCancel(ctx)
    );
    this.router.register(
      "callOffer",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:offer", 120, 60),
      validateWSMiddleware(WsCallOfferSchema),
      async (ctx: WsContext<z.infer<typeof WsCallOfferSchema>>) => this.callsCtrl.callOffer(ctx)
    );
    this.router.register(
      "callAnswer",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:answer", 120, 60),
      validateWSMiddleware(WsCallAnswerSchema),
      async (ctx: WsContext<z.infer<typeof WsCallAnswerSchema>>) => this.callsCtrl.callAnswer(ctx)
    );
    this.router.register(
      "callIceCandidate",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:ice", 600, 10),
      validateWSMiddleware(WsCallIceSchema),
      async (ctx: WsContext<z.infer<typeof WsCallIceSchema>>) => this.callsCtrl.callIceCandidate(ctx)
    );
    this.router.register(
      "callHangup",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:hangup", 120, 60),
      validateWSMiddleware(WsCallHangupSchema),
      async (ctx: WsContext<z.infer<typeof WsCallHangupSchema>>) => this.callsCtrl.callHangup(ctx)
    );

    // TURN/STUN config for clients
    this.router.register(
      "getTurnConfig",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("call:getTurnConfig", 60, 60),
      async (ctx: WsContext) => this.callsCtrl.getTurnConfig(ctx)
    );

    // History pagination
    this.router.register(
      "loadRoomHistory",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:loadHistory", 120, 60),
      async (ctx: WsContext<{ roomId: string; cursor?: number; size?: number }>) => this.roomsCtrl.loadRoomHistory(ctx)
    );

    // Aggregations: top active rooms
    this.router.register(
      "getTopActiveRooms",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:topActive", 60, 60),
      async (ctx: WsContext<{ limit?: number }>) => this.roomsCtrl.getTopActiveRooms(ctx)
    );

    // Aggregations: last message for a room
    this.router.register(
      "getRoomLastMessage",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:lastMessage", 240, 60),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.getRoomLastMessage(ctx)
    );

    // Leaderboard: active users top
    this.router.register(
      "getActiveUsersTop",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:activeUsersTop", 60, 60),
      async (ctx: WsContext<{ limit?: number }>) => this.roomsCtrl.getActiveUsersTop(ctx)
    );

    // Aggregation: room message counts
    this.router.register(
      "getRoomMessageCounts",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:roomMsgCounts", 120, 60),
      async (ctx: WsContext<{ roomId: string; range?: 'hour' | 'day'; from?: number; to?: number }>) => this.roomsCtrl.getRoomMessageCounts(ctx)
    );
    this.router.register(
      "login",
      rateLimitRedisByIpWSMiddleware("auth:login", 10, 60),
      validateWSMiddleware(WsLoginSchema),
      bruteForceRedisWSMiddleware<z.infer<typeof WsLoginSchema>>({
        action: "login",
        keyFrom: (ctx: WsContext<z.infer<typeof WsLoginSchema>>) => ctx.payload?.username || ctx.socket.data?.userId || "unknown",
        maxAttempts: 5,
      }),
      async (ctx: WsContext<z.infer<typeof WsLoginSchema>>) => this.authCtrl.login(ctx)
    );
    this.router.register(
      "refreshToken",
      rateLimitRedisByIpWSMiddleware("auth:refresh", 20, 60),
      validateWSMiddleware(WsRefreshTokenSchema),
      bruteForceRedisWSMiddleware<z.infer<typeof WsRefreshTokenSchema>>({
        action: "refresh",
        keyFrom: (ctx: WsContext<z.infer<typeof WsRefreshTokenSchema>>) =>
          ctx.payload?.refreshToken || (ctx.socket.data as any)?.userId || "unknown",
        maxAttempts: 10,
      }),
      async (ctx: WsContext<z.infer<typeof WsRefreshTokenSchema>>) => this.authCtrl.refreshToken(ctx)
    );
    this.router.register(
      "logout",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      async (ctx: WsContext<{ token: string }>) => this.authCtrl.logout(ctx)
    );
    this.router.register("getSessions", requireAuthWSMiddleware(), async (ctx: WsContext) => this.authCtrl.getSessions(ctx));
    this.router.register(
      "revokeSession",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      async (ctx: WsContext<{ token: string }>) => this.authCtrl.revokeSession(ctx)
    );
    this.router.register(
      "logoutAll",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      async (ctx: WsContext) => this.authCtrl.logoutAll(ctx)
    );

    // Rooms events
    this.router.register(
      "createRoom",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:createRoom", 10, 60),
      validateWSMiddleware(WsCreateRoomSchema),
      async (ctx: WsContext<z.infer<typeof WsCreateRoomSchema>>) => this.roomsCtrl.createRoom(ctx)
    );
    this.router.register("getRooms", requireAuthWSMiddleware(), async (ctx: WsContext) => this.roomsCtrl.getRooms(ctx));
    this.router.register(
      "joinRoom",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:joinRoom", 20, 60),
      validateWSMiddleware(WsJoinRoomSchema),
      async (ctx: WsContext<z.infer<typeof WsJoinRoomSchema>>) => this.roomsCtrl.joinRoom(ctx)
    );

    // Typing indicators
    this.router.register(
      "typingStart",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.typingStart(ctx)
    );
    this.router.register(
      "typingStop",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.typingStop(ctx)
    );

    // Messages events
    this.router.register(
      "sendMessageToRoom",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:sendMessage", 60, 10),
      validateWSMiddleware(WsSendMessageSchema),
      async (ctx: WsContext<z.infer<typeof WsSendMessageSchema>>) => this.messagesCtrl.sendMessageToRoom(ctx)
    );
    this.router.register(
      "messageEdit",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:messageEdit", 60, 10),
      validateWSMiddleware(WsMessageEditSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageEditSchema>>) => this.messagesCtrl.messageEdit(ctx)
    );
    this.router.register(
      "messageDelete",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:messageDelete", 60, 10),
      validateWSMiddleware(WsMessageDeleteSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageDeleteSchema>>) => this.messagesCtrl.messageDelete(ctx)
    );
    this.router.register(
      "messageUndo",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:messageUndo", 60, 10),
      validateWSMiddleware(WsMessageUndoSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageUndoSchema>>) => this.messagesCtrl.messageUndo(ctx)
    );
    this.router.register(
      "getUndoTTL",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:getUndoTTL", 240, 10),
      validateWSMiddleware(WsUndoTtlSchema),
      async (ctx: WsContext<z.infer<typeof WsUndoTtlSchema>>) => this.messagesCtrl.getUndoTTL(ctx)
    );
    this.router.register(
      "messageDelivered",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:msgDelivered", 120, 60),
      async (ctx: WsContext) => this.messagesCtrl.messageDelivered(ctx)
    );
    this.router.register(
      "messageRead",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("chat:msgRead", 120, 60),
      async (ctx: WsContext) => this.messagesCtrl.messageRead(ctx)
    );

    // Friends events
    this.router.register(
      "friendRequest",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("friend:request", 30, 60),
      async (ctx: WsContext) => this.friendsCtrl.friendRequest(ctx)
    );
    this.router.register(
      "friendRespond",
      requireAuthWSMiddleware(),
      requireCsrfWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("friend:respond", 60, 60),
      async (ctx: WsContext) => this.friendsCtrl.friendRespond(ctx)
    );
    this.router.register(
      "friendList",
      requireAuthWSMiddleware(),
      rateLimitRedisPerUserWSMiddleware("friend:list", 60, 60),
      async (ctx: WsContext) => this.friendsCtrl.friendList(ctx)
    );

    this.routerInitialized = true;
  }

  private handleConnections(): void {
    const services = getServices();

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
          const session = await services.authService.getUserSessionByToken(token);
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
      const { redisService } = services as any;
      let presenceInterval: NodeJS.Timeout | null = null;

      const touchPresence = async (uid: string) => {
        try {
          await redisService.set(`presence:user:${uid}`, "online", { EX: 120 });
          await redisService.set(`socket:user:${socket.id}`, uid, { EX: 120 });
        } catch {}
      };

      const setupPresence = async () => {
        const uid = (socket.data as any)?.userId as string | undefined;
        if (!uid) return;
        await touchPresence(uid);
        if (!presenceInterval) {
          presenceInterval = setInterval(() => {
            touchPresence(uid).catch(() => undefined);
          }, 30_000);
          presenceInterval.unref?.();
        }
      };

      await setupPresence();
      // Track this socket under the user's sockets set for cross-node routing
      try {
        const uid = (socket.data as any)?.userId as string | undefined;
        if (uid) {
          await redisService.sAdd(K.userSockets(uid), socket.id);
        }
      } catch {}

      socket.on("disconnect", async () => {
        this.socketRates.delete(socket.id);
        if (presenceInterval) clearInterval(presenceInterval);
        const uid = (socket.data as any)?.userId as string | undefined;
        if (uid) {
          try {
            await redisService.set(`lastseen:user:${uid}`, String(Date.now()));
            await redisService.del(`socket:user:${socket.id}`);
            try { await redisService.sRem(K.userSockets(uid), socket.id); } catch {}
            // presence key will expire by itself shortly
          } catch {}
        }
        // Decrement room online counters for all joined rooms (except the private room with the socket id)
        try {
          const joined = Array.from(socket.rooms || []);
          for (const rid of joined) {
            if (!rid || rid === socket.id) continue;
            try {
              const newCount = await redisService.incrBy(K.roomOnline(rid), -1);
              try { await redisService.expire(K.roomOnline(rid), TTL.roomOnlineExpire); } catch {}
              this.io.to(rid).emit("roomOnline", { roomId: rid, count: Math.max(0, newCount) });
            } catch {}
          }
        } catch {}
      });

      // ---------------- WS ROUTER ATTACHMENT ----------------
      const makeContext = (sock: Socket): WsContext => ({
        io: this.io,
        socket: sock,
        services: {
          authService: services.authService,
          friendService: services.friendService,
          userService: services.userService,
          roomService: services.roomService,
          messageService: services.messageService,
          redisService: services.redisService,
          s3Service: (services as any).s3Service,
        },
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
