import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { User } from "../../../models/User";
import { DatabaseService } from "../../../services/DatabaseService";
import { bruteForceGuard } from "../../../utils/BruteForceGuard";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/auth";
import {
  RegisterSchema,
  RefreshTokenSchema,
  parseOrThrow,
  ValidationHttpError,
} from "../../../utils/validation";

const router = Router();

// Use centralized guard-based rate limiter
const rateLimit = (routeKey: string, maxReq = 50, windowMs = 15 * 60 * 1000) =>
  bruteForceGuard.rateLimit(routeKey, maxReq, windowMs);

// Registration endpoint
router.post("/register", rateLimit("auth:register", 20), async (req, res) => {
  try {
    const { username, password, confirmPassword } = parseOrThrow(
      RegisterSchema,
      req.body
    );
    const db = DatabaseService.getInstance();
    const users = await db.getUsers();
    if (users.find((u) => u.name === username)) {
      return res.status(409).json({ error: "Username already exists." });
    }
    const cost = Number(process.env.BCRYPT_COST || 12);
    const hashed = await bcrypt.hash(password, isNaN(cost) ? 12 : cost);
    const newUser = new User(randomUUID(), username, hashed);
    await db.addUser(newUser);
    res.status(201).json({ id: newUser.id, name: newUser.name });
  } catch (err) {
    if (err instanceof ValidationHttpError) {
      return res
        .status(err.status)
        .json({ error: err.message, details: err.details });
    }
    res.status(500).json({ error: "Registration failed." });
  }
});

// --- SET SESSION COOKIE (HttpOnly) FROM TOKEN ---
// Allows frontend to exchange a bare token (obtained via WebSocket auth) for a secure HttpOnly cookie.
router.post(
  "/session-cookie",
  rateLimit("auth:sessionCookie", 60),
  async (req: Request, res: Response) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "token is required." });
    try {
      const db = DatabaseService.getInstance();
      const session = await db.getUserSessionByToken(token);
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
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user)
        return res.status(401).json({ error: "Not authenticated." });
      return res.json({ id: req.user.id, name: req.user.name });
    } catch (err) {
      return res.status(500).json({ error: "Failed to resolve current user." });
    }
  }
);

// --- REFRESH TOKEN ENDPOINT ---
router.post(
  "/refresh-token",
  rateLimit("auth:refresh", 60),
  async (req, res) => {
    try {
      const { refreshToken } = parseOrThrow(RefreshTokenSchema, req.body);
      const db = DatabaseService.getInstance();
      // Lookup direct par refresh token
      const session = await db.getUserSessionByRefreshToken(refreshToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid refresh token." });
      }
      if (
        !session.refreshTokenExpiresAt ||
        session.refreshTokenExpiresAt < Date.now()
      ) {
        await db.deleteUserSession(session.token);
        return res.status(401).json({ error: "Refresh token expired." });
      }
      // Rotation: supprimer l'ancienne session
      await db.deleteUserSession(session.token);
      // Créer une nouvelle session
      const { randomUUID } = await import("crypto");
      const { UserSession } = await import("../../../models/UserSession");
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
      await db.addUserSession(newSession);
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
        id: session.userId,
        name: session.user?.name,
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      });
    } catch (err) {
      if (err instanceof ValidationHttpError) {
        return res
          .status(err.status)
          .json({ error: err.message, details: err.details });
      }
      res.status(500).json({ error: "Refresh token failed." });
    }
  }
);

export default router;
