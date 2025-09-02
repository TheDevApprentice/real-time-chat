import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Router } from "express";
import { User } from "../models/User";
import { DatabaseService } from "../utils/DatabaseService";

require("@dotenvx/dotenvx").config();
const router = Router();

// Registration endpoint
router.post("/register", async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    const users = await db.getUsers();
    if (users.find((u) => u.name === username)) {
      return res.status(409).json({ error: "Username already exists." });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User(randomUUID(), username, hashed);
    await db.addUser(newUser);
    res.status(201).json({ id: newUser.id, name: newUser.name });
  } catch (err) {
    res.status(500).json({ error: "Registration failed." });
  }
});

// --- REFRESH TOKEN ENDPOINT ---
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required." });
  }
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error("SQLITE_FILE env variable is not set");
    const db = DatabaseService.getInstance(dbFile);
    // Parcourt toutes les sessions pour trouver le bon refreshToken
    const users = await db.getUsers();
    let session = null;
    for (const user of users) {
      const userSessions = await db.getUserSessionsByUserId(user.id);
      for (const s of userSessions) {
        if (s.refreshToken === refreshToken) {
          session = s;
          break;
        }
      }
      if (session) break;
    }
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
    const { UserSession } = await import("../models/UserSession");
    const newToken = randomUUID();
    const newRefreshToken = randomUUID();
    const newRefreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const newSession = new UserSession(
      randomUUID(),
      session.userId,
      newToken,
      Date.now(),
      undefined,
      newRefreshToken,
      newRefreshTokenExpiresAt,
      session.user
    );
    await db.addUserSession(newSession);
    // Placer le nouveau token dans un cookie sécurisé HTTP-only
    res.cookie("session_token", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
    });
    res.json({
      id: session.userId,
      name: session.user?.name,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Refresh token failed." });
  }
});

export default router;
