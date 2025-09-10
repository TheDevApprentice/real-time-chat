import { createCallbackDbFromEnv } from "../../infrastructure/factory";
import { UsersRepo } from "../../infrastructure/repos/UsersRepo";
import { CachedUsersRepo } from "../../infrastructure/repos/CachedUsersRepo";
import { RoomsRepo } from "../../infrastructure/repos/RoomsRepo";
import { MessagesRepo } from "../../infrastructure/repos/MessagesRepo";
import { SessionsRepo } from "../../infrastructure/repos/SessionsRepo";
import { FriendsRepo } from "../../infrastructure/repos/FriendsRepo";
import { AuthService } from "../../domain/services/dbServices/AuthService";
import { UserService } from "../../domain/services/dbServices/UserService";
import { RoomService } from "../../domain/services/dbServices/RoomService";
import { MessageService } from "../../domain/services/dbServices/MessageService";
import { FriendService } from "../../domain/services/dbServices/FriendService";
import { S3Service } from "../../domain/services/storageServices/S3Service";
import { IS3Service } from "../../domain/interfaces/storageInterface/IS3Service";
import { RedisService } from "../../domain/services/cacheServices/RedisService";
import { IRedisService } from "../../domain/interfaces/cacheInterfaces/IRedisService";

export type Services = {
  authService: AuthService;
  userService: UserService;
  roomService: RoomService;
  messageService: MessageService;
  friendService: FriendService;
  s3Service: IS3Service;
  redisService: IRedisService;
};

let servicesSingleton: Services | null = null;

export function getServices(): Services {
  if (servicesSingleton) return servicesSingleton;

  const db = createCallbackDbFromEnv(process.env);

  // Infra repos
  const usersRepo = new UsersRepo(db);
  const roomsRepo = new RoomsRepo(db);
  const messagesRepo = new MessagesRepo(db);
  const sessionsRepo = new SessionsRepo(db, usersRepo);
  const friendsRepo = new FriendsRepo(db);

  // Domain services (DI via interfaces)
  const authService = new AuthService(sessionsRepo);
  const redisService = RedisService.getInstance();
  const cachedUsersRepo = new CachedUsersRepo(usersRepo, redisService);
  const userService = new UserService(cachedUsersRepo);
  const roomService = new RoomService(roomsRepo);
  const messageService = new MessageService(messagesRepo);
  const friendService = new FriendService(friendsRepo);
  const s3Service = S3Service.getInstance();

  servicesSingleton = {
    authService,
    userService,
    roomService,
    messageService,
    friendService,
    s3Service,
    redisService,
  };
  return servicesSingleton;
}
