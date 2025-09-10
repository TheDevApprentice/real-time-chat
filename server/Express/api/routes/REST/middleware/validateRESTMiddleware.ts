import { Request, Response, NextFunction } from "express";

export type Schema<T> = { parse: (input: unknown) => T };

export interface RequestWithValidated<TBody = any, TParams = any, TQuery = any>
  extends Request {
  validated?: {
    body?: TBody;
    params?: TParams;
    query?: TQuery;
  };
}

export function validateRESTMiddlewareBody<T>(schema: Schema<T>) {
  return (req: RequestWithValidated<T>, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.validated = { ...(req.validated || {}), body: parsed };
      next();
    } catch (err: any) {
      next({ status: 400, code: "INVALID_BODY", error: err?.message || "Invalid request body" });
    }
  };
}

export function validateRESTMiddlewareParams<T>(schema: Schema<T>) {
  return (
    req: RequestWithValidated<any, T>,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const parsed = schema.parse(req.params);
      req.validated = { ...(req.validated || {}), params: parsed };
      next();
    } catch (err: any) {
      next({ status: 400, code: "INVALID_PARAMS", error: err?.message || "Invalid route params" });
    }
  };
}

export function validateRESTMiddlewareQuery<T>(schema: Schema<T>) {
  return (
    req: RequestWithValidated<any, any, T>,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const parsed = schema.parse(req.query);
      req.validated = { ...(req.validated || {}), query: parsed };
      next();
    } catch (err: any) {
      next({ status: 400, code: "INVALID_QUERY", error: err?.message || "Invalid query string" });
    }
  };
}
