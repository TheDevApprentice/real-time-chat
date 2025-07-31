import { Router, Request, Response } from 'express';
import { Message } from '../models/Message';

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

export default router;
