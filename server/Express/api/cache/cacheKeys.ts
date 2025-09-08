// cacheKeys.ts - centralized Redis keys, TTLs and small helpers
import type { IRedisService } from "../../domain/interfaces/cacheInterfaces/IRedisService";

// TTLs (in seconds)
export const TTL = {
  roomsVisible: 60,
  unreadCounts: 45,
  roomHistory: 60,
  roomHistoryPage: 120,
  friendsList: 300,
  userById: 600,
  presenceOnline: 120,
  typing: 10,
  rateWindowSend: 10,
  idempotency: 60,
  roomOnlineExpire: 300,
  searchShort: 20,
  rateWindowSearch: 20,
  readMax: 3600, // 1h default for aggregated read receipts (if used)
  // Aggregation retention
  counterHourRetainSec: 48 * 3600, // keep hourly buckets for 48h
  counterDayRetainSec: 30 * 24 * 3600, // keep daily buckets for 30 days
  // Invites / OTP
  invite: 600,
  // Avatars cache
  avatar: 600,
  // Undo window for message edits/deletes (10 minutes)
  undo: 600,
  // Calls
  callRinging: 60,      // seconds to wait for accept before auto-decline
  callActive: 2 * 3600, // safety TTL for active calls (2h)
} as const;

// Key builders
export const K = {
  roomsVisible: (userId: string) => `cache:rooms:visible:${userId}`,
  unread: (userId: string) => `cache:unread:${userId}`,
  roomHistory: (roomId: string) => `cache:room:history:${roomId}`,
  friends: (userId: string) => `cache:friends:${userId}`,
  user: (userId: string) => `cache:user:${userId}`,
  presence: (userId: string) => `presence:user:${userId}`,
  lastSeen: (userId: string) => `lastseen:user:${userId}`,
  socketUser: (socketId: string) => `socket:user:${socketId}`,
  userSockets: (userId: string) => `user:sockets:${userId}`,
  typing: (roomId: string, userId: string) => `typing:${roomId}:${userId}`,
  typingCount: (roomId: string) => `typing:${roomId}:count`,
  // New keys
  idempMsg: (clientMsgId: string) => `idemp:msg:${clientMsgId}`,
  rlSendRoom: (roomId: string, userId: string) => `rl:room:send:${roomId}:${userId}`,
  roomOnline: (roomId: string) => `room:online:${roomId}`,
  // History versioning + pages
  historyVer: (roomId: string) => `history:ver:${roomId}`,
  historyPage: (roomId: string, ver: number, cursor: number, size: number) => `cache:room:history:${roomId}:v${ver}:page:${cursor}:${size}`,
  // Room last message & active rooms set
  roomLastMessage: (roomId: string) => `cache:room:lastMessage:${roomId}`,
  roomsActiveZ: () => `cache:stats:rooms:active`,
  readMax: (roomId: string) => `readmax:${roomId}`,
  // Message counters per hour/day
  roomMsgsHour: (roomId: string, hourKey: string) => `stats:room:msgs:hour:${roomId}:${hourKey}`,
  roomMsgsDay: (roomId: string, dayKey: string) => `stats:room:msgs:day:${roomId}:${dayKey}`,
  // Search cache
  search: (userId: string, q: string, limit: number) => `cache:search:${userId}:${q}:${limit}`,
  rlSearch: (userId: string) => `rl:search:${userId}`,
  // Locks / invites / avatars / leaderboard
  lock: (resource: string) => `lock:${resource}`,
  invite: (token: string) => `invite:${token}`,
  userAvatar: (userId: string) => `cache:user:avatar:${userId}`,
  lbActiveUsers: () => `lb:activeUsers`,
  // Stats hit/miss
  statsHit: (prefix: string) => `stats:cache:hit:${prefix}`,
  statsMiss: (prefix: string) => `stats:cache:miss:${prefix}`,
  // Undo snapshots per user+message
  msgUndo: (userId: string, messageId: number | string) => `undo:msg:${userId}:${messageId}`,
  // Calls
  callSession: (callId: string) => `call:${callId}`,
  userCall: (userId: string) => `user:call:${userId}`,
};

// Small helpers
export async function delMany(redis: IRedisService, keys: string[] | string): Promise<number> {
  try {
    return await redis.del(keys);
  } catch {
    return 0;
  }
}

export async function jsonGet<T = any>(redis: IRedisService, key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function jsonSet(redis: IRedisService, key: string, value: unknown, ex?: number): Promise<void> {
  try {
    if (ex != null) await redis.set(key, JSON.stringify(value), { EX: ex });
    else await redis.set(key, JSON.stringify(value));
  } catch {}
}

export async function incrWithTtl(redis: IRedisService, key: string, ttlSeconds: number, by = 1): Promise<number> {
  const count = await redis.incrBy(key, by);
  if (count === 1 && ttlSeconds > 0) {
    try { await redis.expire(key, ttlSeconds); } catch {}
  }
  return count;
}

// Events / channels
export const Channels = {
  messageCreated: "events:messageCreated",
} as const;
