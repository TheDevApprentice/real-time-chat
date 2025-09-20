import type { UserDTO } from "./user.dto";
import type { MessageDTO } from "./message.dto";

export type RoomType = "room" | "user";

export interface RoomDTO {
  id: string;
  name: string;
  creatorId: string;
  createdAt: number;
  type: RoomType;
  isPublic: boolean;
  users: UserDTO[];
}

export interface RoomSummaryDTO {
  id: string;
  name: string;
  type: RoomType;
  isPublic: boolean;
}

export interface CreateRoomDTO {
  name: string;
  isPublic?: boolean;
  type?: RoomType;
  userIds?: string[];
}

export interface UpdateRoomDTO {
  name?: string;
  isPublic?: boolean;
}

export interface JoinRoomDTO {
  roomId: string;
}

export interface RoomHistoryQueryDTO {
  roomId: string;
  cursor?: number;
  size?: number;
}

export interface RoomHistoryPageDTO {
  roomId: string;
  ver: number;
  cursor: number;
  size: number;
  items: MessageDTO[];
}
