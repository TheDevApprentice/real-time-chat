import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../models/User';
import { DatabaseService } from '../utils/DatabaseService';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();

// Protection brute-force login (en mémoire)
const loginAttemptsByIP = new Map<string, { count: number, lastAttempt: number, blockedUntil?: number }>();
const loginAttemptsByUsername = new Map<string, { count: number, lastAttempt: number, blockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

function isBlocked(attempt: { count: number, lastAttempt: number, blockedUntil?: number }) {
  return attempt.blockedUntil && attempt.blockedUntil > Date.now();
}



// Registration endpoint
router.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    const users = await db.getUsers();
    if (users.find(u => u.name === username)) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User(randomUUID(), username, hashed);
    await db.addUser(newUser);
    res.status(201).json({ id: newUser.id, name: newUser.name });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || 'unknown';
  // Vérifier blocage IP
  let ipAttempt = loginAttemptsByIP.get(ip) || { count: 0, lastAttempt: 0 };
  if (isBlocked(ipAttempt)) {
    return res.status(429).json({ error: 'Too many login attempts from this IP. Try again later.' });
  }
  // Vérifier blocage username
  let userAttempt = loginAttemptsByUsername.get(username) || { count: 0, lastAttempt: 0 };
  if (isBlocked(userAttempt)) {
    return res.status(429).json({ error: 'Too many login attempts for this user. Try again later.' });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    const users = await db.getUsers();
    const user = users.find(u => u.name === username);
    const valid = user && await bcrypt.compare(password, user.password);
    if (!user || !valid) {
      // Échec : incrémenter compteurs
      ipAttempt.count += 1; ipAttempt.lastAttempt = Date.now();
      userAttempt.count += 1; userAttempt.lastAttempt = Date.now();
      if (ipAttempt.count >= MAX_ATTEMPTS) ipAttempt.blockedUntil = Date.now() + BLOCK_DURATION;
      if (userAttempt.count >= MAX_ATTEMPTS) userAttempt.blockedUntil = Date.now() + BLOCK_DURATION;
      loginAttemptsByIP.set(ip, ipAttempt);
      loginAttemptsByUsername.set(username, userAttempt);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Succès : reset compteurs
    loginAttemptsByIP.delete(ip);
    loginAttemptsByUsername.delete(username);
    // --- SESSION CREATION ---
    const { randomUUID } = await import('crypto');
    const { UserSession } = await import('../models/UserSession');
    const token = randomUUID();
    const refreshToken = randomUUID();
    const refreshTokenExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 jours
    const session = new UserSession(
      randomUUID(),
      user.id,
      token,
      Date.now(),
      undefined,
      refreshToken,
      refreshTokenExpiresAt,
      user
    );
    await db.addUserSession(session);
    // Placer le token dans un cookie sécurisé HTTP-only
    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 jours
    });
    res.json({
      id: user.id,
      name: user.name,
      refreshToken,
      refreshTokenExpiresAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Lister toutes les sessions utilisateur courant
router.get('/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const sessions = await db.getUserSessionsByUserId(req.user.id);
    res.json(sessions.map(s => s.toJSON()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sessions.' });
  }
});

// Récupérer une session par token
router.get('/sessions/:token', async (req, res) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    const session = await db.getUserSessionByToken(req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session.' });
  }
});

// Supprimer une session par token (si elle appartient à l'utilisateur)
router.delete('/sessions/:token', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const session = await db.getUserSessionByToken(req.params.token);
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: 'Session not found or not owned.' });
    }
    await db.deleteUserSession(req.params.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete session.' });
  }
});

// Supprimer toutes les sessions de l'utilisateur courant (logout all)
router.delete('/sessions', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    await db.deleteAllUserSessionsByUserId(req.user.id);
    res.clearCookie('session_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout all failed.' });
  }
});


router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  // req.user est injecté par le middleware
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ id: req.user.id, name: req.user.name });
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
    const db = DatabaseService.getInstance(dbFile);
      await db.deleteUserSession(token);
    }
    res.clearCookie('session_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// --- REFRESH TOKEN ENDPOINT ---
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required.' });
  }
  try {
    const dbFile = process.env.SQLITE_FILE;
    if (!dbFile) throw new Error('SQLITE_FILE env variable is not set');
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
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
    if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt < Date.now()) {
      await db.deleteUserSession(session.token);
      return res.status(401).json({ error: 'Refresh token expired.' });
    }
    // Rotation: supprimer l'ancienne session
    await db.deleteUserSession(session.token);
    // Créer une nouvelle session
    const { randomUUID } = await import('crypto');
    const { UserSession } = await import('../models/UserSession');
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
    res.cookie('session_token', newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 jours
    });
    res.json({
      id: session.userId,
      name: session.user?.name,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Refresh token failed.' });
  }
});

export default router;
