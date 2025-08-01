import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../utils/DatabaseService';

export interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.session_token;
    if (!token) {
      return res.status(401).json({ error: 'Missing session token.' });
    }
    const db = DatabaseService.getInstance(process.env.SQLITE_FILE || '');
    const session = await db.getUserSessionByToken(token);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth check failed.' });
  }
}
