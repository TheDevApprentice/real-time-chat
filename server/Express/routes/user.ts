import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";
import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { DatabaseService } from "../services/DatabaseService";
import { bruteForceGuard } from "../utils/BruteForceGuard";

const router = Router();

// Centralized rate limiter
const rateLimit = (
  routeKey: string,
  maxReq = 50,
  windowMs = 15 * 60 * 1000
) => bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Get all users
router.get("/users", rateLimit("user:getUsers", 200), async (req: Request, res: Response) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance();
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
  rateLimit("user:getSessions", 60),
  async (req: AuthenticatedRequest, res) => {
    try {
      const db = DatabaseService.getInstance();
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
router.get("/sessions/:token", rateLimit("user:getSessionByToken", 120), async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
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
  rateLimit("user:deleteSession", 30),
  async (req: AuthenticatedRequest, res) => {
    try {
      const db = DatabaseService.getInstance();
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      const session = await db.getUserSessionByToken(req.params.token);
      if (!session || session.userId !== req.user.id) {
        return res
          .status(404)
          .json({ error: "Session not found or not owned." });
      }
      await db.deleteUserSession(req.params.token);
      // If the deleted session corresponds to the current cookie, clear it to avoid stale cookies
      const cookies = (req as any).cookies || {};
      const legacyToken = cookies["session_token"];
      const hostToken = cookies["__Host-session"];
      const isProd = process.env.NODE_ENV === "production";
      if (legacyToken && legacyToken === req.params.token) {
        res.clearCookie("session_token", {
          httpOnly: true,
          sameSite: "lax",
          secure: isProd,
          path: "/",
        });
      }
      if (hostToken && hostToken === req.params.token) {
        res.clearCookie("__Host-session", {
          httpOnly: true,
          sameSite: "lax",
          secure: isProd,
          path: "/",
        });
      }
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
  rateLimit("user:deleteAllSessions", 10),
  async (req: AuthenticatedRequest, res) => {
    try {
      const db = DatabaseService.getInstance();
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      await db.deleteAllUserSessionsByUserId(req.user.id);
      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("session_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
      });
      res.clearCookie("__Host-session", {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Logout all failed." });
    }
  }
);

export default router;
