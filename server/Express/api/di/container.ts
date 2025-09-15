import { createCallbackDbFromEnv } from "../../infrastructure/factory";
import { createDialect } from "../../infrastructure/sql/dialect";
import { AuthService } from "../../domain/services/dbServices/AuthService";
import { UserService } from "../../domain/services/dbServices/UserService";
import { RoomService } from "../../domain/services/dbServices/RoomService";
import { MessageService } from "../../domain/services/dbServices/MessageService";
import { FriendService } from "../../domain/services/dbServices/FriendService";
import { S3Service } from "../../domain/services/storageServices/S3Service";
import { IS3Service } from "../../domain/interfaces/storageInterface/IS3Service";
import { RedisService } from "../../domain/services/cacheServices/RedisService";
import { IRedisService } from "../../domain/interfaces/cacheInterfaces/IRedisService";
import { createUnitOfWork, UnitOfWorkProvider } from "../../infrastructure/transaction/UnitOfWork";

export type Services = {
  authService: AuthService;
  userService: UserService;
  roomService: RoomService;
  messageService: MessageService;
  friendService: FriendService;
  s3Service: IS3Service;
  redisService: IRedisService;
  unitOfWork: UnitOfWorkProvider;
};

let servicesSingleton: Services | null = null;

export function getServices(): Services {
  if (servicesSingleton) return servicesSingleton;

  const db = createCallbackDbFromEnv(process.env);
  const dialect = createDialect();
  const unitOfWork = createUnitOfWork(db, dialect);

  // Domain services (DI via interfaces)
  const authService = new AuthService(unitOfWork);
  const redisService = RedisService.getInstance();
  const userService = new UserService(unitOfWork);
  const roomService = new RoomService(unitOfWork);
  const messageService = new MessageService(unitOfWork);
  const friendService = new FriendService(unitOfWork);
  const s3Service = S3Service.getInstance();

  servicesSingleton = {
    authService,
    userService,
    roomService,
    messageService,
    friendService,
    s3Service,
    redisService,
    unitOfWork,
  };
  return servicesSingleton;
}
