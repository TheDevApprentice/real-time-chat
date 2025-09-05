import { Server as SocketServer, Socket } from "socket.io";
import { DatabaseService } from "../services/DatabaseService";

export interface WsEnv {
  FRONTEND_URL?: string;
  TRUST_PROXY?: boolean | string;
}

export interface WsServices {
  db: DatabaseService;
}

export interface WsContext<TPayload = any> {
  io: SocketServer;
  socket: Socket;
  services: WsServices;
  env: WsEnv;
  payload?: TPayload; // set by validate middleware if desired
}
