import { AuthenticatedRequest, authMiddleware } from "../../../middleware/auth";
import { Router, Request, Response } from "express";
import { User } from "../../../../domain/entities/User";
import { bruteForceGuard } from "../../../middleware/BruteForceGuard";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateParams } from "../middleware/validate";
import { SessionTokenParamsSchema } from "../../../middleware/validation";
import { getServices } from "../../../di/container";

const router = Router();

// Centralized rate limiter
const rateLimit = (routeKey: string, maxReq = 50, windowMs = 15 * 60 * 1000) =>
  bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Get all users
router.get(
  "/users",
  rateLimit("user:getUsers", 200),
  asyncHandler(async (_req: Request, res: Response) => {
    const { userService } = getServices();
    const users: User[] = await userService.getUsers();
    res.json(users.map((u: User) => u.toJSON()));
  })
);

// Lister toutes les sessions utilisateur courant
router.get(
  "/sessions",
  authMiddleware,
  rateLimit("user:getSessions", 60),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { authService } = getServices();
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    const sessions = await authService.getUserSessionsByUserId(req.user.id);
    res.json(sessions.map((s) => s.toJSON()));
  })
);

// Récupérer une session par token
router.get(
  "/sessions/:token",
  rateLimit("user:getSessionByToken", 120),
  validateParams(SessionTokenParamsSchema),
  asyncHandler(async (req, res) => {
    const { authService } = getServices();
    const session = await authService.getUserSessionByToken(req.params.token);
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json(session.toJSON());
  })
);

// Supprimer une session par token (si elle appartient à l'utilisateur)
router.delete(
  "/sessions/:token",
  authMiddleware,
  rateLimit("user:deleteSession", 30),
  validateParams(SessionTokenParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { authService } = getServices();
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    const session = await authService.getUserSessionByToken(req.params.token);
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: "Session not found or not owned." });
    }
    await authService.deleteUserSession(req.params.token);
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
  })
);

// Supprimer toutes les sessions de l'utilisateur courant (logout all)
router.delete(
  "/sessions",
  authMiddleware,
  rateLimit("user:deleteAllSessions", 10),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { authService } = getServices();
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    await authService.deleteAllUserSessionsByUserId(req.user.id);
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
  })
);

// Presence / last-seen (public minimal endpoint)
router.get(
  "/presence/:userId",
  rateLimit("user:getPresence", 300),
  asyncHandler(async (req: Request, res: Response) => {
    const { redisService } = getServices();
    const userId = String(req.params.userId || "");
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    let status: "online" | "offline" = "offline";
    let lastSeen: number | null = null;
    try {
      const presence = await redisService.get(`presence:user:${userId}`);
      if (presence) status = "online";
      const ls = await redisService.get(`lastseen:user:${userId}`);
      if (ls) {
        const n = parseInt(ls, 10);
        lastSeen = Number.isFinite(n) ? n : null;
      }
    } catch {}
    res.json({ userId, status, lastSeen });
  })
);

export default router;
