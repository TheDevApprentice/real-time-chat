import { Server as SocketServer, Socket } from "socket.io";
import { IRedisService } from "../../../../domain/interfaces/cacheInterfaces/IRedisService";
import { IS3Service } from "../../../../domain/interfaces/storageInterface/IS3Service";
import { IRoomService } from "../../../../domain/interfaces/dbInterfaces/Iservices/IRoomService";
import { IUserService } from "../../../../domain/interfaces/dbInterfaces/Iservices/IUserService";
import { IFriendsService } from "../../../../domain/interfaces/dbInterfaces/Iservices/IFriendsService";
import { IMessageService } from "../../../../domain/interfaces/dbInterfaces/Iservices/IMessageService";
import { IAuthService } from "../../../../domain/interfaces/dbInterfaces/Iservices/IAuthService";

export interface WsEnv {
  FRONTEND_URL?: string;
  TRUST_PROXY?: boolean | string;
}

export interface WsServices {
  authService: IAuthService;
  friendService: IFriendsService;
  userService: IUserService;
  roomService: IRoomService;
  messageService: IMessageService;
  redisService: IRedisService;
  s3Service: IS3Service;
}

export interface WsContext<TPayload = any> {
  io: SocketServer;
  socket: Socket;
  services: WsServices;
  env: WsEnv;
  payload?: TPayload; // set by validate middleware if desired
}
