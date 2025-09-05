import { WsMiddleware } from "../WsRouter";

export function requireAuth<T = any>(): WsMiddleware<T, T> {
  return (next) => async (ctx) => {
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) {
      return { success: false, error: "Not authenticated." };
    }
    return next(ctx);
  };
}
