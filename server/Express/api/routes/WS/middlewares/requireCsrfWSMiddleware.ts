import { WsMiddleware } from "../router/WsRouter";
import { WsContext } from "../router/WsContext";
import { getCookieValue } from "../../../../utils/CookieUtil";

// CSRF protection for WebSocket events (double-submit cookie pattern)
// Compares the CSRF cookie (X-XSRF-TOKEN) with a client-provided token.
// The client should send the token via socket handshake auth: io({ auth: { csrf: getCookie('X-XSRF-TOKEN') } })
// Optionally, if events include a payload field `csrf`, we also accept it when present.
export function requireCsrfWSMiddleware<T = any>(): WsMiddleware<T, T> {
  return (next) => async (ctx: WsContext<T>) => {
    try {
      const cookieHeader = (ctx.socket.handshake.headers as any)?.["cookie"] as string | undefined;
      const provided = (ctx.socket.handshake.auth as any)?.csrf || (ctx as any)?.payload?.csrf;
      if (!cookieHeader || !provided) {
        return { success: false, error: "Invalid CSRF token." };
      }
      const cookieToken = getCookieValue(cookieHeader, "X-XSRF-TOKEN");
      if (!cookieToken || cookieToken !== String(provided)) {
        return { success: false, error: "Invalid CSRF token." };
      }
      return next(ctx);
    } catch {
      return { success: false, error: "CSRF verification failed." };
    }
  };
}
