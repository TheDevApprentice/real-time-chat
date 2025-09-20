/**
 * FriendService (Domain)
 * ----------------------
 * Orchestrates friend flows using the Unit of Work provider.
 * - Uses `uow.noTx` for single-step operations (create request).
 * - Uses `uow.tx` for multi-step flows that must be atomic (accept/reject).
 *
 * Repositories remain atomic and expose primitives only.
 * The deterministic pair ordering (orderPair) is domain logic and lives here,
 * keeping repo focused on persistence.
 */
import { IFriendsService } from "../../interfaces/dbInterfaces/Iservices/IFriendsService";
import { FriendRecord } from "../../interfaces/dbInterfaces/Irepos/IFriendRepo";

// Minimal UnitOfWork-like contract to avoid infra coupling
type FriendsUowRunner = <T>(fn: (uow: { friendsRepo: {
  addFriendRequest: (record: FriendRecord) => Promise<void>;
  updateFriendRequest: (id: string, patch: Partial<Pick<FriendRecord, "status" | "requesterId" | "updatedAt">>) => Promise<void>;
  deleteFriendRequest: (id: string) => Promise<void>;
  getFriendRequest: (id: string) => Promise<FriendRecord | null>;
  getAllUserFriendRequest: (userId: string) => Promise<Array<{ id: string; userId: string; name: string; status: "pending" | "accepted"; isRequester: boolean }>>;
} }) => Promise<T>) => Promise<T>;
type FriendsUowProvider = { tx: FriendsUowRunner; noTx: FriendsUowRunner };

export class FriendService implements IFriendsService {
  constructor(private readonly uow: FriendsUowProvider) {}

  // Keep deterministic id logic in service (domain)
  private orderPair(a: string, b: string): { a: string; b: string } {
    return a < b ? { a, b } : { a: b, b: a };
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
    const { a, b } = this.orderPair(requesterId, targetUserId);
    const now = Date.now();
    const id = `${a}:${b}`;
    const record: FriendRecord = {
      id,
      userA: a,
      userB: b,
      status: "pending",
      requesterId,
      createdAt: now,
      updatedAt: now,
    };
    return this.uow.noTx(async ({ friendsRepo }) => {
      await friendsRepo.addFriendRequest(record);
      // Return the exact IFriendsService contract with status literal 'pending'
      return {
        id: record.id,
        status: "pending" as const,
        userA: record.userA,
        userB: record.userB,
        requesterId: record.requesterId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
  }

  respondFriendRequest(
    userId: string,
    otherUserId: string,
    action: "accept" | "reject"
  ) {
    const { a, b } = this.orderPair(userId, otherUserId);
    const id = `${a}:${b}`;
    const now = Date.now();
    return this.uow.tx(async ({ friendsRepo }) => {
      if (action === "reject") {
        await friendsRepo.deleteFriendRequest(id);
        return null;
      }
      await friendsRepo.updateFriendRequest(id, { status: "accepted", updatedAt: now });
      return friendsRepo.getFriendRequest(id);
    });
  }

  listFriendsAndRequests(userId: string) {
    return this.uow.noTx(async ({ friendsRepo }) => friendsRepo.getAllUserFriendRequest(userId));
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const list = await this.uow.noTx(async ({ friendsRepo }) => friendsRepo.getAllUserFriendRequest(userId));
      return list.some((it) => it.status === "accepted" && it.userId === otherUserId);
    } catch {
      return false;
    }
  }
}
