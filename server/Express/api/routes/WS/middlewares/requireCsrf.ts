import { WsMiddleware } from "../router/WsRouter";

// CSRF protection for WebSocket events (double-submit cookie pattern)
// Compares the CSRF cookie (X-XSRF-TOKEN) with a client-provided token.
// The client should send the token via socket handshake auth: io({ auth: { csrf: getCookie('X-XSRF-TOKEN') } })
// Optionally, if events include a payload field `csrf`, we also accept it when present.
export function requireCsrf<T = any>(): WsMiddleware<T, T> {
  return (next) => async (ctx) => {
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

function getCookieValue(cookieHeader: string, name: string): string | null {
  // Simple cookie parser for a single cookie key
  // cookieHeader format: "a=1; b=2; X-XSRF-TOKEN=..."
  try {
    const parts = cookieHeader.split(/;\s*/);
    for (const part of parts) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const k = part.substring(0, idx).trim();
      if (k === name) {
        return decodeURIComponent(part.substring(idx + 1));
      }
    }
  } catch {}
  return null;
}
