import { Server as SocketServer, Socket } from "socket.io";
import { AuthService, FriendService, UserService, RoomService, MessageService } from "../../../../domain/services";

export interface WsEnv {
  FRONTEND_URL?: string;
  TRUST_PROXY?: boolean | string;
}

export interface WsServices {
  authService: AuthService;
  friendService: FriendService;
  userService: UserService;
  roomService: RoomService;
  messageService: MessageService;
}

export interface WsContext<TPayload = any> {
  io: SocketServer;
  socket: Socket;
  services: WsServices;
  env: WsEnv;
  payload?: TPayload; // set by validate middleware if desired
}
