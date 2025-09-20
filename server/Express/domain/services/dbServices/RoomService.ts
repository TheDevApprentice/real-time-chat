/**
 * RoomService (Domain)
 * --------------------
 * Orchestrates room-related use cases using the Unit of Work provider.
 * - Uses `uow.noTx` for simple single-step operations (reads, single insert).
 * - Uses `uow.tx` for multi-step flows that must be atomic (e.g., adding many users).
 *
 * The UoW exposes an explicit `roomsRepo` shape typed by domain interfaces.
 * Repositories remain atomic; no multi-statement orchestration lives in infra.
 */
import { Room } from "../../entities/Room";
import { User } from "../../entities/User";
import { IRoomService } from "../../interfaces/dbInterfaces/Iservices/IRoomService";

// TODO: replace 'any' with IRoomRepo interface from domain/interfaces/dbInterfaces/Irepos
// Minimal UnitOfWork-like contract to avoid infra coupling (explicit roomsRepo shape)
type RoomsUowRunner = <T>(fn: (uow: { roomsRepo: {
  addRoom: (room: Room) => Promise<Room>;
  getRooms: () => Promise<Room[]>;
  getRoomById: (id: string) => Promise<Room | undefined>;
  addUserToRoom: (userId: string, roomId: string) => Promise<void>;
  isUserInRoom: (userId: string, roomId: string) => Promise<boolean>;
  addUsersToRoomBulk: (userIds: string[], roomId: string) => Promise<void>;
  getRoomsForUser: (userId: string) => Promise<Room[]>;
  getVisibleRoomsForUser: (userId: string) => Promise<Room[]>;
  getUsersForRoom: (roomId: string) => Promise<User[]>;
  getRoomsAndUsers: () => Promise<{ room: Room; users: User[] }[]>;
} }) => Promise<T>) => Promise<T>;
type RoomsUowProvider = { tx: RoomsUowRunner; noTx: RoomsUowRunner };

export class RoomService implements IRoomService {
  constructor(private readonly uow: RoomsUowProvider) {}

  addRoom(room: Room): Promise<Room> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.addRoom(room));
  }

  getRooms(): Promise<Room[]> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getRooms());
  }

  getRoomById(id: string): Promise<Room | undefined> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getRoomById(id));
  }

  addUserToRoom(userId: string, roomId: string): Promise<void> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.addUserToRoom(userId, roomId));
  }

  isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.isUserInRoom(userId, roomId));
  }

  addUsersToRoomBulk(userIds: string[], roomId: string): Promise<void> {
    // Transactional bulk add for atomicity
    return this.uow.tx(async ({ roomsRepo }) => {
      // eslint-disable-next-line no-await-in-loop
      await roomsRepo.addUsersToRoomBulk(userIds, roomId);
    });
  }

  getRoomsForUser(userId: string): Promise<Room[]> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getRoomsForUser(userId));
  }

  getVisibleRoomsForUser(userId: string): Promise<Room[]> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getVisibleRoomsForUser(userId));
  }

  getUsersForRoom(roomId: string): Promise<User[]> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getUsersForRoom(roomId));
  }

  getRoomsAndUsers(): Promise<{ room: Room; users: User[] }[]> {
    return this.uow.noTx(async ({ roomsRepo }) => roomsRepo.getRoomsAndUsers());
  }

  async haveSharedRoom(userA: string, userB: string): Promise<boolean> {
    try {
      return this.uow.noTx(async ({ roomsRepo }) => {
        const [aRooms, bRooms] = await Promise.all([
          roomsRepo.getRoomsForUser(userA),
          roomsRepo.getRoomsForUser(userB),
        ]);
        if (!aRooms?.length || !bRooms?.length) return false;
        const setA = new Set(aRooms.map((r) => r.id));
        for (const r of bRooms) {
          if (setA.has(r.id)) return true;
        }
        return false;
      });
    } catch {
      return false;
    }
  }
}
