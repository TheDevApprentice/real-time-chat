import { WsMiddleware } from "../WsRouter";

export function requireAuth(): WsMiddleware<any> {
  return (next) => async (ctx) => {
    const userId = (ctx.socket.data as any)?.userId as string | undefined;
    if (!userId) {
      return { success: false, error: "Not authenticated." };
    }
    return next(ctx);
  };
}
