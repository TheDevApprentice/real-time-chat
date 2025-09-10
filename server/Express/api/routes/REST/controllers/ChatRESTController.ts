import { Router, Request, Response } from "express";
import { rateLimitRedisRESTMiddleware } from "../middleware/rateLimitRedisRESTMiddleware";
import { bruteForceRedisRESTMiddleware } from "../middleware/bruteForceRedisRESTMiddleware";
import { authRESTMiddleware, AuthenticatedRequest } from "../middleware/authRESTMiddleware";
import {
  SearchUsersQuerySchema,
} from "../../../../utils/ValidationUtil";
import { validateRESTMiddlewareQuery, RequestWithValidated, validateRESTMiddlewareBody, validateRESTMiddlewareParams } from "../middleware/validateRESTMiddleware";
import { asyncHandlerRESTMiddleware } from "../middleware/asyncHandlerRESTMiddleware";
import { RoomIdParamsSchema, InviteCreateBodySchema, MessageIdParamsSchema, MessageEditBodySchema, MessageDeleteBodySchema, MessageUndoBodySchema } from "../../../../utils/ValidationUtil";
import { getServices } from "../../../di/container";
import { K, TTL, incrWithTtl, jsonGet } from "../../../cache/cacheKeys";
import { Message, User } from "../../../../domain/entities";
import { mapUserToDTO, mapRoomToDTO, mapMessageToDTO } from "../../../../domain/dto";
import { randomUUID } from "crypto";
// Note: invites use Redis-only tokens (no cross-instance signing)

const router = Router();

// Redis-backed, cluster-safe rate limiter
const rateLimitMiddleware = (routeKey: string, maxReq = 50, windowSec = TTL.rateWindowAuth) =>
  rateLimitRedisRESTMiddleware(routeKey, maxReq, windowSec);

// Require authentication for all chat routes
router.use(authRESTMiddleware);

// Undo last edit/delete if a snapshot exists for this user (10 min window)
router.post(
  "/messages/:messageId/undo",
  rateLimitMiddleware("chat:undoMessage", 120),
  bruteForceRedisRESTMiddleware({
    action: "chat:undoMessage",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 60,
  }),
  validateRESTMiddlewareParams(MessageIdParamsSchema),
  validateRESTMiddlewareBody(MessageUndoBodySchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { messageService, redisService } = getServices() as any;
    const me = (req as any).user as { id: string } | undefined;
    if (!me?.id) return res.status(401).json({ error: "Not authenticated" });
    const messageId = (req as any).validated.params.messageId as number;
    const { roomId } = (req as any).validated.body as { roomId: string };
    const snap = await jsonGet<{ roomId: string; messageId: number; prevContent: string }>(
      redisService,
      K.msgUndo(me.id, messageId)
    );
    if (!snap || snap.roomId !== roomId) return res.status(404).json({ error: "Nothing to undo" });
    const prev = String(snap.prevContent || "").slice(0, 2000);
    await messageService.updateMessageContent(messageId, prev);
    try { await redisService.del(K.msgUndo(me.id, messageId)); } catch {}
    try { req.app.get("io")?.to(roomId)?.emit("messageEdited", { roomId, messageId, content: prev }); } catch {}
    res.json({ success: true });
  })
);

// (rateLimit and authRESTMiddleware defined above)

// Edit a message (author only)
router.patch(
  "/messages/:messageId",
  rateLimitMiddleware("chat:editMessage", 100),
  bruteForceRedisRESTMiddleware({
    action: "chat:editMessage",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 100,
  }),
  validateRESTMiddlewareParams(MessageIdParamsSchema),
  validateRESTMiddlewareBody(MessageEditBodySchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { messageService, roomService } = getServices() as any;
    const me = (req as any).user as { id: string } | undefined;
    if (!me?.id) return res.status(401).json({ error: "Not authenticated" });
    const messageId = (req as any).validated.params.messageId as number;
    const { roomId, content } = (req as any).validated.body as { roomId: string; content: string };
    const orig = await messageService.getMessageById(messageId);
    if (!orig) return res.status(404).json({ error: "Message not found" });
    if (orig.author?.id !== me.id) return res.status(403).json({ error: "Only author can edit" });
    const clean = content; // already validated & length-checked; server-side sanitization occurs in WS path; here keep simple
    await messageService.updateMessageContent(messageId, clean);
    try { req.app.get("io")?.to(roomId)?.emit("messageEdited", { roomId, messageId, content: clean }); } catch {}
    res.json({ success: true });
  })
);

// Delete a message (author or room owner)
router.delete(
  "/messages/:messageId",
  rateLimitMiddleware("chat:deleteMessage", 100),
  bruteForceRedisRESTMiddleware({
    action: "chat:deleteMessage",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 100,
  }),
  validateRESTMiddlewareParams(MessageIdParamsSchema),
  validateRESTMiddlewareBody(MessageDeleteBodySchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { messageService, roomService } = getServices() as any;
    const me = (req as any).user as { id: string } | undefined;
    if (!me?.id) return res.status(401).json({ error: "Not authenticated" });
    const messageId = (req as any).validated.params.messageId as number;
    const { roomId } = (req as any).validated.body as { roomId: string };
    const orig = await messageService.getMessageById(messageId);
    if (!orig) return res.status(404).json({ error: "Message not found" });
    let allowed = orig.author?.id === me.id;
    if (!allowed) {
      try { const room = await roomService.getRoomById(roomId); allowed = room && room.creatorId === me.id; } catch {}
    }
    if (!allowed) return res.status(403).json({ error: "Not allowed" });
    await messageService.softDeleteMessage(messageId);
    try { req.app.get("io")?.to(roomId)?.emit("messageDeleted", { roomId, messageId }); } catch {}
    res.json({ success: true });
  })
);

// (moved rateLimit and authRESTMiddleware to top so they apply to all routes)

// Get all rooms
router.get(
  "/rooms",
  rateLimitMiddleware("chat:getRooms", 200),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { roomService } = getServices();
    const rooms = await roomService.getRooms();
    res.json(rooms.map((r) => mapRoomToDTO(r)));
  })
);

// Search users by name (for search bar)
router.get(
  "/users/search",
  rateLimitMiddleware("chat:searchUsers", 150),
  bruteForceRedisRESTMiddleware({
    action: "chat:searchUsers",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 200,
  }),
  validateRESTMiddlewareQuery(SearchUsersQuerySchema),
  asyncHandlerRESTMiddleware(async (
    req: RequestWithValidated<any, any, any>,
    res: Response
  ) => {
    const { q, limit } = (req.validated!.query as any)!;
    const { userService, redisService } = getServices() as any;
    const me = (req as any).user as { id: string } | undefined;
    const userId = me?.id || "anonymous";

    // Per-user soft rate limit (e.g., 20 requests / 20s)
    try {
      const rlKey = K.rlSearch(userId);
      const c = await incrWithTtl(redisService, rlKey, TTL.rateWindowSearch, 1);
      if (c > 20) {
        return res.status(429).json({ error: "Too many search requests. Please slow down." });
      }
    } catch {}

    const lim = Number(limit ?? 20) || 20;
    const key = K.search(userId, String(q || ""), lim);
    try {
      const cached = await redisService?.get?.(key);
      if (cached) {
        try { await redisService.incrBy(K.statsHit('searchUsers')); } catch {}
        return res.json(JSON.parse(cached));
      }
    } catch {}

    const users = await userService.searchUsersByName(q, lim);
    const payload = users.map((u: User) => mapUserToDTO(u));
    try {
      await redisService?.set?.(key, JSON.stringify(payload), { EX: TTL.searchShort });
    } catch {}
    try { await redisService.incrBy(K.statsMiss('searchUsers')); } catch {}
    res.json(payload);
  })
);

// Get messages for a room
router.get(
  "/rooms/:roomId/messages",
  rateLimitMiddleware("chat:getMessages", 200),
  validateRESTMiddlewareParams(RoomIdParamsSchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { messageService } = getServices();
    const { roomId } = req.params;
    const messages = await messageService.getMessagesForRoom(roomId);
    res.json(messages.map((m: Message) => mapMessageToDTO(m)));
  })
);

// Get users for a room
router.get(
  "/rooms/:roomId/users",
  rateLimitMiddleware("chat:getRoomUsers", 200),
  validateRESTMiddlewareParams(RoomIdParamsSchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { roomService } = getServices();
    const { roomId } = req.params;
    const users = await roomService.getUsersForRoom(roomId);
    res.json(users.map((u: User) => mapUserToDTO(u)));
  })
);

// --- Invites (Redis-only) ---
// Create an invite token with minimal payload stored in Redis (EX 600s)
router.post(
  "/invite",
  rateLimitMiddleware("chat:createInvite", 60),
  bruteForceRedisRESTMiddleware({
    action: "chat:createInvite",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 60,
  }),
  validateRESTMiddlewareBody(InviteCreateBodySchema),
  asyncHandlerRESTMiddleware(async (req: RequestWithValidated<{ roomId: string; invitedUserId?: string; role?: string }>, res: Response) => {
    const { redisService, roomService } = getServices() as any;
    const { roomId, invitedUserId, role } = (req.validated!.body as any);
    const me = (req as any).user as { id: string } | undefined;
    if (!me?.id) return res.status(401).json({ error: "Not authenticated" });
    // Validate room existence and access
    const room = await roomService.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.isPublic) {
      const isMember = await roomService.isUserInRoom(me.id, roomId);
      if (!isMember && room.creatorId !== me.id) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const token = randomUUID();
    const payload = { roomId, ...(invitedUserId ? { invitedUserId } : {}), ...(role ? { role } : {}) };
    try {
      await redisService.set(K.invite(token), JSON.stringify(payload), { EX: TTL.invite });
    } catch {}
    res.json({ token, expiresIn: TTL.invite });
  })
);

// Consume an invite token (one-time): returns the stored payload and deletes the key
router.get(
  "/invite/:token",
  rateLimitMiddleware("chat:consumeInvite", 120),
  bruteForceRedisRESTMiddleware({
    action: "chat:consumeInvite",
    keyFrom: (req) => String(req.params.token || req.ip || "unknown"),
    maxAttempts: 120,
  }),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res: Response) => {
    const { redisService, roomService } = getServices() as any;
    const token = String(req.params.token || "");
    if (!token) return res.status(400).json({ error: "Missing token" });
    const me = (req as any).user as { id: string } | undefined;
    if (!me?.id) return res.status(401).json({ error: "Not authenticated" });
    // 1) Try legacy Redis-based token first (backward compatibility)
    try {
      const raw = await redisService.getDel(K.invite(token));
      if (raw) {
        const payload = JSON.parse(raw);
        const roomId = String(payload?.roomId || "");
        if (!roomId) return res.status(404).json({ error: "Invalid or expired invite" });
        try { await roomService.addUserToRoom(me.id, roomId); } catch {}
        try { await redisService.del(K.roomsVisible(me.id)); } catch {}
        return res.json({ token, payload: { roomId } });
      }
    } catch {}
      // No portable token: if not found in Redis, we consider it invalid/expired
    return res.status(404).json({ error: "Invalid or expired invite" });
  })
);

export default router;
