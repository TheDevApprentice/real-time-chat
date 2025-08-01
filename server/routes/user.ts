import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../utils/DatabaseService';
import { User } from '../models/User';

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

export default router;
