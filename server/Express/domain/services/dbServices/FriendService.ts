import { IFriendsService } from "../../interfaces/dbInterfaces/Iservices/IFriendsService";
import { IFriendRepo } from "../../interfaces/dbInterfaces/Irepos/IFriendRepo";
import { FriendsRepo } from "../../../infrastructure/db/repos/FriendsRepo";

// TODO: replace 'any' with IFriendRepo interface from domain/interfaces/dbInterfaces/Irepos
export class FriendService implements IFriendsService {
  private readonly friendsRepo: FriendsRepo;

  constructor(private readonly _iFriendsRepo: IFriendRepo) {
    this.friendsRepo = _iFriendsRepo as FriendsRepo;
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
}
