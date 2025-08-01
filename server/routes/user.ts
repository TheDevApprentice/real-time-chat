import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../utils/DatabaseService';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';

const router = Router();

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
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
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
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
    const users = await db.getUsers();
    const user = users.find(u => u.name === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.json({ id: user.id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Lister toutes les sessions utilisateur
router.get('/sessions', async (req, res) => {
  try {
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
    const sessions = await db.getAllUserSessions();
    if (!sessions) return res.status(500).json({ error: 'Failed to get sessions.' });
    // Charger les users liés à chaque session
    const userSessions = await Promise.all((sessions as Array<{ id: string, userId: string, token: string, createdAt: number, expiresAt?: number }>).
      map(async row => {
        const user = await db.getUserById(row.userId);
          return new UserSession(row.id, row.userId, row.token, row.createdAt, row.expiresAt, user);
        })
      );
      res.json(userSessions.map(s => s.toJSON()));
    } catch (err) {
    console.error('Erreur /sessions:', err); // LOG DÉTAILLÉ
    res.status(500).json({ error: 'Failed to get sessions.', details: err instanceof Error ? err.message : err });
  }
});

// Récupérer une session par token
router.get('/sessions/:token', async (req, res) => {
  try {
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
    const session = await db.getUserSessionByToken(req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session.toJSON());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session.' });
  }
});

// Supprimer une session par token
router.delete('/sessions/:token', async (req, res) => {
  try {
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
    await db.deleteUserSession(req.params.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete session.' });
  }
});

export default router;
