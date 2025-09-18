# Redis – Usage in This Project

This document explains how Redis is used in the Express server, which service wraps it, how it is initialized, and recommended patterns (keys, TTLs, pub/sub).

Paths are relative to `server/Express/`.

---

## Where Redis Is Used

- `domain/services/cacheServices/RedisService.ts`
  - Central wrapper over `redis` (node-redis v4) client.
  - Exposes a singleton (`RedisService.getInstance()`) with convenience methods (`get`, `set`, `del`, `expire`, `ttl`, `incrBy`, `publish`, `subscribe`).
  - Handles connection management and provides an isolated subscription client for pub/sub.

- `server.ts`
  - Composes the app, obtains `RedisService` singleton and calls `connect()` on boot.
  - Manages graceful shutdown and calls `disconnect()` on SIGINT/SIGTERM.

- `api/routes/WS/router/WebSocketGateway.ts`
  - Enables Socket.IO clustering with the Redis adapter via `@socket.io/redis-adapter` and `ioredis` clients (pub/sub).
  - Builds config either from `REDIS_URL` or individual env vars (`REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD|REDIS_PASS`, `REDIS_TLS`).
  - Adapter connections retry with backoff and log warnings on errors; the gateway keeps working even if the adapter is unavailable.

- Rate limiting and brute-force protections
  - `api/routes/REST/middleware/*Redis*Middleware.ts`, `api/routes/WS/middlewares/*Redis*Middleware.ts` use Redis for cluster-safe rate limits and brute-force guards.

> Business code (controllers/services) should depend on the `IRedisService` interface in `domain/interfaces/cacheInterfaces/IRedisService.ts` rather than node-redis directly. This allows mocking in tests and easy replacement.

---

## Configuration & Environment

`RedisService` builds the connection URL from environment variables if `REDIS_URL` is not set explicitly.

Supported env vars:

- `REDIS_URL` (optional)
  - Full connection URL. If present, it overrides the individual parts below.
- `REDIS_HOST` (default: `127.0.0.1`)
- `REDIS_PORT` (default: `6379`)
- `REDIS_USER` (optional)
- `REDIS_PASSWORD` or `REDIS_PASS` (optional)
- `REDIS_TLS` (default: `false`)
  - When set to `true`, protocol `rediss://` is used.

The connection URL is assembled like:

```
redis://[user[:pass]@]host:port
```

or with TLS:

```
rediss://[user[:pass]@]host:port
```

---

## Socket.IO adapter (cluster)

The WebSocket gateway uses the Redis adapter for cross-instance event propagation when running multiple app replicas.

- Adapter: `@socket.io/redis-adapter`
- Client: `ioredis` (pub/sub pair)
- Source: `api/routes/WS/router/WebSocketGateway.ts`

Example wiring (simplified):

```ts
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis as IoRedis } from "ioredis";

async function configureRedisAdapter(io: import("socket.io").Server) {
  const url = process.env.REDIS_URL;
  const retryStrategy = (times: number) => Math.min(5000, 300 + times * 200);

  let pub: IoRedis;
  let sub: IoRedis;
  if (url) {
    pub = new IoRedis(url, { retryStrategy, connectionName: "ws-pub" } as any);
    sub = pub.duplicate({ retryStrategy, connectionName: "ws-sub" } as any);
  } else {
    const host = process.env.REDIS_HOST || "redis";
    const port = Number(process.env.REDIS_PORT || "6379");
    const username = process.env.REDIS_USER || undefined;
    const password = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || undefined;
    const useTLS = (process.env.REDIS_TLS || "false").toLowerCase() === "true";
    const options: any = { host, port, retryStrategy, connectionName: "ws-pub" };
    if (username) options.username = username;
    if (password) options.password = password;
    if (useTLS) options.tls = {};
    pub = new IoRedis(options);
    sub = pub.duplicate({ retryStrategy, connectionName: "ws-sub" } as any);
  }

  pub.on("error", (err) => console.warn("ioredis pub error:", String(err)));
  sub.on("error", (err) => console.warn("ioredis sub error:", String(err)));

  io.adapter(createAdapter(pub as any, sub as any));
}
```

If the adapter cannot connect, the gateway logs a warning and continues in single-instance mode.

---

## Lifecycle

- Creation: `RedisService.getInstance()` returns the singleton.
- Connect: `await redis.connect()` establishes the connection (no-op if already connected).
- Disconnect: `await redis.disconnect()` gracefully quits and clears the client.
- Errors: client `error` events are logged to stderr and do not crash the process; callers should handle failures as needed.

In `server.ts`:

```ts
const redis = RedisService.getInstance();
redis
  .connect()
  .then(() => Logger.info("Redis connected"))
  .catch((err) => Logger.warn(`Redis connect failed: ${String(err)}`));

// On SIGINT/SIGTERM: await redis.disconnect()
```

---

## API (RedisService)

All methods below implicitly call a guarded `ensure()` that throws if Redis is not connected. Connect early during server startup.

- `get(key: string): Promise<string | null>`
- `set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<void>`
  - Supports `EX` (seconds) or `PX` (milliseconds) TTL.
- `del(key: string | string[]): Promise<number>`
- `expire(key: string, seconds: number): Promise<boolean>`
- `ttl(key: string): Promise<number>`
- `incrBy(key: string, by = 1): Promise<number>`
- `publish(channel: string, message: string): Promise<number>`
- `subscribe(channel: string, handler: (message: string, channel: string) => void): Promise<() => Promise<void>>`
  - Returns an `unsubscribe` function that will unsubscribe and quit the dedicated subscriber client.

Additional helpers implemented and used in the codebase:

- Sets:
  - `sAdd(key: string, member: string): Promise<number>`
  - `sRem(key: string, member: string): Promise<number>`
  - `sMembers(key: string): Promise<string[]>`
- Sorted sets:
  - `zAdd(key: string, score: number, member: string): Promise<number>`
  - `zIncrBy(key: string, increment: number, member: string): Promise<number>`
  - `zRange(key: string, start: number, stop: number, opts?: { REV?: boolean; WITHSCORES?: boolean }): Promise<string[] | { value: string; score: number }[]>`
- Hashes:
  - `hSet(key: string, field: string, value: string): Promise<number>`
  - `hIncrBy(key: string, field: string, by: number): Promise<number>`
  - `hGetAll(key: string): Promise<Record<string, string>>`
- Atomic helpers:
  - `setNxExpire(key: string, value: string, exSeconds: number): Promise<boolean>` (NX + EX lock)
  - `getDel(key: string): Promise<string | null>` (get and delete atomically)

---

## Recommended Key Conventions

Centralized in `api/cache/cacheKeys.ts` (see that file for exact builders and TTL constants). Key families used in the codebase include:

- Presence & session
  - Presence (TTL-refresh heartbeat): `presence:user:<userId>`
  - Last seen timestamp (ms): `lastseen:user:<userId>`
  - Map socket to user (short TTL): `socket:user:<socketId>`
  - Set of sockets for a user: `user:sockets:<userId>`

- Rooms & messaging
  - Cached room history pages: `cache:room:history:<roomId>:v<ver>:page:<cursor>:<size>`
  - History version: `history:ver:<roomId>`
  - Room online count: `room:online:<roomId>`
  - Typing flags/counters: `typing:<roomId>:<userId>`, `typing:<roomId>:count`
  - Last message cache: `cache:room:lastMessage:<roomId>`
  - Idempotency for client message ids: `idemp:msg:<clientMsgId>`

- Users, friends, avatars
  - Visible rooms list cache: `cache:rooms:visible:<userId>`
  - Friends list cache: `cache:friends:<userId>`
  - User cache: `cache:user:<userId>`
  - Avatar cache: `cache:user:avatar:<userId>`

- Rate limiting / brute force (cluster-safe)
  - REST rate-limit key: `rl:rest:<routeKey>:<fingerprint>`
  - WS rate-limit keys: `rl:ws:<subKey>:socket:<socketId>`, `rl:ws:<subKey>:user:<userId>`, `rl:ws:<subKey>:ip:<ip>`
  - Brute-force attempts/blocks: `bf:attempts:ip:<ip>`, `bf:attempts:key:<action>:<key>`, `bf:blocked:ip:<ip>`, `bf:blocked:key:<action>:<key>`

- Aggregations & stats
  - Active rooms ZSET: `cache:stats:rooms:active`
  - Message counters: `stats:room:msgs:hour:<roomId>:<hourKey>`, `stats:room:msgs:day:<roomId>:<dayKey>`
  - Cache hit/miss counters: `stats:cache:hit:<prefix>`, `stats:cache:miss:<prefix>`

- Calls
  - Call session: `call:<callId>`
  - User→call mapping: `user:call:<userId>`

TTL recommendations are defined in `TTL` within `cacheKeys.ts` (e.g., presence 120s, undo 600s, counters retention, etc.).

---

## Usage Examples

### Presence: set online with TTL and last-seen fallback

```ts
import { RedisService } from "../domain/services/cacheServices/RedisService";

const redis = RedisService.getInstance();
await redis.connect();

const ONLINE_TTL = 120; // seconds (see TTL.presenceOnline)

export async function markOnline(userId: string) {
  await redis.set(`presence:user:${userId}`, "online", { EX: ONLINE_TTL });
}

export async function markOffline(userId: string) {
  await redis.del(`presence:user:${userId}`);
  await redis.set(`lastseen:user:${userId}`, String(Date.now()));
}

export async function isOnline(userId: string): Promise<boolean> {
  return (await redis.get(`presence:user:${userId}`)) != null;
}

export async function getLastSeen(userId: string): Promise<number | null> {
  const v = await redis.get(`lastseen:user:${userId}`);
  return v ? Number(v) : null;
}
```

### Unread counts: increment and reset

```ts
export async function incUnread(userId: string, roomId: string) {
  await redis.incrBy(`unread:${userId}:${roomId}`, 1); // example pattern; see cacheKeys for actual keys used
}

export async function resetUnread(userId: string, roomId: string) {
  await redis.del(`unread:${userId}:${roomId}`);
}

export async function getUnread(userId: string, roomId: string): Promise<number> {
  const v = await redis.get(`unread:${userId}:${roomId}`);
  return v ? Number(v) : 0;
}
```

### Pub/Sub: simple inter-process events

```ts
// Publisher (e.g., when a message is created)
await redis.publish("events:messageCreated", JSON.stringify({ messageId, roomId }));

// Subscriber (e.g., in another worker)
const unsubscribe = await redis.subscribe("events:messageCreated", (msg) => {
  const evt = JSON.parse(msg);
  // handle evt
});

// Later
await unsubscribe();
```

---

## Operational Notes

- **Connection reuse**: Use the singleton; avoid creating ad-hoc clients in controllers.
- **Subscriber clients**: `subscribe()` creates a dedicated client per call (node-redis v4 requirement). Unsubscribe/quit when done.
- **Error handling**: Redis network errors should not crash the process. Wrap critical operations in try/catch and degrade gracefully (e.g., presence label falls back to "offline").
- **Security**: In production, prefer TLS (`REDIS_TLS=true`) and strong passwords. Limit network access to Redis from trusted hosts.
- **Docker**: The repo includes a `Redis/` directory with a Dockerfile and is orchestrated via `docker-compose.yml`. Ensure `REDIS_URL` or host/port envs match the compose network.

---

## Testing Tips

- For unit tests, mock `IRedisService` and assert service logic without connecting to a real Redis.
- For integration tests, spin up a Redis container and run against it; clear keys with a test-specific prefix to avoid collisions.
