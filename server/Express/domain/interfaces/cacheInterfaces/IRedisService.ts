export interface IRedisService {
  // connection lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // basic kv
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number }
  ): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string | string[]): Promise<number>;
  getDel(key: string): Promise<string | null>;

  // ttl & counters
  expire(key: string, seconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incrBy(key: string, by?: number): Promise<number>;
  setNxExpire(key: string, value: string, exSeconds: number): Promise<boolean>;

  // sets
  sAdd(key: string, member: string): Promise<number>;
  sRem(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;

  // sorted sets
  zAdd(key: string, score: number, member: string): Promise<number>;
  zIncrBy(key: string, increment: number, member: string): Promise<number>;
  zRange(
    key: string,
    start: number,
    stop: number,
    opts?: { REV?: boolean; WITHSCORES?: boolean }
  ): Promise<string[] | Array<{ value: string; score: number }>>;

  // hashes
  hSet(key: string, field: string, value: string): Promise<number>;
  hIncrBy(key: string, field: string, by: number): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;

  // pub/sub
  publish(channel: string, message: string): Promise<number>;

  /** Subscribe to a channel. Returns an unsubscribe function. */
  subscribe(
    channel: string,
    handler: (message: string, channel: string) => void
  ): Promise<() => Promise<void>>;
}
 