import { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandlerRESTMiddleware(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
