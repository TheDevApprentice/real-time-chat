import { WsMiddleware } from "../../router/WsRouter";
import type { WsContext } from "../../router/WsContext";

export function requireAuth<T = any>(): WsMiddleware<T, T> {
  return (next) => async (ctx: WsContext<T>) => {
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) {
      return { success: false, error: "Not authenticated." };
    }
    return next(ctx as WsContext<T>);
  };
}
