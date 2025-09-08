 # Real-Time Chat Server (Node.js)

A Node.js-based real-time chat server using Express, Socket.IO, SQLite, and strict object-oriented programming (OOP) principles. This backend powers a chat application with real-time messaging and persistent storage, intended to be paired with a Vue+Vite front-end.

---

## Table of Contents
1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Environment](#environment)
4. [How It Works (Overview)](#how-it-works-overview)
5. [Detailed Docs](#detailed-docs)
6. [Extending the Server](#extending-the-server)

---

## Features
- Real-time chat via WebSockets (Socket.IO)
- Persistent storage with SQLite
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
SQLITE_FILE=./Database/SqlLite/data.sqlite
FRONTEND_URL=http://localhost:3080
```

For full environment coverage (drivers, Redis, trust proxy, etc.), see the dedicated sections in `ARCHITECTURE.md`.

---

## Environment Variables
- **PORT**: The port number for the server to listen on (required)
- **SQLITE_FILE**: Path to the SQLite database file (required)

Both are validated at startup. The server will not start if either is missing.

---

## How It Works (Overview)

- Express serves REST routes and static assets; Socket.IO handles real-time.
- Database adapter is selected by env (SQLite by default).
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
- Test UI (public/) structure and build: `public/README.md`

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

SQLite is the default (schema initialized automatically). Postgres/MySQL adapters are wired via the factory but may be placeholders until fully implemented. See `ARCHITECTURE.md` for driver selection and environment variables.

---

## Extending the Server
- Add authentication/authorization (currently open)
- Add more REST endpoints as needed
- Improve validation and error handling
- Add automated tests for models and services
- Integrate with the Vue+Vite front-end (see main project README)

---

## Credits
- Built with Node.js, Express, Socket.IO, SQLite, and TypeScript
- OOP design for maintainability and clarity

---

For any questions or contributions, please open an issue or submit a pull request.

---

## Example .env (server-only)

SQLite (default)
```
PORT=3080
FRONTEND_URL=http://localhost:3080
TRUST_PROXY=false
BCRYPT_COST=12

DATABASE_DRIVER=sqlite
SQLITE_FILE=./Database/SqlLite/data.sqlite
```

Postgres (stub; adapter not implemented yet)
```
PORT=3080
FRONTEND_URL=http://localhost:3080
TRUST_PROXY=false
BCRYPT_COST=12

DATABASE_DRIVER=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=chat
POSTGRES_USER=chat
POSTGRES_PASSWORD=chat
POSTGRES_SSL=false
```

MySQL (stub; adapter not implemented yet)
```
PORT=3080
FRONTEND_URL=http://localhost:3080
TRUST_PROXY=false
BCRYPT_COST=12

DATABASE_DRIVER=mysql
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DB=chat
MYSQL_USER=chat
MYSQL_PASSWORD=chat
MYSQL_SSL=false
```

Redis (optional, for future use)
```
REDIS_URL=redis://redis:6379
```

---

## Troubleshooting

- Port already in use (3080/8080/6379/5432/3306)
  - Stop conflicting services or change ports in `docker-compose.yml`.

- Database file not created (SQLite)
  - Ensure `SQLITE_FILE` points to a writable path.
  - In Docker, the server mounts `sqlite_data:/data` and expects `/data/chat.sqlite`.

- Cannot connect to Postgres/MySQL
  - Use the service name as host inside compose network (`postgres`, `mysql`).
  - Verify env vars match compose and that the service is enabled and healthy.
  - Note: Adapters are stubs; enable only after implementation.

- Redis not found
  - Ensure `redis` service is running or point `REDIS_URL` to a reachable instance. See `REDIS.md`.

- Undo window not available
  - The per-user undo snapshot is stored in Redis with a 10-minute TTL. If `getUndoTTL` returns 0, the key expired or the action was not initiated by this user.

- Wrong driver selected
  - `DATABASE_DRIVER` must be one of `sqlite`, `postgres`, `mysql`.
  - If unset, default is `sqlite`.
