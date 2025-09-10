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
  toUserId: string;
}

export interface FriendRespondDTO {
  requestId: string;
  action: "accept" | "decline";
}
