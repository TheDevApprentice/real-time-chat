export type FriendStatus = "pending" | "accepted";

export interface FriendDTO {
  id: string;
  userA: string;
  userB: string;
  status: FriendStatus;
  requesterId: string;
  createdAt: number;
  updatedAt: number;
}

export interface FriendRequestDTO {
  targetUserId: string;
}

export interface FriendRespondDTO {
  otherUserId: string;
  action: "accept" | "reject";
}

export interface FriendListItemDTO {
  id: string;
  userId: string;
  name: string;
  status: "pending" | "accepted";
  isRequester: boolean;
}
