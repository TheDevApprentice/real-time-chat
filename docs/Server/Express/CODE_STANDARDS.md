# Code Standards Review (Express Server)

This document reviews coding standards and practices in the Express server codebase, with emphasis on SOLID, Clean Architecture principles, consistency, safety, and maintainability. Paths below are relative to `server/Express/`.

## Mini Table of Contents

- [Summary](#summary)
- [Structure & Layering](#structure--layering)
- [SOLID Principles](#solid-principles)
- [Clean Architecture Practices](#clean-architecture-practices)
- [Security & Operational Concerns](#security--operational-concerns)
- [Error Handling & Logging](#error-handling--logging)
- [Testing Strategy](#testing-strategy)
- [Consistency & Style](#consistency--style)
- [Dependency Injection](#dependency-injection)
- [WebSocket Design](#websocket-design)
- [Database & Repositories](#database--repositories)
- [Actionable Improvements](#actionable-improvements)

## Summary

- The project follows a layered structure (`api`, `domain`, `infrastructure`) and central `server.ts` bootstrap.
- Strong separation of HTTP (REST), WebSocket (WS), domain services, and infrastructure adapters is evident.
- Security and operational middleware (Helmet, CSRF cookies, CORS, cookie parsing) are configured early.
- Opportunities exist to standardize cross-cutting concerns, dependency injection, error handling and DTO validation.

---

## Structure & Layering

- `api/` contains:
  - `routes/REST/` (Express routers/controllers)
  - `routes/WS/` (WebSocket gateway, routers, controllers)
  - `middleware/` (e.g., `csrf`)
  - `di/` (dependency injection bindings if present)
- `domain/` contains:
  - `entities/` (e.g., `User.ts`, `Room.ts`, `Message.ts`, `Friend.ts`, `UserSession.ts`)
  - `interfaces/` (ports for databases, storage, cache)
  - `services/` (application/domain services; orchestration, business rules)
- `infrastructure/` contains:
  - `db/` (adapters/implementations for databases; schema bootstrap handled at connection time)

This layering matches Clean Architecture intent: `api` depends on `domain`, `infrastructure` implements `domain` interfaces. Ensure no inward dependency from `domain` to `api` or framework-specific code.

---

## SOLID Principles

- **Single Responsibility**
  - Entities in `domain/entities/` hold domain state/behavior; controllers in `api/routes/*/controllers` handle transport; services in `domain/services/` encapsulate use-cases. SRP is generally respected.
  - Recommendation: keep controllers thin; avoid embedding business logic in controllers.

- **Open/Closed**
  - Domain interfaces (ports) in `domain/interfaces/` allow new infrastructure implementations without changing domain code (good).
  - Recommendation: extend via new implementations under `infrastructure/` and configure via DI.

- **Liskov Substitution**
  - Applies to interface-based adapters (DB/Cache/Storage). Ensure implementations fully respect interface contracts (e.g., return types, error semantics).

- **Interface Segregation**
  - Splitting `interfaces/` into logical folders (db, cache, storage) is positive. Validate each interface is minimal and cohesive (avoid kitchen-sink interfaces).

- **Dependency Inversion**
  - `domain` uses interfaces; infrastructure implements them (good). Check that **composition root** binds concrete adapters to interfaces (likely in `api/di/` or WS/REST gateway constructors). Controllers/services should depend on interfaces only.

---

## Clean Architecture Practices

- **Entities**: `domain/entities/*.ts` define core models; they should remain framework-agnostic and avoid persistence/transport concerns.
- **Use Cases / Services**: `domain/services/*` should be pure business workflows orchestrating repositories and entities.
- **Interfaces / Ports**: `domain/interfaces/*` define repository or gateway contracts.
- **Adapters**: `infrastructure/db/*` implement repositories.
- **Delivery**: `api/routes/REST` and `api/routes/WS` adapt HTTP/WebSocket requests to use-cases.

Recommendations:
- Provide DTOs for input/output at boundaries (validation & mapping). `domain/dto/` is present; populate and use consistently.
- Centralize mapping between DTOs and entities (e.g., map layer or mappers in `api`).
- Ensure circular dependencies are avoided (domain must not import from api/infrastructure).

---

## Security & Operational Concerns

- `server.ts` sets:
  - Helmet with CSP: good; `style-src 'unsafe-inline'` is kept conservative for the test UI. Validate production policy carefully.
  - CORS with configured `FRONTEND_URL` and credentials: OK.
  - CSRF: `issueCsrfCookie` and `verifyCsrfToken` for `/api` mutations: good defense.
  - Static files from `public/` served after security middleware: OK.
  - `trust proxy`: configured from `TRUST_PROXY`. Good for accurate client IPs.
  - Redis connection lifecycle in `start()`: connects and gracefully disconnects on SIGINT/SIGTERM.

Recommendations:
- Rate limiters for REST endpoints and web socket authentication endpoints (especially auth/login/room creation) using the trusted IP.
- Input validation for REST (e.g., zod/joi/class-validator) and structured error handling.
- Explicit CORS `allowedHeaders` to include Authorization if needed.

---

## Error Handling & Logging

- `Logger` abstraction exists. Ensure controllers/services log context-rich messages (userId, roomId, messageId) and return sanitized errors to the client.
- Recommendation: standard error shape (code, message, details) to clients; map technical errors to 4xx/5xx consistently.

---

## Testing Strategy

Recommendations:
- Unit tests: services and mappers with mocks for interfaces in `domain/interfaces`.
- Integration tests: against `infrastructure/db` repositories with a test DB setup.
- End-to-end tests: minimal suite to validate WS handshake, room join, send/receive, friend flows.

---

## Consistency & Style

- TypeScript configuration under `server/Express/tsconfig.json` should enforce strictness where possible in server code (null checks, noImplicitAny). Consider enabling `strict` gradually.
- Use consistent naming: Controllers end with `*Controller`, Services with `*Service`, Interfaces with `I*` or placed in `interfaces/` folders.
- Keep public APIs documented (JSDoc on services/controllers methods) since this is a collaborative codebase.

---

## Dependency Injection

- If `api/di/` provides a container, prefer constructor injection for controllers/services.
- Composition root(s): `server.ts` (for app-wide), `api/routes/WS/router/WebSocketGateway.ts` (for WS), and REST router bootstrap. Bind concrete infra implementations there.
- Avoid service locator anti-pattern (global singletons) except for cross-cutting infrastructure (e.g., Logger) if justified.

---

## WebSocket Design

- `api/routes/WS/` exports a `WebSocketGateway`, `WsRouter`, and multiple Controllers. This is a good separation.
- Use message/action schemas (type-safe) for inbound/outbound messages; validate payloads before invoking services.
- Ensure per-connection context (`WsContext`) carries authenticated identity and scoped resources.

---

## Database & Repositories

- `infrastructure/db/*` should implement `domain/interfaces/dbInterfaces/*`.
- Validate transaction boundaries for multi-step operations (create room + add users + initial message, etc.).
- Prefer returning domain entities or DTOs, not raw DB rows, at boundaries.

---

## Actionable Improvements

1. **Validation Layer**
   - Add schema validation (zod/joi) for REST/WS payloads and centralize 400/422 error responses.

2. **DTO Usage**
   - Normalize input/output DTOs and mapping; ensure controllers don’t return entities with private fields.

3. **Strict TS**
   - Gradually enable `strict` in server `tsconfig.json` and fix surfaced issues.

4. **Rate Limiting**
   - Apply per-IP and/or per-user rate limits on sensitive endpoints and WS actions.

5. **Observability**
   - Structured logging, request IDs, and minimal metrics counters (auth success/failure, ws connections, messages per room).

6. **Testing Baseline**
   - Introduce unit + integration test skeletons to lock behavior early.

7. **Docs**
   - For each layer, add short README (interfaces, services, infra adapter responsibilities) to reduce onboarding time.

---

## Unit of Work (UoW) – Guidelines & Examples

The server uses a Unit of Work provider to make transaction intent explicit. Services orchestrate business logic with `unitOfWork.tx/noTx`, while repositories expose atomic (single‑statement) operations only.

Mini Table of Contents
- Guidelines
- Examples
  - Simple read (noTx)
  - Simple write (noTx)
  - Multi‑step flow (tx)
- See also

Guidelines
- Use `noTx` for reads and simple single‑step writes.
- Use `tx` for multi‑step flows that must be atomic (all‑or‑nothing), especially across multiple repos.
- Keep repository methods atomic; do not orchestrate multi‑step flows inside repos.
- Nested transactions are flattened by DB adapters (nested `withTransaction` reuses the same connection/transaction).
- Writes in repos should use executor helpers (`runWrite`, `insertGetLastId`) for consistent retry/backoff.

Examples

1) Simple read (noTx)
```ts
// In a service
type UowRunner = <T>(fn: (uow: { usersRepo: { getUsers: () => Promise<User[]> } }) => Promise<T>) => Promise<T>;
type Uow = { tx: UowRunner; noTx: UowRunner };

export class UserService {
  constructor(private readonly uow: Uow) {}

  getUsers(): Promise<User[]> {
    return this.uow.noTx(async ({ usersRepo }) => usersRepo.getUsers());
  }
}
```

2) Simple write (noTx)
```ts
// In a service
export class MessageService {
  constructor(private readonly uow: { noTx: <T>(fn: (u: { messagesRepo: { addMessageToRoom: (m: Message, roomId: string) => Promise<void> } }) => Promise<T>) => Promise<T> }) {}

  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.addMessageToRoom(message, roomId));
  }
}
```

3) Multi‑step flow (tx)
```ts
// In a service
export class RoomService {
  constructor(private readonly uow: { tx: <T>(fn: (u: { roomsRepo: { addUsersToRoomBulk: (ids: string[], roomId: string) => Promise<void> };
                                                           messagesRepo: { addMessageToRoom: (m: Message, roomId: string) => Promise<void> } }) => Promise<T>) => Promise<T> }) {}

  async addUsersAndWelcome(roomId: string, userIds: string[], welcome: Message): Promise<void> {
    await this.uow.tx(async ({ roomsRepo, messagesRepo }) => {
      await roomsRepo.addUsersToRoomBulk(userIds, roomId);
      await messagesRepo.addMessageToRoom(welcome, roomId);
    });
  }
}
```

See also:
- [infrastructure/transaction/UnitOfWork.ts](./infrastructure/transaction/UnitOfWork.ts) – provider and semantics (tx/noTx)
- [infrastructure/sql/executor.ts](./infrastructure/sql/executor.ts) – write retry/backoff helpers
- [ARCHITECTURE.md](./ARCHITECTURE.md) – overall layering and flows
- Service files under [domain/services/dbServices/](./domain/services/dbServices/) – concrete usage
