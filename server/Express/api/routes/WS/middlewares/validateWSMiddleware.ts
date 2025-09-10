import { WsMiddleware } from "../router/WsRouter";
import { WsContext } from "../router/WsContext";

// Generic validation middleware using any schema with a parse() method (e.g., Zod)
// Transforms payload type from unknown to the parsed type T for downstream handlers
export function validateWSMiddleware<T>(schema: { parse: (input: unknown) => T }): WsMiddleware<unknown, T> {
  return (next) => async (ctx: WsContext<unknown>) => {
    const parsed = schema.parse((ctx as any).payload);
    (ctx as any).payload = parsed as T;
    return next(ctx as any);
  };
}
