import { WsContext } from "..";

export function getClientIp(ctx: WsContext<any>): string {
  const trustProxyEnv = process.env.TRUST_PROXY;
  const trustProxy = trustProxyEnv === "true" || (!!trustProxyEnv && trustProxyEnv !== "false");
  const xff = (ctx.socket.handshake.headers as any)["x-forwarded-for"] as string | undefined;
  const ip = trustProxy && xff ? xff.split(",")[0].trim() : (ctx.socket.handshake.address as any) || "unknown";
  return String(ip || "unknown");
}