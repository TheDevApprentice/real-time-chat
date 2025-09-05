import { Router, Request, Response } from "express";
import { DatabaseService } from "../../../services/DatabaseService";
import { bruteForceGuard } from "../../../utils/BruteForceGuard";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import {
  SearchUsersQuerySchema,
} from "../../../utils/validation";
import { validateQuery, RequestWithValidated } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateParams } from "../middleware/validate";
import { RoomIdParamsSchema } from "../../../utils/validation";

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
    const db = DatabaseService.getInstance();
    const rooms = await db.getRooms();
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
    const db = DatabaseService.getInstance();
    const users = await db.searchUsersByName(q, limit ?? 20);
    res.json(users.map((u) => u.toJSON()));
  })
);

// Get messages for a room
router.get(
  "/rooms/:roomId/messages",
  rateLimit("chat:getMessages", 200),
  validateParams(RoomIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const db = DatabaseService.getInstance();
    const { roomId } = req.params;
    const messages = await db.getMessagesForRoom(roomId);
    res.json(messages.map((m) => m.toJSON()));
  })
);

// Get users for a room
router.get(
  "/rooms/:roomId/users",
  rateLimit("chat:getRoomUsers", 200),
  validateParams(RoomIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const db = DatabaseService.getInstance();
    const { roomId } = req.params;
    const users = await db.getUsersForRoom(roomId);
    res.json(users.map((u) => u.toJSON()));
  })
);

export default router;
