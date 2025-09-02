import { Router, Request, Response } from "express";
import { DatabaseService } from "../utils/DatabaseService";
import { bruteForceGuard } from "../utils/BruteForceGuard";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { CreateRoomSchema, JoinRoomParamsSchema, parseOrThrow, ValidationHttpError } from "../utils/validation";


const router = Router();

// Centralized rate limiter
const rateLimit = (
  routeKey: string,
  maxReq = 50,
  windowMs = 15 * 60 * 1000
) => bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Require authentication for all chat routes
router.use(authMiddleware);

// Get all rooms
router.get("/rooms", rateLimit("chat:getRooms", 200), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const rooms = await db.getRooms();
    res.json(rooms.map((r) => r.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create a room
router.post("/rooms", rateLimit("chat:createRoom", 30), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = parseOrThrow(CreateRoomSchema, req.body);
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const Room = (await import("../models/Room")).Room;
    const creatorId = req.user!.id;
    const room = new Room(name, creatorId);
    await db.addRoom(room);
    res.status(201).json(room.toJSON());
  } catch (err) {
    if (err instanceof ValidationHttpError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

// Join a room
router.post("/rooms/:roomId/join", rateLimit("chat:joinRoom", 120), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId } = parseOrThrow(JoinRoomParamsSchema, req.params);
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const userId = req.user!.id;
    await db.addUserToRoom(userId, roomId);
    res.status(200).json({ success: true });
  } catch (err) {
    if (err instanceof ValidationHttpError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get messages for a room
router.get("/rooms/:roomId/messages", rateLimit("chat:getMessages", 200), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const { roomId } = req.params;
    const messages = await db.getMessagesForRoom(roomId);
    res.json(messages.map((m) => m.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get users for a room
router.get("/rooms/:roomId/users", rateLimit("chat:getRoomUsers", 200), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const { roomId } = req.params;
    const users = await db.getUsersForRoom(roomId);
    res.json(users.map((u) => u.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
