import { Room } from "../../../entities/Room";
import { User } from "../../../entities/User";

export interface IRoomService {
  addRoom(room: Room): Promise<Room>;
  getRooms(): Promise<Room[]>;
  getRoomById(id: string): Promise<Room | undefined>;
  addUserToRoom(userId: string, roomId: string): Promise<void>;
  isUserInRoom(userId: string, roomId: string): Promise<boolean>;
  addUsersToRoomBulk(userIds: string[], roomId: string): Promise<void>;
  getRoomsForUser(userId: string): Promise<Room[]>;
  getVisibleRoomsForUser(userId: string): Promise<Room[]>;
  getUsersForRoom(roomId: string): Promise<User[]>;
  getRoomsAndUsers(): Promise<{ room: Room; users: User[] }[]>;
}