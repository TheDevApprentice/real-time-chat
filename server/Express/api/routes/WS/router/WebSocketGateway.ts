import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { Logger } from "../../../../utils/Logger";
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
} from "../../../middleware/validation";
import { WsRouter } from "./WsRouter";
import { AuthWsController } from "../controllers/AuthWsController";
import { RoomsWsController } from "../controllers/RoomsWsController";
import { MessagesWsController } from "../controllers/MessagesWsController";
import { FriendsWsController } from "../controllers/FriendsWsController";
import { CallsWsController } from "../controllers/CallsWsController";
import { WsContext } from "./WsContext";
import { validate } from "../middlewares/validate";
import { rateLimitRedisPerUser, rateLimitRedisPerSocket, rateLimitRedisByIp } from "../middlewares/rateLimitRedis";
import { requireAuth } from "../middlewares/requireAuth";
import { bruteForceRedis } from "../middlewares/bruteForceRedis";
import { requireCsrf } from "../middlewares/requireCsrf";
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

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: process.env.FRONTEND_URL, credentials: true },
    });
    this.router = new WsRouter();
    this.authCtrl = new AuthWsController();
    this.roomsCtrl = new RoomsWsController();
    this.messagesCtrl = new MessagesWsController();
    this.friendsCtrl = new FriendsWsController();
    this.callsCtrl = new CallsWsController();
    this.registerRoutes();
    this.handleConnections();
  }

  private registerRoutes(): void {
    if (this.routerInitialized) return;

    // Auth events
    this.router.register(
      "authenticate",
      validate(WsAuthenticateSchema),
      async (ctx: WsContext<z.infer<typeof WsAuthenticateSchema>>) => this.authCtrl.authenticate(ctx)
    );

    // Calls (Phase 1: signaling scaffolding)
    this.router.register(
      "callRequest",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:request", 20, 60),
      validate(WsCallRequestSchema),
      async (ctx: WsContext<z.infer<typeof WsCallRequestSchema>>) => this.callsCtrl.callRequest(ctx)
    );
    this.router.register(
      "callAccept",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:accept", 60, 60),
      validate(WsCallAcceptSchema),
      async (ctx: WsContext<z.infer<typeof WsCallAcceptSchema>>) => this.callsCtrl.callAccept(ctx)
    );
    this.router.register(
      "callDecline",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:decline", 60, 60),
      validate(WsCallDeclineSchema),
      async (ctx: WsContext<z.infer<typeof WsCallDeclineSchema>>) => this.callsCtrl.callDecline(ctx)
    );
    this.router.register(
      "callCancel",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:cancel", 60, 60),
      validate(WsCallCancelSchema),
      async (ctx: WsContext<z.infer<typeof WsCallCancelSchema>>) => this.callsCtrl.callCancel(ctx)
    );
    this.router.register(
      "callOffer",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:offer", 120, 60),
      validate(WsCallOfferSchema),
      async (ctx: WsContext<z.infer<typeof WsCallOfferSchema>>) => this.callsCtrl.callOffer(ctx)
    );
    this.router.register(
      "callAnswer",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:answer", 120, 60),
      validate(WsCallAnswerSchema),
      async (ctx: WsContext<z.infer<typeof WsCallAnswerSchema>>) => this.callsCtrl.callAnswer(ctx)
    );
    this.router.register(
      "callIceCandidate",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:ice", 600, 10),
      validate(WsCallIceSchema),
      async (ctx: WsContext<z.infer<typeof WsCallIceSchema>>) => this.callsCtrl.callIceCandidate(ctx)
    );
    this.router.register(
      "callHangup",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("call:hangup", 120, 60),
      validate(WsCallHangupSchema),
      async (ctx: WsContext<z.infer<typeof WsCallHangupSchema>>) => this.callsCtrl.callHangup(ctx)
    );

    // TURN/STUN config for clients
    this.router.register(
      "getTurnConfig",
      requireAuth(),
      rateLimitRedisPerUser("call:getTurnConfig", 60, 60),
      async (ctx: WsContext) => this.callsCtrl.getTurnConfig(ctx)
    );

    // History pagination
    this.router.register(
      "loadRoomHistory",
      requireAuth(),
      rateLimitRedisPerUser("chat:loadHistory", 120, 60),
      async (ctx: WsContext<{ roomId: string; cursor?: number; size?: number }>) => this.roomsCtrl.loadRoomHistory(ctx)
    );

    // Aggregations: top active rooms
    this.router.register(
      "getTopActiveRooms",
      requireAuth(),
      rateLimitRedisPerUser("chat:topActive", 60, 60),
      async (ctx: WsContext<{ limit?: number }>) => this.roomsCtrl.getTopActiveRooms(ctx)
    );

    // Aggregations: last message for a room
    this.router.register(
      "getRoomLastMessage",
      requireAuth(),
      rateLimitRedisPerUser("chat:lastMessage", 240, 60),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.getRoomLastMessage(ctx)
    );

    // Leaderboard: active users top
    this.router.register(
      "getActiveUsersTop",
      requireAuth(),
      rateLimitRedisPerUser("chat:activeUsersTop", 60, 60),
      async (ctx: WsContext<{ limit?: number }>) => this.roomsCtrl.getActiveUsersTop(ctx)
    );

    // Aggregation: room message counts
    this.router.register(
      "getRoomMessageCounts",
      requireAuth(),
      rateLimitRedisPerUser("chat:roomMsgCounts", 120, 60),
      async (ctx: WsContext<{ roomId: string; range?: 'hour' | 'day'; from?: number; to?: number }>) => this.roomsCtrl.getRoomMessageCounts(ctx)
    );
    this.router.register(
      "login",
      rateLimitRedisByIp("auth:login", 10, 60),
      validate(WsLoginSchema),
      bruteForceRedis<z.infer<typeof WsLoginSchema>>({
        action: "login",
        keyFrom: (ctx: WsContext<z.infer<typeof WsLoginSchema>>) => ctx.payload?.username || ctx.socket.data?.userId || "unknown",
        maxAttempts: 5,
      }),
      async (ctx: WsContext<z.infer<typeof WsLoginSchema>>) => this.authCtrl.login(ctx)
    );
    this.router.register(
      "refreshToken",
      rateLimitRedisByIp("auth:refresh", 20, 60),
      validate(WsRefreshTokenSchema),
      bruteForceRedis<z.infer<typeof WsRefreshTokenSchema>>({
        action: "refresh",
        keyFrom: (ctx: WsContext<z.infer<typeof WsRefreshTokenSchema>>) =>
          ctx.payload?.refreshToken || (ctx.socket.data as any)?.userId || "unknown",
        maxAttempts: 10,
      }),
      async (ctx: WsContext<z.infer<typeof WsRefreshTokenSchema>>) => this.authCtrl.refreshToken(ctx)
    );
    this.router.register(
      "logout",
      requireAuth(),
      requireCsrf(),
      async (ctx: WsContext<{ token: string }>) => this.authCtrl.logout(ctx)
    );
    this.router.register("getSessions", requireAuth(), async (ctx: WsContext) => this.authCtrl.getSessions(ctx));
    this.router.register(
      "revokeSession",
      requireAuth(),
      requireCsrf(),
      async (ctx: WsContext<{ token: string }>) => this.authCtrl.revokeSession(ctx)
    );
    this.router.register(
      "logoutAll",
      requireAuth(),
      requireCsrf(),
      async (ctx: WsContext) => this.authCtrl.logoutAll(ctx)
    );

    // Rooms events
    this.router.register(
      "createRoom",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:createRoom", 10, 60),
      validate(WsCreateRoomSchema),
      async (ctx: WsContext<z.infer<typeof WsCreateRoomSchema>>) => this.roomsCtrl.createRoom(ctx)
    );
    this.router.register("getRooms", requireAuth(), async (ctx: WsContext) => this.roomsCtrl.getRooms(ctx));
    this.router.register(
      "joinRoom",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:joinRoom", 20, 60),
      validate(WsJoinRoomSchema),
      async (ctx: WsContext<z.infer<typeof WsJoinRoomSchema>>) => this.roomsCtrl.joinRoom(ctx)
    );

    // Typing indicators
    this.router.register(
      "typingStart",
      requireAuth(),
      requireCsrf(),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.typingStart(ctx)
    );
    this.router.register(
      "typingStop",
      requireAuth(),
      requireCsrf(),
      async (ctx: WsContext<{ roomId: string }>) => this.roomsCtrl.typingStop(ctx)
    );

    // Messages events
    this.router.register(
      "sendMessageToRoom",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:sendMessage", 60, 10),
      validate(WsSendMessageSchema),
      async (ctx: WsContext<z.infer<typeof WsSendMessageSchema>>) => this.messagesCtrl.sendMessageToRoom(ctx)
    );
    this.router.register(
      "messageEdit",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:messageEdit", 60, 10),
      validate(WsMessageEditSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageEditSchema>>) => this.messagesCtrl.messageEdit(ctx)
    );
    this.router.register(
      "messageDelete",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:messageDelete", 60, 10),
      validate(WsMessageDeleteSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageDeleteSchema>>) => this.messagesCtrl.messageDelete(ctx)
    );
    this.router.register(
      "messageUndo",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:messageUndo", 60, 10),
      validate(WsMessageUndoSchema),
      async (ctx: WsContext<z.infer<typeof WsMessageUndoSchema>>) => this.messagesCtrl.messageUndo(ctx)
    );
    this.router.register(
      "getUndoTTL",
      requireAuth(),
      rateLimitRedisPerUser("chat:getUndoTTL", 240, 10),
      validate(WsUndoTtlSchema),
      async (ctx: WsContext<z.infer<typeof WsUndoTtlSchema>>) => this.messagesCtrl.getUndoTTL(ctx)
    );
    this.router.register(
      "messageDelivered",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:msgDelivered", 120, 60),
      async (ctx: WsContext) => this.messagesCtrl.messageDelivered(ctx)
    );
    this.router.register(
      "messageRead",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("chat:msgRead", 120, 60),
      async (ctx: WsContext) => this.messagesCtrl.messageRead(ctx)
    );

    // Friends events
    this.router.register(
      "friendRequest",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("friend:request", 30, 60),
      async (ctx: WsContext) => this.friendsCtrl.friendRequest(ctx)
    );
    this.router.register(
      "friendRespond",
      requireAuth(),
      requireCsrf(),
      rateLimitRedisPerUser("friend:respond", 60, 60),
      async (ctx: WsContext) => this.friendsCtrl.friendRespond(ctx)
    );
    this.router.register(
      "friendList",
      requireAuth(),
      rateLimitRedisPerUser("friend:list", 60, 60),
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
