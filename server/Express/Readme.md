 # Real-Time Chat Server (Node.js)

A Node.js-based real-time chat server using Express, Socket.IO, SQLite, and strict object-oriented programming (OOP) principles. This backend powers a chat application with real-time messaging and persistent storage, intended to be paired with a Vue+Vite front-end.

---

## Table of Contents
1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Installation](#setup--installation)
4. [Environment Variables](#environment-variables)
5. [How It Works](#how-it-works)
6. [File-by-File Breakdown](#file-by-file-breakdown)
7. [Database Schema](#database-schema)
8. [Extending the Server](#extending-the-server)

---

## Features
- Real-time chat via WebSockets (Socket.IO)
- Persistent storage with SQLite
- Strict OOP for User and Message entities
- REST API for fetching users and messages
- Centralized logging utility
- Environment-based configuration

---

## Architecture Overview
- **Express** serves the HTTP API and static files
- **Socket.IO** provides real-time WebSocket communication for chat
- **SQLite** stores users and messages
- **OOP Models**: All users and messages are handled as class instances, never as plain objects
- **Logger**: All logs are timestamped and centralized

---

## Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd real-time-chat/server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file (or use the provided one) and set:
```
PORT=3000
SQLITE_FILE=./data/chat.sqlite
```
- `PORT`: Port for the server (default: 3000)
- `SQLITE_FILE`: Path to SQLite DB file (default: `./data/chat.sqlite`)

### 4. Start the server
```bash
npm run dev
```
The server will start and listen for HTTP and WebSocket connections.

---

## Environment Variables
- **PORT**: The port number for the server to listen on (required)
- **SQLITE_FILE**: Path to the SQLite database file (required)

Both are validated at startup. The server will not start if either is missing.

---

## How It Works

### Startup
- Loads environment variables using `@dotenvx/dotenvx`
- Initializes Express app and HTTP server
- Sets up middleware (CORS, JSON parser, static file serving)
- Initializes SQLite database and tables (if not present)
- Starts WebSocket service

### WebSocket Chat
- On client connection, sends the full chat history
- On receiving a new message:
  - Checks if the user exists in the DB; if not, adds them
  - Stores the message in the DB
  - Broadcasts the message to all connected clients
- On disconnect, logs the event

### REST API
- **GET /api/messages**: Returns all chat messages
- **GET /api/users**: Returns all users
- **GET /api/**: Returns a welcome message

*Note: Sending messages is done via WebSocket, not HTTP POST.*

---

## File-by-File Breakdown

| File/Folder                  | Purpose                                                                 |
|------------------------------|------------------------------------------------------------------------|
| `server.ts`                  | Main entry point; sets up Express, DB, WebSocket, routes                |
| `models/User.ts`             | Defines `User` class (id, name, JSON, DB factory)                       |
| `models/Message.ts`          | Defines `Message` class (id, author:User, content, timestamp, JSON, DB) |
| `utils/DatabaseService.ts`   | Singleton for SQLite DB connection and queries                          |
| `utils/WebSocketService.ts`  | Handles Socket.IO connections, message flow, and broadcasting           |
| `utils/Logger.ts`            | Centralized logging utility (info, infoObj, error)                      |
| `routes/chat.ts`             | REST API routes for messages and users (GET only)                       |
| `routes/index.ts`            | Mounts all API routes under `/api`                                      |
| `public/`                    | Static assets for the front-end (HTML, JS, CSS)                         |
| `data/chat.sqlite`           | SQLite database file                                                    |
| `.env`                       | Environment variables (not committed)                                   |
| `package.json`               | NPM dependencies and scripts                                            |
| `tsconfig.json`              | TypeScript configuration                                                |

---

## Database Schema

- **users**
  - `id` (TEXT, PRIMARY KEY)
  - `name` (TEXT, NOT NULL)
- **messages**
  - `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
  - `authorId` (TEXT)
  - `authorName` (TEXT)
  - `content` (TEXT)
  - `timestamp` (INTEGER)

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


compile ts file: 
npx tsc chat-client.ts --target ES2019 --module none  --skipLibCheck

npx tsc --target ES2019 --module none --outFile chat-client.js refs.ts

npx tsc -p tsconfig.json
---

# Server Updates: Database Drivers, Factory, Docker, and Redis

This section documents the current server-only architecture and how to run it with different database drivers and Redis. The server remains the single source of truth for schema initialization. Non-SQLite drivers are wired via the factory and can be enabled through environment variables.

## Database Adapters and Factory

- `server/Express/db/adapters/callbackDb.ts`
  - Defines the lightweight callback-based interface `CallbackDB` used by `DatabaseService`.
- `server/Express/db/adapters/sqlliteCallbackDb.ts`
  - Concrete SQLite implementation using `sqlite3`.
- `server/Express/db/adapters/postgresCallbackDb.ts`
  - Stub that matches `CallbackDB` but throws "not implemented" for now.
- `server/Express/db/adapters/mysqlCallbackDb.ts`
  - Stub that matches `CallbackDB` but throws "not implemented" for now.
- `server/Express/db/factory.ts`
  - Selects the proper adapter from `process.env.DATABASE_DRIVER` in `{"sqlite","postgres","mysql"}` and reads related env vars.

The `DatabaseService` (`server/Express/utils/DatabaseService.ts`) consumes the factory and is responsible for initializing tables and running all queries.

## Environment Variables (server)

Core
- `PORT` (default 3080 in Dockerfile)
- `FRONTEND_URL` (CORS origin for Socket.IO)
- `TRUST_PROXY` ("true" to trust `x-forwarded-for` in rate limiting/auth)
- `BCRYPT_COST` (hash cost)

Driver selection
- `DATABASE_DRIVER`: `sqlite` | `postgres` | `mysql` (default: `sqlite`)

SQLite
- `SQLITE_FILE`: absolute/path/in/container or local path (Docker uses `/data/chat.sqlite`)

Postgres (stub wired; real adapter pending)
- `POSTGRES_HOST` (e.g., `postgres` in docker-compose)
- `POSTGRES_PORT` (default `5432`)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `POSTGRES_SSL` ("true"/"false")

MySQL (stub wired; real adapter pending)
- `MYSQL_HOST` (e.g., `mysql` in docker-compose)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `MYSQL_SSL` ("true"/"false")

Redis (optional)
- Typically `REDIS_URL=redis://redis:6379` when used for Socket.IO scaling, rate limiting, or sessions cache. Current code does not require it, but the docker-compose provides a `redis` service for future use.

## Docker and docker-compose

The repository includes images/build contexts for:
- Server (`server/Express/Dockerfile`)
- SQLite helper container (`server/Database/SqlLite/Dockerfile`)
- Postgres image (`server/Database/Postgres/Dockerfile`)
- MySQL image (`server/Database/MySql/Dockerfile`)
- Redis image (`server/Redis/Dockerfile`)

Example compose services (may be commented by default):
- `server`: Node.js app listening on `3080`, using SQLite by default and mounting `sqlite_data:/data`.
- `sqlite`: lightweight container exposing `/data` with `sqlite3` CLI for debugging.
- `redis`: `redis:7-alpine` (or local Dockerfile) with `--appendonly yes` and volume `redis_data:/data`.
- `postgres` / `mysql`: available as commented examples. Enable when you implement their adapters.

Start everything (SQLite + Redis by default):
```bash
docker-compose up --build
```

## Switching Database Drivers

SQLite (default)
```bash
export DATABASE_DRIVER=sqlite
export SQLITE_FILE=/data/chat.sqlite        # in Docker
# or SQLITE_FILE=./Database/SqlLite/data.sqlite for local dev
```

Postgres (stub; not functional for queries yet)
```bash
export DATABASE_DRIVER=postgres
export POSTGRES_HOST=postgres
export POSTGRES_PORT=5432
export POSTGRES_DB=chat
export POSTGRES_USER=chat
export POSTGRES_PASSWORD=chat
export POSTGRES_SSL=false
```

MySQL (stub; not functional for queries yet)
```bash
export DATABASE_DRIVER=mysql
export MYSQL_HOST=mysql
export MYSQL_PORT=3306
export MYSQL_DB=chat
export MYSQL_USER=chat
export MYSQL_PASSWORD=chat
export MYSQL_SSL=false
```

## Redis Integration Notes

Redis is intended for:
- Socket.IO adapter (scale to multiple Node processes)
- Rate limiting and brute-force protection shared across instances
- Presence/status and ephemeral state
- Optional cache for read-heavy endpoints (e.g., unread counts)

The business data remains in the SQL database. Use TTLs and invalidation when caching.

## Testing the Server (server-only)

Local (without Docker)
```bash
# From server/Express
npm install
npm run build
npm run start
```

Docker (recommended for consistency)
```bash
docker-compose up --build
# Server on http://localhost:3080
# Redis on localhost:6379 (if enabled)
# Optional sqlite-web UI on http://localhost:8080
```

## Current Limitations
- Postgres/MySQL adapters are placeholders; they currently throw "not implemented".
- No migrations are included; `DatabaseService` initializes the schema for SQLite.
- If/when non-SQLite drivers are implemented, migrations/DDL should be introduced.

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
  - Ensure `redis` service is running or point `REDIS_URL` to a reachable instance.
  - Current code does not require Redis; it is optional for scaling and caching.

- Wrong driver selected
  - `DATABASE_DRIVER` must be one of `sqlite`, `postgres`, `mysql`.
  - If unset, default is `sqlite`.
