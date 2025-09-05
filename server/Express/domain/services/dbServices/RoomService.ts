import { Room } from "../../entities/Room";
import { User } from "../../entities/User";
import { IRoomService } from "../../interfaces/dbInterfaces/Iservices/IRoomService";
import { IRoomRepo } from "../../interfaces/dbInterfaces/Irepos/IRoomRepo";

// TODO: replace 'any' with IRoomRepo interface from domain/interfaces/dbInterfaces/Irepos
export class RoomService implements IRoomService {
  private readonly roomsRepo: IRoomRepo;

  constructor(private readonly _iRoomRepo: IRoomRepo) {
    this.roomsRepo = _iRoomRepo;
  }

  addRoom(room: Room): Promise<Room> {
    return this.roomsRepo.addRoom(room);
  }

  getRooms(): Promise<Room[]> {
    return this.roomsRepo.getRooms();
  }

  getRoomById(id: string): Promise<Room | undefined> {
    return this.roomsRepo.getRoomById(id);
  }

  addUserToRoom(userId: string, roomId: string): Promise<void> {
    return this.roomsRepo.addUserToRoom(userId, roomId);
  }

  isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return this.roomsRepo.isUserInRoom(userId, roomId);
  }

  addUsersToRoomBulk(userIds: string[], roomId: string): Promise<void> {
    return this.roomsRepo.addUsersToRoomBulk(userIds, roomId);
  }

  getRoomsForUser(userId: string): Promise<Room[]> {
    return this.roomsRepo.getRoomsForUser(userId);
  }

  getVisibleRoomsForUser(userId: string): Promise<Room[]> {
    return this.roomsRepo.getVisibleRoomsForUser(userId);
  }

  getUsersForRoom(roomId: string): Promise<User[]> {
    return this.roomsRepo.getUsersForRoom(roomId);
  }

  getRoomsAndUsers(): Promise<{ room: Room; users: User[] }[]> {
    return this.roomsRepo.getRoomsAndUsers();
  }
}
