import { Socket } from "socket.io";
import { WsContext } from "./WsContext";

export type WsHandler<TPayload = any> = (ctx: WsContext<TPayload>) => Promise<any> | any;
export type WsMiddleware<TPayload = any> = (next: WsHandler<TPayload>) => WsHandler<TPayload>;

interface Route<TPayload> {
  event: string;
  handler: WsHandler<TPayload>;
}

export class WsRouter {
  private routes: Route<any>[] = [];

  register<TPayload = any>(event: string, ...middlewaresAndHandler: (WsMiddleware<TPayload> | WsHandler<TPayload>)[]) {
    // Last item must be the handler
    const rawHandler = middlewaresAndHandler.pop();
    if (!rawHandler || typeof rawHandler !== "function") {
      throw new Error(`No handler provided for event ${event}`);
    }
    let handler = rawHandler as WsHandler<TPayload>;
    // Apply middlewares right-to-left
    for (let i = middlewaresAndHandler.length - 1; i >= 0; i--) {
      const mw = middlewaresAndHandler[i] as WsMiddleware<TPayload>;
      handler = mw(handler);
    }
    this.routes.push({ event, handler });
  }

  attach(makeContext: (socket: Socket) => WsContext): (socket: Socket) => void {
    return (socket: Socket) => {
      for (const route of this.routes) {
        socket.on(route.event, async (payload: any, callback?: (resp: any) => void) => {
          try {
            const ctx = makeContext(socket);
            // Allow middleware to set ctx.payload if a validator is used
            (ctx as any).payload = payload;
            const result = await route.handler(ctx);
            if (typeof callback === "function") callback(result);
          } catch (err: any) {
            if (typeof callback === "function") callback({ success: false, error: err?.message || "Internal error" });
          }
        });
      }
    };
  }
}
