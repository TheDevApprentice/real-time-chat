import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { DatabaseService } from "../utils/DatabaseService";

require("@dotenvx/dotenvx").config();
const sqliteFile = process.env.SQLITE_FILE;
if (!sqliteFile) {
  throw new Error("SQLITE_FILE environment variable is not defined");
}
const db = DatabaseService.getInstance(sqliteFile);
const router = Router();

// Get all users
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users: User[] = await db.getUsers();
    res.json(users.map((u: User) => u.toJSON()));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Lister toutes les sessions utilisateur courant
router.get(
  "/sessions",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const dbFile = process.env.SQLITE_FILE;
      if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
      const db = DatabaseService.getInstance(dbFile);
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      const sessions = await db.getUserSessionsByUserId(req.user.id);
      res.json(sessions.map((s) => s.toJSON()));
    } catch (err) {
      res.status(500).json({ error: "Failed to get sessions." });
    }
  }
);

// Récupérer une session par token
router.get("/sessions/:token", async (req, res) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const session = await db.getUserSessionByToken(req.params.token);
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json(session.toJSON());
  } catch (err) {
    res.status(500).json({ error: "Failed to get session." });
  }
});

// Supprimer une session par token (si elle appartient à l'utilisateur)
router.delete(
  "/sessions/:token",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const dbFile = process.env.SQLITE_FILE;
      if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
      const db = DatabaseService.getInstance(dbFile);
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      const session = await db.getUserSessionByToken(req.params.token);
      if (!session || session.userId !== req.user.id) {
        return res
          .status(404)
          .json({ error: "Session not found or not owned." });
      }
      await db.deleteUserSession(req.params.token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete session." });
    }
  }
);

// Supprimer toutes les sessions de l'utilisateur courant (logout all)
router.delete(
  "/sessions",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const dbFile = process.env.SQLITE_FILE;
      if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
      const db = DatabaseService.getInstance(dbFile);
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      await db.deleteAllUserSessionsByUserId(req.user.id);
      res.clearCookie("session_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Logout all failed." });
    }
  }
);

export default router;
