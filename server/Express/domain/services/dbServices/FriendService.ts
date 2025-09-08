import { IFriendsService } from "../../interfaces/dbInterfaces/Iservices/IFriendsService";
import { IFriendRepo } from "../../interfaces/dbInterfaces/Irepos/IFriendRepo";

// TODO: replace 'any' with IFriendRepo interface from domain/interfaces/dbInterfaces/Irepos
export class FriendService implements IFriendsService {
  private readonly friendsRepo: IFriendRepo;

  constructor(private readonly _iFriendsRepo: IFriendRepo) {
    this.friendsRepo = _iFriendsRepo;
  }

  createFriendRequest(
    requesterId: string,
    targetUserId: string
  ): Promise<{
    id: string;
    status: "pending";
    userA: string;
    userB: string;
    requesterId: string;
    createdAt: number;
    updatedAt: number;
  }> {
    return this.friendsRepo.createFriendRequest(requesterId, targetUserId);
  }

  respondFriendRequest(
    userId: string,
    otherUserId: string,
    action: "accept" | "reject"
  ) {
    return this.friendsRepo.respondFriendRequest(userId, otherUserId, action);
  }

  listFriendsAndRequests(userId: string) {
    return this.friendsRepo.listFriendsAndRequests(userId);
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const list = await this.friendsRepo.listFriendsAndRequests(userId);
      return list.some((it) => it.status === "accepted" && it.userId === otherUserId);
    } catch {
      return false;
    }
  }
}
