# Changelog

All notable changes to this project will be documented in this file.

## 2025-09-08

### Added
- Persistent Undo workflow for message edit/delete (10-minute window):
  - Undo snackbar with live countdown, persists across reload via localStorage, restricted to initiating browser using `rtc:clientId`.
  - Inline Undo button visibility restored after reload and kept in sync with snackbar TTL.
  - New WS route `getUndoTTL` (server) to fetch remaining TTL from Redis for the current user and message.
- "(edited)" badge on message bubbles:
  - Persists across reload via localStorage.
  - Avoids badge when content is restored from delete Undo.
- Robust WS handler attachment in `messaging.ts`:
  - Attaches even if `window.socket` is created after script load and re-attaches on reconnect.

### Changed
- `MessagesWsController.messageUndo()` now emits `messageEdited` with `{ restored: true }` so clients can restore content without adding the “(edited)” badge.
- Documentation updates:
  - `server/Express/public/README.md` – UI flow, edit/delete/undo behavior, UI WS events reference, troubleshooting.
  - `server/Express/README.md` – server WS routes (including `getUndoTTL`), Undo flow, features list.
  - Root `README.md` – repository overview and links to detailed docs.

### Notes
- Default behavior remains soft delete (content becomes `[deleted]`). Undo restores previous content within the allowed TTL.
- Only TypeScript files were modified; compiled JS is produced by the TypeScript build.

## 2025-09-18

### Added
- Database documentation: schema, entities, relationships, and ER diagram
  - `docs/Server/Express/DATABASE.md` with tables mapping and creation order
- Performance indexes to speed up common queries (both MariaDB/MySQL and SQLite paths):
  - `messages(roomId, timestamp)` for history pagination
  - `messages(authorId)` when listing by author
  - `user_rooms(roomId)` for fast room membership lookups
  - `user_sessions(userId)` for listing sessions by user
  - `rooms(creatorId)`, `rooms(isPublic)`, `rooms(name)` for filtering and discovery
  - `friends(userA)`, `friends(userB)`, plus composite `friends(userA, status)`, `friends(userB, status)` to segment by status
- Redis documentation updates:
  - Socket.IO Redis adapter subsection with wiring example in `server/Express/REDIS.md`
  - Cross-links to centralized key builders `api/cache/cacheKeys.ts`
- Readme troubleshooting additions:
  - Notes for rate limits/brute-force and presence TTLs pointing to `REDIS.md`

### Changed
- Removed redundant DB indexes to reduce write overhead:
  - Dropped non-unique `user_sessions(refreshToken)` in favor of the UNIQUE index
  - Dropped single-column `messages(roomId)` as the composite `(roomId, timestamp)` covers it
- Documentation cross-links:
  - `server/Express/ARCHITECTURE.md` links to `REDIS.md`, `api/cache/cacheKeys.ts`, and storage docs

### Notes
- Schema initializer updated: `server/Express/infrastructure/migrations/initializeSchema.ts`
- Documentation layout may be consolidated under `docs/Server/Express/` going forward.

## 2025-09-20

### Added
- Redis documentation:
  - New section “PresenceChanged (server-pushed)” explaining scoping to friends and optimizations (Redis-cached friend list + socket dedup).
  - “Cheat sheet” table listing active `K.*` keys, TTLs, and managing files in `docs/Server/Express/REDIS.md`.

### Changed
- Presence and events:
  - Scope `presenceChanged` emissions to friends/DM only (no global broadcast).
  - Use Redis-cached friend relations (`K.friends(userId)` with `EX: TTL.friendsList`) to reduce lookups and deduplicate socket targets.
  - Normalize presence-related keys to `K.*` (`K.presence`, `K.lastSeen`, `K.socketUser`, `K.userSockets`) and `TTL.presenceOnline`.
- Storage and cache services:
  - Consolidate `AttachmentFinalizer` into `S3Service.finalize(...)` (temp → final object copy, cleanup, URLs returned).
  - Consolidate `MessageEffects` into `RedisService` with `onMessageCreated(...)`, `invalidateRoomHistory(...)`, and `invalidateUnreadForUsers(...)`.
- Client UI:
  - Remove full room list re-render on `presenceChanged`; directly updates the DM presence dot and active DM header label.

### Removed
- Obsolete app services and DI/context wiring:
  - `AttachmentFinalizer` and `MessageEffects` classes removed.
  - Their references removed from DI container and `WsContext`.

### Notes
- Migration:
  - Replace usages of `attachmentFinalizer.finalize(...)` with `s3Service.finalize(...)`.
  - Replace `messageEffects.*` with `redisService.onMessageCreated(...)`, `redisService.invalidateRoomHistory(...)`, and `redisService.invalidateUnreadForUsers(...)`.
- Security/Privacy: presence updates are now targeted to friends only.
