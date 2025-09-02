import { Router, Request, Response } from "express";
import { DatabaseService } from "../utils/DatabaseService";
import { bruteForceGuard } from "../utils/BruteForceGuard";


const router = Router();

// Centralized rate limiter
const rateLimit = (
  routeKey: string,
  maxReq = 50,
  windowMs = 15 * 60 * 1000
) => bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Get all rooms
router.get("/rooms", rateLimit("chat:getRooms", 200), async (req: Request, res: Response) => {
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
router.post("/rooms", rateLimit("chat:createRoom", 30), async (req: Request, res: Response) => {
  try {
    const { name, creatorId } = req.body;
    if (!name || !creatorId) {
      return res.status(400).json({ error: "name and creatorId are required" });
    }
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const Room = (await import("../models/Room")).Room;
    const room = new Room(name, creatorId);
    await db.addRoom(room);
    res.status(201).json(room.toJSON());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Join a room
router.post("/rooms/:roomId/join", rateLimit("chat:joinRoom", 120), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const { roomId } = req.params;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "userId and roomId are required" });
    }
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    await db.addUserToRoom(userId, roomId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get messages for a room
router.get("/rooms/:roomId/messages", rateLimit("chat:getMessages", 200), async (req: Request, res: Response) => {
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
router.get("/rooms/:roomId/users", rateLimit("chat:getRoomUsers", 200), async (req: Request, res: Response) => {
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
