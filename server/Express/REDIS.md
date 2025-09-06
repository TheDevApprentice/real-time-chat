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

---

## Recommended Key Conventions

These are recommended patterns to keep keys consistent across features. Adjust as needed per feature set.

- Presence / Last Seen
  - Online marker: `presence:online:<userId>` → value `"1"`, TTL short (e.g., 60s) refreshed by heartbeats.
  - Last seen: `presence:last:<userId>` → value `timestamp` (ms since epoch), set on disconnect or inactivity.

- Unread counts
  - Per user and room: `unread:<userId>:<roomId>` → value integer, increment on incoming messages when room not active; reset when user enters the room.

- Rate limiting
  - `rate:<action>:<key>:<timeBucket>` (e.g., `rate:login:ip:2025-09-06T14:00`) with TTL to the end of the bucket.

- Pub/Sub
  - Channels: `events:room:<roomId>` to publish room events to workers or other instances (optional depending on deployment).

---

## Usage Examples

### Presence: set online with TTL and last-seen fallback

```ts
import { RedisService } from "../domain/services/cacheServices/RedisService";

const redis = RedisService.getInstance();
await redis.connect();

const ONLINE_TTL = 60; // seconds

export async function markOnline(userId: string) {
  await redis.set(`presence:online:${userId}`, "1", { EX: ONLINE_TTL });
}

export async function markOffline(userId: string) {
  await redis.del(`presence:online:${userId}`);
  await redis.set(`presence:last:${userId}`, String(Date.now()));
}

export async function isOnline(userId: string): Promise<boolean> {
  return (await redis.get(`presence:online:${userId}`)) === "1";
}

export async function getLastSeen(userId: string): Promise<number | null> {
  const v = await redis.get(`presence:last:${userId}`);
  return v ? Number(v) : null;
}
```

### Unread counts: increment and reset

```ts
export async function incUnread(userId: string, roomId: string) {
  await redis.incrBy(`unread:${userId}:${roomId}`, 1);
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
await redis.publish(`events:room:${roomId}`, JSON.stringify({ type: "message", messageId, roomId }));

// Subscriber (e.g., in another worker)
const unsubscribe = await redis.subscribe(`events:room:${roomId}`, (msg) => {
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
