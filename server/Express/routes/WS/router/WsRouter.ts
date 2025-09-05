import { Socket } from "socket.io";
import { WsContext } from "./WsContext";

export type WsHandler<TPayload = any> = (
  ctx: WsContext<TPayload>
) => Promise<any> | any;
// Middleware that transforms payload type from TIn to TOut for downstream
export type WsMiddleware<TIn = any, TOut = TIn> = (
  next: WsHandler<TOut>
) => WsHandler<TIn>;

interface Route<TPayload> {
  event: string;
  handler: WsHandler<TPayload>;
}

export class WsRouter {
  private routes: Route<any>[] = [];

  register<TPayload = any>(
    event: string,
    ...middlewaresAndHandler: (WsMiddleware<any, any> | WsHandler<any>)[]
  ) {
    // Last item must be the handler
    const rawHandler = middlewaresAndHandler.pop();
    if (!rawHandler || typeof rawHandler !== "function") {
      throw new Error(`No handler provided for event ${event}`);
    }
    let handler = rawHandler as WsHandler<any>;
    // Apply middlewares right-to-left
    for (let i = middlewaresAndHandler.length - 1; i >= 0; i--) {
      const mw = middlewaresAndHandler[i] as WsMiddleware<any, any>;
      handler = mw(handler);
    }
    this.routes.push({ event, handler });
  }

  attach(makeContext: (socket: Socket) => WsContext): (socket: Socket) => void {
    return (socket: Socket) => {
      for (const route of this.routes) {
        socket.on(
          route.event,
          async (payload: any, callback?: (resp: any) => void) => {
            try {
              const ctx = makeContext(socket);
              // Allow middleware to set ctx.payload if a validator is used
              (ctx as any).payload = payload;
              const result = await route.handler(ctx);
              if (typeof callback === "function") callback(result);
            } catch (err: any) {
              if (typeof callback === "function") {
                // Normalize common validation errors (e.g., Zod)
                let code = err?.code || "INTERNAL_ERROR";
                let error = err?.message || "Internal error";
                let details: any = undefined;
                // ZodError shape detection
                if (err && Array.isArray(err.issues)) {
                  code = "INVALID_PAYLOAD";
                  error = "Invalid payload";
                  details = err.issues.map((i: any) => ({
                    path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""),
                    message: i.message,
                  }));
                }
                callback({ success: false, code, error, ...(details ? { details } : {}) });
              }
            }
          }
        );
      }
    };
  }
}
