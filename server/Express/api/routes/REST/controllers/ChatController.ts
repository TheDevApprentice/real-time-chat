import { Router, Request, Response } from "express";
import { bruteForceGuard } from "../../../middleware/BruteForceGuard";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import {
  SearchUsersQuerySchema,
} from "../../../middleware/validation";
import { validateQuery, RequestWithValidated, validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateParams } from "../middleware/validate";
import { RoomIdParamsSchema, InviteCreateBodySchema, MessageIdParamsSchema, MessageEditBodySchema, MessageDeleteBodySchema, MessageUndoBodySchema } from "../../../middleware/validation";
import { getServices } from "../../../di/container";
import { K, TTL, incrWithTtl, jsonGet } from "../../../cache/cacheKeys";
import { Message, User } from "../../../../domain/entities";
import { randomUUID } from "crypto";
// Note: invites use Redis-only tokens (no cross-instance signing)

const router = Router();

// Centralized rate limiter
const rateLimit = (routeKey: string, maxReq = 50, windowMs = 15 * 60 * 1000) =>
  bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Require authentication for all chat routes
router.use(authMiddleware);

// Undo last edit/delete if a snapshot exists for this user (10 min window)
router.post(
  "/messages/:messageId/undo",
  rateLimit("chat:undoMessage", 120),
  validateParams(MessageIdParamsSchema),
  validateBody(MessageUndoBodySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

// (rateLimit and authMiddleware defined above)

// Edit a message (author only)
router.patch(
  "/messages/:messageId",
  rateLimit("chat:editMessage", 100),
  validateParams(MessageIdParamsSchema),
  validateBody(MessageEditBodySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  rateLimit("chat:deleteMessage", 100),
  validateParams(MessageIdParamsSchema),
  validateBody(MessageDeleteBodySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

// (moved rateLimit and authMiddleware to top so they apply to all routes)

// Get all rooms
router.get(
  "/rooms",
  rateLimit("chat:getRooms", 200),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roomService } = getServices();
    const rooms = await roomService.getRooms();
    res.json(rooms.map((r) => r.toJSON()));
  })
);

// Search users by name (for search bar)
router.get(
  "/users/search",
  rateLimit("chat:searchUsers", 150),
  validateQuery(SearchUsersQuerySchema),
  asyncHandler(async (
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
    const payload = users.map((u: User) => u.toJSON());
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
  rateLimit("chat:getMessages", 200),
  validateParams(RoomIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { messageService } = getServices();
    const { roomId } = req.params;
    const messages = await messageService.getMessagesForRoom(roomId);
    res.json(messages.map((m: Message) => m.toJSON()));
  })
);

// Get users for a room
router.get(
  "/rooms/:roomId/users",
  rateLimit("chat:getRoomUsers", 200),
  validateParams(RoomIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roomService } = getServices();
    const { roomId } = req.params;
    const users = await roomService.getUsersForRoom(roomId);
    res.json(users.map((u: User) => u.toJSON()));
  })
);

// --- Invites (Redis-only) ---
// Create an invite token with minimal payload stored in Redis (EX 600s)
router.post(
  "/invite",
  rateLimit("chat:createInvite", 60),
  validateBody(InviteCreateBodySchema),
  asyncHandler(async (req: RequestWithValidated<{ roomId: string; invitedUserId?: string; role?: string }>, res: Response) => {
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
  rateLimit("chat:consumeInvite", 120),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
