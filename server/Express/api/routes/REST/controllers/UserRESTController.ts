import { AuthenticatedRequest, authRESTMiddleware } from "../middleware/authRESTMiddleware";
import { Router, Request, Response } from "express";
import { User } from "../../../../domain/entities/User";
import { mapUserToDTO, mapSessionToDTO } from "../../../../domain/dto";
import { rateLimitRedisRESTMiddleware } from "../middleware/rateLimitRedisRESTMiddleware";
import { TTL } from "../../../cache/cacheKeys";
import { asyncHandlerRESTMiddleware } from "../middleware/asyncHandlerRESTMiddleware";
import { validateRESTMiddlewareParams } from "../middleware/validateRESTMiddleware";
import { SessionTokenParamsSchema } from "../../../../utils/ValidationUtil";
import { getServices } from "../../../di/container";
import { bruteForceRedisRESTMiddleware } from "../middleware/bruteForceRedisRESTMiddleware";

const router = Router();

// Redis-backed, cluster-safe rate limiter
const rateLimitMiddleware = (routeKey: string, maxReq = 50, windowSec = TTL.rateWindowAuth) =>
  rateLimitRedisRESTMiddleware(routeKey, maxReq, windowSec);

// Get all users
router.get(
  "/users",
  rateLimitMiddleware("user:getUsers", 200),
  asyncHandlerRESTMiddleware(async (_req: Request, res: Response) => {
    const { userService } = getServices();
    const users: User[] = await userService.getUsers();
    res.json(users.map((u: User) => mapUserToDTO(u)));
  })
);

// Lister toutes les sessions utilisateur courant
router.get(
  "/sessions",
  authRESTMiddleware,
  rateLimitMiddleware("user:getSessions", 60),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res) => {
    const { authService } = getServices();
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    const sessions = await authService.getUserSessionsByUserId(req.user.id);
    res.json(sessions.map((s) => mapSessionToDTO(s)));
  })
);

// Récupérer une session par token
router.get(
  "/sessions/:token",
  rateLimitMiddleware("user:getSessionByToken", 120),
  bruteForceRedisRESTMiddleware({
    action: "getSessionByToken",
    keyFrom: (req) => String(req.params.token || req.ip || "unknown"),
    maxAttempts: 20,
  }),
  validateRESTMiddlewareParams(SessionTokenParamsSchema),
  asyncHandlerRESTMiddleware(async (req, res) => {
    const { authService } = getServices();
    const session = await authService.getUserSessionByToken(req.params.token);
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json(mapSessionToDTO(session));
  })
);

// Supprimer une session par token (si elle appartient à l'utilisateur)
router.delete(
  "/sessions/:token",
  authRESTMiddleware,
  rateLimitMiddleware("user:deleteSession", 30),
  bruteForceRedisRESTMiddleware({
    action: "deleteSession",
    keyFrom: (req) => String(req.params.token || req.ip || "unknown"),
    maxAttempts: 20,
  }),
  validateRESTMiddlewareParams(SessionTokenParamsSchema),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res) => {
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
  authRESTMiddleware,
  rateLimitMiddleware("user:deleteAllSessions", 10),
  bruteForceRedisRESTMiddleware({
    action: "deleteAllSessions",
    keyFrom: (req) => String((req as any)?.user?.id || req.ip || "unknown"),
    maxAttempts: 10,
  }),
  asyncHandlerRESTMiddleware(async (req: AuthenticatedRequest, res) => {
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
  rateLimitMiddleware("user:getPresence", 300),
  asyncHandlerRESTMiddleware(async (req: Request, res: Response) => {
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
