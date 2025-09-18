# Project Architecture (Express Server)

This document explains the overall architecture of the server under `server/Express/`, its layers, and the role of key files in each layer. It also walks through the end-to-end request/response and WebSocket flows and how dependencies are managed.

> Layers follow Clean Architecture intent: `api` (delivery) -> `domain` (business) -> `infrastructure` (adapters). The `server.ts` is the composition root that wires everything and starts HTTP/WS services.

---

## Mini Table of Contents

- [Top-Level Overview](#top-level-overview)
- [Layer: API (Delivery)](#layer-api-delivery)
- [Layer: Domain (Business)](#layer-domain-business)
- [Layer: Infrastructure (Adapters)](#layer-infrastructure-adapters)
- [Data & Control Flow](#data--control-flow)
- [Environment & Security](#environment--security)
- [Composition Root & Dependency Direction](#composition-root--dependency-direction)
- [Roles Cheat Sheet (by folder)](#roles-cheat-sheet-by-folder)
- [Future Enhancements](#future-enhancements)

## Top-Level Overview

- `server.ts`
  - Bootstraps the Express app and HTTP server.
  - Applies security and operational middleware: CORS, Helmet (CSP), CookieParser.
  - Issues CSRF cookie and verifies CSRF token for `/api/*` mutations.
  - Serves static test UI (`public/`) and `index.html` at `/`.
  - Creates the WebSocket gateway (`WebSocketGateway`) on the HTTP server.
  - Starts Redis connection lifecycle (`RedisService`).

- `api/`
  - Delivery layer: REST routers/controllers and WebSocket gateway/controllers.
  - Applies transport concerns (HTTP routes, WS events, middleware, CSRF).

- `domain/`
  - Business layer: entities, service/use-cases, and interfaces (ports) for persistence, cache, storage.
  - Framework-agnostic, no imports from Express or concrete DB libraries.

- `infrastructure/`
  - Adapters implementing `domain/interfaces/*` using concrete technologies (DB, cache, storage).
  - DB schema bootstrap happens at adapter connection time.

- `public/`
  - Desktop-only test UI and its compiled bundle.

- `utils/`
  - Shared utilities like `Logger`.

---

## Layer: API (Delivery)

Directory: `api/`

- `routes/REST/`
  - Express router(s) that expose REST endpoints for authentication, rooms, messages, users, etc.
  - Typical files:
    - `index.ts` – mounts sub-routers under `/api`.
    - `*Controller.ts` – per-resource controllers; perform request parsing/validation, call domain services, map responses to DTOs.
  - Middleware (`api/middleware/`):
    - `csrf.ts` – `issueCsrfCookie`, `verifyCsrfToken` to protect mutating routes; mounted from `server.ts` before `/api`.

- `routes/WS/`
  - `router/WebSocketGateway.ts` – binds Socket.IO to the HTTP server and composes controllers via a `WsRouter`.
  - `router/WsRouter.ts` / `router/WsContext.ts` – router and per-connection context (user identity, services, etc.).
  - Controllers:
    - `AuthWsController.ts` – handshake/auth, login/logout over WS.
    - `RoomsWsController.ts` – room list, create/join/leave.
    - `MessagesWsController.ts` – send/receive messages, status updates.
    - `FriendsWsController.ts` – friend requests, accept/deny, list.

- `di/`
  - Composition helpers (if present) to bind domain interfaces to infrastructure instances for REST/WS controllers.

> API layer depends on `domain` services and interfaces. It should not depend on `infrastructure` directly (bind via DI), though in practice, small projects sometimes instantiate infra directly here.

---

## Layer: Domain (Business)

Directory: `domain/`

- `entities/`
  - `User.ts`, `Room.ts`, `Message.ts`, `Friend.ts`, `UserSession.ts` and `index.ts`.
  - Hold core data and minimal behavior. Should not import Express, Socket.IO, or DB clients.

- `interfaces/`
  - `dbInterfaces/` – repository interfaces (e.g., `IUserRepository`, `IRoomRepository`, `IMessageRepository`, etc.).
  - `cacheInterfaces/` – cache contracts (e.g., presence, rate-limits) implemented by Redis.
  - `storageInterface/` – object storage contract for uploads.

- `services/`
  - `dbServices/` – orchestrate domain workflows via repositories (create room, list rooms, send message, mark status, friend flows).
  - `cacheServices/` – e.g., `RedisService` for presence/counters.
  - `storageServices/` – MinIO/S3 interactions through the storage interface.

> Domain layer declares ports (interfaces). Implementations live in `infrastructure/`. Services depend on interfaces and are wired at composition root.

---

## Layer: Infrastructure (Adapters)

Directory: `infrastructure/`

- `db/`
  - Implementations of the repository interfaces (`domain/interfaces/dbInterfaces/*`). Default driver is MariaDB via ProxySQL (production/default). SQLite adapter may exist for tests/dev-only scenarios.
  - Responsible for schema bootstrap, migrations, connection pooling, and mapping DB rows <-> domain entities/DTOs.

- Cache and storage adapters (if present) are implemented here as well, e.g. Redis, MinIO.

> These adapters must not leak DB-specific types to `domain`. They return domain entities or DTOs defined at the boundary.

---

## Data & Control Flow

### REST request flow
1. Client issues HTTP request to `/api/...`.
2. `server.ts` ensures CSRF token is verified for mutating endpoints; Express router (`api/routes/REST`) receives the call.
3. Controller parses/validates input, then calls a `domain/services/*` method.
4. The service accesses persistence via `domain/interfaces/*` (repositories), bound to concrete adapters in composition root.
5. Service returns entities/DTOs back to controller, which maps to HTTP response (status, payload).

### WebSocket flow
1. `server.ts` creates HTTP server. `WebSocketGateway` attaches Socket.IO.
2. On connection, `WsRouter` creates a `WsContext` (authenticated identity, DI-bound services) and routes events to controllers.
3. WS controllers validate payloads, call `domain/services/*`, and emit events back to the client rooms or sockets.
4. Presence, unread counts, message status updates are pushed as events.


## Persistence and Unit of Work

The server uses a Unit of Work (UoW) provider to make transaction intent explicit and to keep repository methods atomic and simple.

- UoW lives in `infrastructure/transaction/UnitOfWork.ts` and exposes two runners:
  - `unitOfWork.tx(fn)` – run multiple repository calls in a single DB transaction.
  - `unitOfWork.noTx(fn)` – run without an explicit transaction.

- Repositories are atomic adapters:
  - Each method performs a single SQL statement (insert/update/delete/select) and returns.
  - No multi-step orchestration in repositories. Multi-step logic belongs to domain services.
  - Writes use executor helpers with retry/backoff for transient errors (`infrastructure/sql/executor.ts`).

- Services (domain) orchestrate business flows:
  - Use `noTx` for reads and simple single-step writes.
  - Use `tx` for multi-step flows that must be atomic (e.g., add many users to a room).
  - Example: `RoomService.addUsersToRoomBulk` uses `unitOfWork.tx` to add members atomically.

- Nested transactions are flattened:
  - The DB adapters (SQLite/MySQL) implement `withTransaction` so nested calls reuse the same connection/transaction instead of opening a new one.

This approach keeps the domain in control of transactional boundaries while ensuring infra remains a thin persistence layer.

### Database Access (MariaDB via ProxySQL)
- The application connects to MariaDB through ProxySQL (host `proxysql`, port `6033` inside the Compose network).
- ProxySQL performs health checks, pooling, and load balancing across the Galera cluster, hiding topology changes from the application.
- Required env vars (see `Readme.md` for full list): `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DB`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_SSL`.

### Presence & unread counts
- Presence is cached (Redis) and queried via a domain service; clients display `online/last seen` indicators.
- Unread counts are computed on server and emitted via `unreadCounts` to subscribed clients.

---

## Environment & Security

- `.env` read via `@dotenvx/dotenvx` in `server.ts`.
- Key variables: `FRONTEND_URL`, `PORT`, `TRUST_PROXY`, database (`MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DB`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_SSL`), cache (`REDIS_URL`), object storage (`S3_ENDPOINT`, `S3_BUCKET`, `S3_PUBLIC_URL_BASE`, `S3_USE_PATH_STYLE`), and TURN/STUN (`WEBRTC_*`).
- Helmet CSP is set to allow Socket.IO and the static UI; review production policy depending on deployment.

---

## Composition Root & Dependency Direction

- `server.ts` is the system composition root:
  - Configures Express, middleware, CSRF, static assets.
  - Instantiates `WebSocketGateway` with the HTTP server.
  - Starts Redis and handles graceful shutdown.
- For WS/REST controllers, dependencies to domain services should be provided via DI (see `api/di/` if used). If not yet centralized, introduce a small DI container to avoid implicit singletons.

> Dependency Rule: `api` -> `domain` (interfaces/services) and `domain` -> `interfaces`. `infrastructure` implements `interfaces`. `domain` never imports from `api` or `infrastructure`.

---

## Roles Cheat Sheet (by folder)

- `api/routes/REST/*`
  - HTTP controllers/routers; map HTTP to use-cases; return HTTP responses.
- `api/routes/WS/*`
  - WebSocket router/gateway/controllers; map events to use-cases; broadcast results.
- `api/middleware/*`
  - Cross-cutting HTTP middleware: CSRF, possibly authz/rate-limits.
- `domain/entities/*`
  - Core business models; framework-agnostic.
- `domain/services/*`
  - Orchestrate workflows; depend on repository/cache/storage interfaces.
- `domain/interfaces/*`
  - Ports for infrastructure (repositories, cache, storage).
- `infrastructure/db/*`
  - DB adapter implementations of repository interfaces; mappings and SQL/ORM code.
- `utils/*`
  - Logging and shared utilities.

---

## Future Enhancements

- Central DTOs + validators for both REST and WS boundaries.
- Light DI container binding interfaces -> infra in one place.
- Minimal acceptance tests for critical flows (auth, join room, send/receive, friends).
