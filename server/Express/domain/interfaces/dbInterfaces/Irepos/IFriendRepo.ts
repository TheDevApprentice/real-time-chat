export interface IFriendRepo {
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
    ): Promise<{
      id: string;
      status: "accepted" | "pending";
      userA: string;
      userB: string;
      requesterId: string;
      createdAt: number;
      updatedAt: number;
    } | null>;
  
    listFriendsAndRequests(
      userId: string
    ): Promise<
      Array<{
        id: string;
        userId: string;
        name: string;
        status: "pending" | "accepted";
        isRequester: boolean;
      }>
    >;
  }