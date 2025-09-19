import { Server as SocketServer, Socket } from "socket.io";
import { AuthService, FriendService, UserService, RoomService, MessageService } from "../../../../domain/services";
import { AttachmentFinalizer } from "../../../../domain/services/appServices/AttachmentFinalizer";
import { MessageEffects } from "../../../../domain/services/appServices/MessageEffects";
import { IRedisService } from "../../../../domain/interfaces/cacheInterfaces/IRedisService";
import { IS3Service } from "../../../../domain/interfaces/storageInterface/IS3Service";

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
  redisService: IRedisService;
  s3Service: IS3Service;
  attachmentFinalizer: AttachmentFinalizer;
  messageEffects: MessageEffects;
}

export interface WsContext<TPayload = any> {
  io: SocketServer;
  socket: Socket;
  services: WsServices;
  env: WsEnv;
  payload?: TPayload; // set by validate middleware if desired
}
