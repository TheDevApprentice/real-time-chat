import type { FriendDTO } from "../friend.dto";
import { Friend } from "../../entities/Friend";

export function mapFriendToDTO(f: Friend): FriendDTO {
  return {
    id: f.id,
    userA: f.userA,
    userB: f.userB,
    status: f.status,
    requesterId: f.requesterId,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}
