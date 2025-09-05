import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === "number" ? err.status : 500;
  const code = err?.code || "INTERNAL_ERROR";
  const message = typeof err?.error === "string" ? err.error : (err?.message || "Internal server error");
  res.status(status).json({ success: false, code, error: message });
}
