import type { RoomDTO, RoomSummaryDTO } from "../room.dto";
import { Room } from "../../entities/Room";
import { mapUserToDTO } from "./user.mapper";

export function mapRoomToDTO(room: Room): RoomDTO {
  return {
    id: room.id,
    name: room.name,
    creatorId: room.creatorId,
    createdAt: room.createdAt,
    type: room.type,
    isPublic: room.isPublic,
    users: room.users.map(mapUserToDTO),
  };
}

export function mapRoomsToSummaryDTO(rooms: Room[]): RoomSummaryDTO[] {
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    isPublic: r.isPublic,
  }));
}
