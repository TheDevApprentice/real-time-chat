import { Router, Request, Response } from "express";
import { DatabaseService } from "../utils/DatabaseService";

require("@dotenvx/dotenvx").config();
const sqliteFile = process.env.SQLITE_FILE;
if (!sqliteFile) {
  throw new Error("SQLITE_FILE environment variable is not defined");
}
const db = DatabaseService.getInstance(sqliteFile);
const router = Router();

// Get welcome
router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the chat API" });
});

// Get all rooms
router.get("/rooms", async (req: Request, res: Response) => {
  try {
    const rooms = await db.getRooms();
    res.json(rooms.map((r) => r.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create a room
router.post("/rooms", async (req: Request, res: Response) => {
  try {
    const { name, creatorId } = req.body;
    if (!name || !creatorId) {
      return res.status(400).json({ error: "name and creatorId are required" });
    }
    const Room = (await import("../models/Room")).Room;
    const room = new Room(name, creatorId);
    await db.addRoom(room);
    res.status(201).json(room.toJSON());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Join a room
router.post("/rooms/:roomId/join", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const { roomId } = req.params;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "userId and roomId are required" });
    }
    await db.addUserToRoom(userId, roomId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get messages for a room
router.get("/rooms/:roomId/messages", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await db.getMessagesForRoom(roomId);
    res.json(messages.map((m) => m.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get users for a room
router.get("/rooms/:roomId/users", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const users = await db.getUsersForRoom(roomId);
    res.json(users.map((u) => u.toJSON()));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
