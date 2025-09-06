import { Router, Request, Response } from "express";
import { bruteForceGuard } from "../../../middleware/BruteForceGuard";
import { authMiddleware, AuthenticatedRequest } from "../../../middleware/auth";
import {
  SearchUsersQuerySchema,
} from "../../../middleware/validation";
import { validateQuery, RequestWithValidated, validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateParams } from "../middleware/validate";
import { RoomIdParamsSchema, InviteCreateBodySchema } from "../../../middleware/validation";
import { getServices } from "../../../di/container";
import { K, TTL, incrWithTtl } from "../../../cache/cacheKeys";
import { Message, User } from "../../../../domain/entities";
import { randomUUID } from "crypto";

const router = Router();

// Centralized rate limiter
const rateLimit = (routeKey: string, maxReq = 50, windowMs = 15 * 60 * 1000) =>
  bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Require authentication for all chat routes
router.use(authMiddleware);

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

// --- Invites ---
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
    const { redisService } = getServices() as any;
    const token = String(req.params.token || "");
    if (!token) return res.status(400).json({ error: "Missing token" });
    try {
      const raw = await redisService.getDel(K.invite(token));
      if (!raw) return res.status(404).json({ error: "Invalid or expired invite" });
      const payload = JSON.parse(raw);
      return res.json({ token, payload });
    } catch {
      return res.status(404).json({ error: "Invalid or expired invite" });
    }
  })
);

export default router;
