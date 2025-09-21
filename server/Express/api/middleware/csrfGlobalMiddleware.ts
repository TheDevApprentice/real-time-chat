import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "X-XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

function isSafeMethod(method?: string): boolean {
  const m = (method || "GET").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

export function issueCsrfCookieGlobalMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Only issue on safe methods to avoid interfering with caching semantics
    if (!isSafeMethod(req.method)) return next();

    const existing = (req as any).cookies?.[CSRF_COOKIE_NAME];
    if (!existing) {
      const token = crypto.randomBytes(32).toString("hex");
      const isProd = process.env.NODE_ENV === "production";
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // must be readable by frontend to send in header
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    next();
  } catch (_err) {
    // If token issuing fails, don't block the request
    next();
  }
}

export function verifyCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Only verify for mutating requests
    if (isSafeMethod(req.method)) return next();

    const cookieToken = (req as any).cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.header(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: "Invalid CSRF token." });
    }
    next();
  } catch (_err) {
    return res.status(403).json({ error: "CSRF verification failed." });
  }
}
