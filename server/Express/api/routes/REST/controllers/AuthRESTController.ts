import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { User } from "../../../../domain/entities/User";
import { mapUserToDTO } from "../../../../domain/dto";
import { getServices } from "../../../di/container";
import { bruteForceRedisRESTMiddleware } from "../middleware/bruteForceRedisRESTMiddleware";
import { rateLimitRedisRESTMiddleware } from "../middleware/rateLimitRedisRESTMiddleware";
import { TTL } from "../../../cache/cacheKeys";
import { authRESTMiddleware, AuthenticatedRequest } from "../middleware/authRESTMiddleware";
import {
  RegisterSchema,
  RefreshTokenSchema
} from "../../../../utils/ValidationUtil";
import { validateRESTMiddlewareBody, RequestWithValidated } from "../middleware/validateRESTMiddleware";
import { asyncHandlerRESTMiddleware } from "../middleware/asyncHandlerRESTMiddleware";

const router = Router();

// Redis-backed, cluster-safe rate limiter for auth endpoints
const rateLimitMiddleware = (routeKey: string, maxReq = 50, windowSec = TTL.rateWindowAuth) =>
  rateLimitRedisRESTMiddleware(routeKey, maxReq, windowSec);

// Registration endpoint
router.post(
  "/register",
  rateLimitMiddleware("auth:register", 20),
  bruteForceRedisRESTMiddleware({
    action: "register",
    keyFrom: (req) => String((req.body as any)?.username || "unknown"),
  }),
  validateRESTMiddlewareBody(RegisterSchema),
  asyncHandlerRESTMiddleware(async (req: RequestWithValidated<any>, res) => {
    const { username, password } = (req.validated!.body as any)!;
    const { userService } = getServices();
    const users = await userService.getUsers();
    if (users.find((u) => u.name === username)) {
      return res.status(409).json({ error: "Username already exists." });
    }
    const cost = Number(process.env.BCRYPT_COST || 12);
    const hashed = await bcrypt.hash(password, isNaN(cost) ? 12 : cost);
    const newUser = new User(randomUUID(), username, hashed);
    await userService.addUser(newUser);
    res.status(201).json({ user: mapUserToDTO(newUser) });
  })
);

// --- SET SESSION COOKIE (HttpOnly) FROM TOKEN ---
// Allows frontend to exchange a bare token (obtained via WebSocket auth) for a secure HttpOnly cookie.
router.post(
  "/session-cookie",
  rateLimitMiddleware("auth:sessionCookie", 60),
  bruteForceRedisRESTMiddleware({
    action: "sessionCookie",
    keyFrom: (req) => String((req.body as any)?.token || req.ip || "unknown"),
  }),
  async (req: Request, res: Response) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "token is required." });
    try {
      const { authService } = getServices();
      const session = await authService.getUserSessionByToken(token);
      if (!session) return res.status(401).json({ error: "Invalid token." });
      // Set HttpOnly cookie: use hardened __Host-session only in production (requires Secure),
      // and legacy session_token in development (HTTP) for browser compatibility.
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        res.cookie("__Host-session", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });
      } else {
        res.cookie("session_token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to set session cookie." });
    }
  }
);

// --- CURRENT USER FROM COOKIE ---
router.get(
  "/me",
  authRESTMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      return res.json({ user: mapUserToDTO(req.user as any) });
    } catch (err) {
      return res.status(500).json({ error: "Failed to resolve current user." });
    }
  }
);

// --- REFRESH TOKEN ENDPOINT ---
router.post(
  "/refresh-token",
  rateLimitMiddleware("auth:refresh", 60),
  bruteForceRedisRESTMiddleware({
    action: "refresh",
    keyFrom: (req) => String((req.body as any)?.refreshToken || req.ip || "unknown"),
  }),
  validateRESTMiddlewareBody(RefreshTokenSchema),
  asyncHandlerRESTMiddleware(async (req: RequestWithValidated<any>, res) => {
    const { refreshToken } = (req.validated!.body as any)!;
    const { authService } = getServices();
    // Lookup direct par refresh token
    const session = await authService.getUserSessionByRefreshToken(refreshToken);
    if (!session) {
      return res.status(401).json({ error: "Invalid refresh token." });
    }
    if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt < Date.now()) {
      await authService.deleteUserSession(session.token);
      return res.status(401).json({ error: "Refresh token expired." });
    }
    // Rotation: supprimer l'ancienne session
    await authService.deleteUserSession(session.token);
    // Créer une nouvelle session
    const { randomUUID } = await import("crypto");
    const { UserSession } = await import("../../../../domain/entities/UserSession");
    const newToken = randomUUID();
    const newRefreshToken = randomUUID();
    const newRefreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours, aligné sur la durée du cookie
    const newSession = new UserSession(
      randomUUID(),
      session.userId,
      newToken,
      Date.now(),
      newExpiresAt,
      newRefreshToken,
      newRefreshTokenExpiresAt,
      session.user
    );
    await authService.addUserSession(newSession);
    // Placer le nouveau token dans un cookie HTTP-only
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      res.cookie("__Host-session", newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
        path: "/",
      });
    } else {
      res.cookie("session_token", newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
        path: "/",
      });
    }
    res.json({
      user: session.user ? mapUserToDTO(session.user) : undefined,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      expiresAt: newExpiresAt,
    });
  })
);

export default router;
