import { Request, Response, NextFunction } from "express";
import { getServices } from "../../../di/container";

export interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export async function authRESTMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Prefer hardened cookie, fallback to legacy names for backward compatibility (useful in dev over HTTP)
    let token = req.cookies?.["__Host-session"] as string | undefined;
    if (!token) token = req.cookies?.["session_token"] as string | undefined;
    if (!token) token = req.cookies?.["sessionToken"] as string | undefined;
    if (!token)
      return res.status(401).json({ error: "Missing session token." });
    
    const db = getServices().authService;
    const session = await db.getUserSessionByToken(token);
    if (!session || !session.user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }
    // Vérification expiration
    if (session.expiresAt && session.expiresAt < Date.now()) {
      // Supprime la session expirée
      await db.deleteUserSession(token);
      return res.status(401).json({ error: "Session expired." });
    }
    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    res.status(500).json({ error: "Auth check failed." });
  }
}
