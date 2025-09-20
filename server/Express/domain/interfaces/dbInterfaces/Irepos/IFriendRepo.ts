export type FriendStatus = "pending" | "accepted";
export type FriendRecord = {
  id: string;           // ordered pair key: `${min(userId, otherId)}:${max(...)}`
  userA: string;        // smallest by lexicographic order
  userB: string;        // largest by lexicographic order
  status: FriendStatus; // 'pending' | 'accepted'
  requesterId: string;  // who initiated the request
  createdAt: number;
  updatedAt: number;
};

export interface IFriendRepo {
  // Atomic primitives (single-statement operations)
  addFriendRequest(record: FriendRecord): Promise<void>;
  updateFriendRequest(
    id: string,
    patch: Partial<Pick<FriendRecord, "status" | "requesterId" | "updatedAt">>
  ): Promise<void>;
  deleteFriendRequest(id: string): Promise<void>;
  getFriendRequest(id: string): Promise<FriendRecord | null>;

  // Query helpers
  getAllUserFriendRequest(
    userId: string
  ): Promise<
    Array<{
      id: string;
      userId: string;
      name: string;
      status: FriendStatus;
      isRequester: boolean;
    }>
  >;
}