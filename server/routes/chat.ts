import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { DatabaseService } from '../utils/DatabaseService';

require('@dotenvx/dotenvx').config()
const sqliteFile = process.env.SQLITE_FILE;
if (!sqliteFile) {
  throw new Error('SQLITE_FILE environment variable is not defined');
}
const db = DatabaseService.getInstance(sqliteFile);
const router = Router();

// Get welcome
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the chat API' });
});

// Get all messages
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const messages : Message[] = await db.getMessages();
    res.json(messages.map((m: Message) => m.toJSON())); // already OOP strict
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users : User[] = await db.getUsers();
    res.json(users.map((u: User) => u.toJSON()));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
