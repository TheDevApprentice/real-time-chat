import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';
import { DatabaseService } from '../utils/DatabaseService';

const router = Router();

// Get welcome
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the chat API' });
});

// Post a message (echo back)
router.post('/message', (req: Request, res: Response) => {
  const { authorId, authorName, content } = req.body;
  if (!authorId || !authorName || !content) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const msg = new Message(authorId, authorName, content);
  // TODO: persist or broadcast via WebSocketService
  res.status(201).json(msg);
});

// Get all messages
router.get('/messages', async (req: Request, res: Response) => {
  const db = DatabaseService.getInstance(process.env.SQLITE_FILE!);
  try {
    const messages = await db.getMessages();
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  const db = DatabaseService.getInstance(process.env.SQLITE_FILE!);
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
