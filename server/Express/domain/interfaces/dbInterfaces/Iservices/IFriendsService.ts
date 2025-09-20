export interface IFriendsService {
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
    }>;
  
    respondFriendRequest(
      userId: string,
      otherUserId: string,
      action: "accept" | "reject"
    ): Promise<any>;
  
    listFriendsAndRequests(userId: string): Promise<any>;

    // Returns true if both users are friends (accepted status)
    areFriends(userId: string, otherUserId: string): Promise<boolean>;
  }