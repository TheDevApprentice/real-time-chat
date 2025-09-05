import { createCallbackDbFromEnv } from "../../infrastructure/db/factory";
import { UsersRepo } from "../../infrastructure/db/repos/UsersRepo";
import { RoomsRepo } from "../../infrastructure/db/repos/RoomsRepo";
import { MessagesRepo } from "../../infrastructure/db/repos/MessagesRepo";
import { SessionsRepo } from "../../infrastructure/db/repos/SessionsRepo";
import { FriendsRepo } from "../../infrastructure/db/repos/FriendsRepo";
import { AuthService } from "../../domain/services/dbServices/AuthService";
import { UserService } from "../../domain/services/dbServices/UserService";
import { RoomService } from "../../domain/services/dbServices/RoomService";
import { MessageService } from "../../domain/services/dbServices/MessageService";
import { FriendService } from "../../domain/services/dbServices/FriendService";
import { S3Service } from "../../domain/services/storageServices/S3Service";
import { IS3Service } from "../../domain/interfaces/storageInterface/IS3Service";

export type Services = {
  authService: AuthService;
  userService: UserService;
  roomService: RoomService;
  messageService: MessageService;
  friendService: FriendService;
  s3Service: IS3Service;
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
  const userService = new UserService(usersRepo);
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
  };
  return servicesSingleton;
}
