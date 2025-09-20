 # Real-Time Chat Server (Node.js)

A Node.js-based real-time chat server using Express, Socket.IO, MariaDB (via ProxySQL), and strict object-oriented programming (OOP) principles. This backend powers a chat application with real-time messaging and persistent storage, intended to be paired with a Vue+Vite front-end.

---

## Table of Contents
1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Environment](#environment)
4. [How It Works (Overview)](#how-it-works-overview)
5. [Detailed Docs](#detailed-docs)
6. [Calls (WebRTC) Quick Start](#calls-webrtc-quick-start)
6. [Extending the Server](#extending-the-server)

---

## Features
- Real-time chat via WebSockets (Socket.IO)
- Persistent storage with MariaDB (via ProxySQL)
- Strict OOP for User and Message entities
- REST API for fetching users and messages
- Centralized logging utility
- Environment-based configuration
- Message edit/delete with per-user Undo (10-minute window)
  - Soft-delete by default (content becomes "[deleted]")
  - Undo for delete restores original content
  - Server exposes TTL of the undo snapshot

---

## Quick Start

### 1) Install & run (server only)
```bash
cd server/Express
npm install
npm run dev
```

### 2) Build UI test bundle (optional, for static test UI)
See `public/README.md` for the refactor and build flow. The UI compiles to a single `chat-client.js`.

---

## Environment

Minimal variables to start:
```
PORT=3080
MARIADB_HOST=proxysql
MARIADB_PORT=6033
MARIADB_DB=chat
MARIADB_USER=chat
MARIADB_PASSWORD=chat
FRONTEND_URL=http://localhost:3080
```

For full environment coverage (drivers, Redis, trust proxy, etc.), see the dedicated sections in `ARCHITECTURE.md`.

---

## Environment Variables
- **PORT**: The port number for the server to listen on (required)
- **MARIADB_HOST**: Database host; use `proxysql` to reach the Galera cluster through ProxySQL (required)
- **MARIADB_PORT**: ProxySQL listening port (default `6033`) (required)
- **MARIADB_DB**: Database/schema name (required)
- **MARIADB_USER**: Database user (required)
- **MARIADB_PASSWORD**: Database password (required)
- **MARIADB_SSL**: Enable TLS to the DB (optional; `false` by default)

These are validated at startup. The server will not start if required variables are missing.

---

## How It Works (Overview)

- Express serves REST routes and static assets; Socket.IO handles real-time.
- Database adapter is selected by env (MariaDB via ProxySQL by default).
- CSRF protection, CORS and Helmet are configured in `server.ts`.

For an end-to-end UI/WS/REST flow, see `ARCHITECTURE.md` (delivery, domain, infra) and `public/README.md` (UI responsibilities and build).

### Real-time edit/delete/undo (server side)
- On edit: server validates and updates message content, then broadcasts `messageEdited { roomId, messageId, content }` to the room.
- On delete: server performs a soft delete (content -> "[deleted]") and broadcasts `messageDeleted { roomId, messageId }`.
- On undo: server restores the previous content from a per-user snapshot in Redis and broadcasts
  `messageEdited { roomId, messageId, content, restored: true }` so clients can avoid marking the message as edited.
- TTL: a per-user snapshot key is stored in Redis for 10 minutes; a helper route `getUndoTTL` returns remaining seconds.

---

## Detailed Docs

- Architecture, layers & flows: `ARCHITECTURE.md`
- Code standards (SOLID, Clean, security, testing): `CODE_STANDARDS.md`
- Redis usage & conventions: `REDIS.md`
- Object storage (MinIO/S3): `Minio.md`
- Test UI (public/) structure and build: `public/README.md`

---

## Persistence: Unit of Work (tx/noTx)

This server uses a Unit of Work provider to make transaction intent explicit and keep repositories simple and atomic.

- `unitOfWork.tx(fn)`: run multiple repository calls in a single transaction.
- `unitOfWork.noTx(fn)`: run without an explicit transaction for simple operations.

Repositories expose single-statement primitives (insert/update/delete/select). Business flows are orchestrated in services with `tx/noTx`.

Example (RoomService):

```ts
// Add several users to a room atomically
await unitOfWork.tx(async ({ roomsRepo }) => {
  await roomsRepo.addUsersToRoomBulk(userIds, roomId);
});

// Simple read without a transaction
const rooms = await unitOfWork.noTx(async ({ roomsRepo }) => roomsRepo.getRoomsForUser(userId));
```

See `infrastructure/transaction/UnitOfWork.ts` and service files under `domain/services/dbServices/` for concrete usage patterns.

---

## Calls (WebRTC) Quick Start

This server ships with a minimal audio/video calling feature for validation. See `public/README.md` section “Calls (WebRTC) – Signaling, TURN/STUN and Test UI” for full details.

Key points:

- Signaling events are registered in `api/routes/WS/router/WebSocketGateway.ts`.
- Clients fetch ICE servers via `getTurnConfig`.
- TURN/STUN env (set on the `server` service in Docker or your env):
  - `WEBRTC_STUN`
  - `WEBRTC_TURN_URLS`
  - `WEBRTC_TURN_USERNAME`
  - `WEBRTC_TURN_CREDENTIAL`
- A coturn service `turn` is included in `docker-compose.yml` (ports UDP/TCP 3478 + UDP 49160–49200 by default). For cross‑internet tests, expose those ports and set `COTURN_PUBLIC_IP`.

Build the Test UI bundle and try a call:

```bash
cd server/Express/public
npx tsc -p tsconfig.json
```

Then start the stack from repo root:

```bash
docker compose up -d --build server
```

---

## How Voice and Video Calls Work (Server + Test UI specifics)

This section explains precisely how audio (voice) and audio+video calls are implemented across the server and the Test UI.

### 1) Signaling events (Socket.IO)

All signaling routes are registered in `api/routes/WS/router/WebSocketGateway.ts` and are forwarded between two users (caller → callee and back):

- `callRequest { targetUserId, media }` – caller requests a call. `media` is `'audio'` or `'video'`.
- `callIncoming { fromUser, media, callId }` – sent to callee to show the incoming overlay.
- `callAccept { callId }` / `callDecline { callId, reason? }` – callee accepts or declines.
- `callOffer { callId, sdp }` / `callAnswer { callId, sdp }` – WebRTC SDP exchange.
- `callIceCandidate { callId, candidate }` – trickled ICE candidates.
- `callHangup { callId, reason? }` – end the call.
- `callCanceled { callId }` – caller canceled before accept.
- `callBusy { callId }` – callee already in another call.
- `getTurnConfig` – returns `{ success, iceServers: [...] }` for client `RTCPeerConnection`.

Server does not terminate the call itself; it relays events and enforces minimal room/user checks. Business rules (timeout, busy, cancel) are coordinated by the client code with server echoes so both sides remain in sync.

### 2) Media constraints: Voice vs Video

The Test UI code lives in `public/calls.ts` and selects constraints based on `media`:

- Voice (audio): `{ audio: true, video: false }`
- Video (audio+video): `{ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }`

Those are safe defaults; a production UI should expose device selectors and quality controls.

### 3) Track management and negotiation timing

- The side that generates the offer (caller) acquires local media first and adds tracks to the `RTCPeerConnection` before creating the offer.
- The callee defers adding tracks until after `setRemoteDescription(offer)` to avoid extra m‑lines and camera loopback.
- Only remote tracks not originating from the same peer are rendered (guard against self‑tracks).
- On `ontrack`, the remote `MediaStream` is assembled and attached to:
  - Hidden `<audio>` element (voice + video) for sound
  - Visible `<video>` element (for video calls only)

### 4) ICE/TURN specifics

- Clients call `getTurnConfig` right before creating their `RTCPeerConnection`.
- The server reads env variables to build `iceServers`:
  - `WEBRTC_STUN` (single STUN URL) and optional TURN settings `WEBRTC_TURN_URLS`, `WEBRTC_TURN_USERNAME`, `WEBRTC_TURN_CREDENTIAL`.
- Coturn is provided as the `turn` service in `docker-compose.yml`. For public tests, expose ports: UDP 3478, TCP 3478, and a UDP relay range (49160–49200 by default), and set `COTURN_PUBLIC_IP`.

### 5) Lifecycle and cleanup

- Accept → both sides exchange Offer/Answer and trickle ICE until `connectionState` is `connected`.
- Hangup path cleans up in this order:
  1. Stop and remove local tracks
  2. Clear remote `MediaStream` and detach elements
  3. Close `RTCPeerConnection`
  4. Reset in‑call UI state
- Timeouts: if callee does not respond within a short window (client‑side timer), caller emits `callDecline { reason: 'timeout' }`.
- Busy: if callee is already in call, server notifies caller via `callBusy`.

### 6) Voice vs Video user experience (Test UI)

- Voice only:
  - No remote `<video>` is shown; the overlay shows call controls (mute/hangup) and a small quality panel is available.
- Video:
  - Local preview is shown; remote video appears on `ontrack`.
  - The "Stats" button toggles a live quality panel under the videos.

### 7) Quality and diagnostics (Test UI only)

`public/calls.ts` samples `pc.getStats()` every second and computes:

- Round‑trip time (RTT)
- Packet loss percentage over sampling interval
- Bitrate receive/send (kbps, audio+video)
- Jitter (audio/video)
- FPS and resolution of the received video, plus outbound FPS

The panel shows a quality dot (Excellent/Good/Fair/Poor) and a 30‑second graph (RTT, Loss %, Recv/Send kbps, Outbound FPS). On hangup, a compact summary is saved in `localStorage` (`qa_call_summaries`).

### 8) Error handling & edge cases

- Permission denied on `getUserMedia`: call is aborted and a message is logged; server peers get a decline.
- Autoplay policy: the Test UI removed manual unmute banners; `remoteAudio.play()` errors are swallowed silently.
- Reconnects mid‑call are not handled (scope of the test UI). Production should renegotiate or end the call gracefully.

---

## WebSocket Routes (server)

These route names are used by the test UI and should remain stable:

- Auth and rooms: see `router/WebSocketGateway.ts` and `controllers/*`.
- Messaging:
  - `sendMessageToRoom { roomId, content, timestamp, clientMsgId, attachments? }`
  - `messageEdit { roomId, messageId, newContent }`
  - `messageDelete { roomId, messageId }`
  - `messageUndo { roomId, messageId }`
  - `getUndoTTL { roomId, messageId }` → ack `{ success, ttlSeconds }`

Server broadcasts (to `roomId`):
- `message { … }` for new messages
- `messageEdited { roomId, messageId, content, restored? }`
- `messageDeleted { roomId, messageId }`

---

## Database & Drivers

MariaDB via ProxySQL is the default. The server connects to `proxysql:6033`, which load‑balances and health‑checks requests across the MariaDB Galera cluster. This hides topology changes and provides pooling and failover. See `ARCHITECTURE.md` for driver selection and environment variables.

Notes:
- Default driver: `mariadb` (via ProxySQL)
- Optional/testing: `sqlite` (local only) may still be supported for unit tests and simple demos, but production uses MariaDB through ProxySQL.

---

## Extending the Server
- Add authentication/authorization (currently open)
- Add more REST endpoints as needed
- Improve validation and error handling
- Add automated tests for models and services
- Integrate with the Vue+Vite front-end (see main project README)

---

## Credits
- Built with Node.js, Express, Socket.IO, MariaDB (via ProxySQL), and TypeScript
  - OOP design for maintainability and clarity

---

For any questions or contributions, please open an issue or submit a pull request.

---

## Example .env (server-only)

MariaDB via ProxySQL (default)
```
PORT=3080
FRONTEND_URL=http://localhost:3080
TRUST_PROXY=false
BCRYPT_COST=12

DATABASE_DRIVER=mariadb
MARIADB_HOST=proxysql
MARIADB_PORT=6033
MARIADB_DB=chat
MARIADB_USER=chat
MARIADB_PASSWORD=chat
MARIADB_SSL=false
```

SQLite (optional/testing)
```
PORT=3080
FRONTEND_URL=http://localhost:3080
TRUST_PROXY=false
BCRYPT_COST=12

DATABASE_DRIVER=sqlite
SQLITE_FILE=./Database/SqlLite/data.sqlite
```

Redis
```
REDIS_URL=redis://redis:6379
```

---

## Troubleshooting

- Port already in use (3080/8080/6379/5432/3306)
  - Stop conflicting services or change ports in `docker-compose.yml`.

- Cannot connect to MariaDB (via ProxySQL)
  - Use `proxysql` as host and `6033` as port when running inside the Compose network.
  - Verify ProxySQL and Galera nodes are healthy (see `docker-compose.*.yml`).
  - Confirm credentials: `MARIADB_DB`, `MARIADB_USER`, `MARIADB_PASSWORD`.

- Redis not found
  - Ensure `redis` service is running or point `REDIS_URL` to a reachable instance. See `REDIS.md`.

- Rate limits or brute-force blocks
  - See `REDIS.md` for cluster-safe rate limits and brute-force guards, including TTL windows and key patterns (`rl:*`, `bf:*`). Adjust thresholds in middlewares or clear keys to unblock in dev.

- Presence shows offline unexpectedly
  - Presence TTL is short by design (see `TTL.presenceOnline` in `api/cache/cacheKeys.ts`, default 120s). The gateway refreshes `presence:user:<userId>` periodically. Check that heartbeats run and Redis keys exist; see `REDIS.md` for details.

- Undo window not available
  - The per-user undo snapshot is stored in Redis with a 10-minute TTL. If `getUndoTTL` returns 0, the key expired or the action was not initiated by this user.

- Wrong driver selected
  - `DATABASE_DRIVER` must be one of `mariadb`, `sqlite`.
  - If unset, default is `mariadb`.
