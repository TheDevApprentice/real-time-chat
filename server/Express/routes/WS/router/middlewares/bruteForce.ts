import { WsMiddleware } from "../WsRouter";
import { bruteForceGuard } from "../../../../utils/BruteForceGuard";

interface BruteForceOptions {
  action: string; // logical action name, e.g. 'login', 'refresh', 'friend-op'
  keyFrom: (ctx: any) => string; // e.g. (ctx) => ctx.payload?.username || ctx.socket.data?.userId
}

function getClientIp(ctx: any): string {
  const trustProxyEnv = process.env.TRUST_PROXY;
  const trustProxy = trustProxyEnv === "true" || (!!trustProxyEnv && trustProxyEnv !== "false");
  const xff = (ctx.socket.handshake.headers as any)["x-forwarded-for"] as string | undefined;
  const ip = trustProxy && xff ? xff.split(",")[0].trim() : ctx.socket.handshake.address || "unknown";
  return ip;
}

export function bruteForce(options: BruteForceOptions): WsMiddleware<any> {
  const { action, keyFrom } = options;
  return (next) => async (ctx) => {
    const ip = getClientIp(ctx);
    const keyVal = keyFrom(ctx) || "unknown";
    const guardKey = `${action}:${keyVal}`;

    if (bruteForceGuard.isBlockedIP(ip)) {
      return { success: false, error: "Too many attempts from this IP. Try again later." };
    }
    if (bruteForceGuard.isBlockedKey(guardKey)) {
      return { success: false, error: "Too many attempts. Try again later." };
    }

    try {
      const result = await next(ctx);
      // consider success only if no error returned
      if (result && result.error) {
        bruteForceGuard.onFailure(ip, guardKey);
      } else {
        bruteForceGuard.onSuccess(ip, guardKey);
      }
      return result;
    } catch (err) {
      bruteForceGuard.onFailure(ip, guardKey);
      throw err;
    }
  };
}
