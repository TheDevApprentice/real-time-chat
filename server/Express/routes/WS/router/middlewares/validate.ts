import { WsMiddleware } from "../WsRouter";

// Generic validation middleware using any schema with a parse() method (e.g., Zod)
export function validate<T>(schema: { parse: (input: unknown) => T }): WsMiddleware<T> {
  return (next) => async (ctx) => {
    const parsed = schema.parse((ctx as any).payload);
    (ctx as any).payload = parsed;
    return next(ctx as any);
  };
}
