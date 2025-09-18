 # Database: schema, entities, and relationships
 
 This document explains how the server creates the database schema, what tables exist, how they relate to each other, and how they map to the domain entities. It also shows where the schema code lives and how database access is structured.
 
 Paths are relative to `server/Express/`.
 
 ---
 
 ## How the schema is created
 
 - Composition root
   - `server.ts` selects the DB driver (MariaDB via ProxySQL by default, SQLite for tests/dev) and builds the infrastructure layer.
 - Schema initializer
   - `infrastructure/migrations/initializeSchema.ts` creates tables and indexes idempotently per driver with `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
 - Drivers supported
   - MariaDB (via ProxySQL) and SQLite. The MySQL branch in the initializer is compatible with MariaDB.
 - Where SQL is executed
   - Through the unified callback DB adapter interface `infrastructure/adapters/callbackDb.ts`, provided by:
     - `infrastructure/adapters/mysqlCallbackDb.ts` (for MariaDB/MySQL)
     - `infrastructure/adapters/sqlliteCallbackDb.ts` (for SQLite)
 - Transactions and UoW
   - `infrastructure/transaction/UnitOfWork.ts` orchestrates transactions; repositories run single-statement operations and domain services compose multi-step flows.
 
 ---
 
 ## Tables and columns
 
 Source of truth: `infrastructure/migrations/initializeSchema.ts`.
 
 The SQL differs slightly by driver (column types), but table shapes are equivalent.
 
 - users
   - id: string (PK)
   - name: string (NOT NULL)
   - password: string (hashed, NOT NULL)
 
 - rooms
   - id: string (PK)
   - name: string (NOT NULL)
   - creatorId: string (NOT NULL) – user who created the room
   - createdAt: integer (ms epoch, NOT NULL)
   - type: string (default 'room') – could be 'dm' or other future types
   - isPublic: boolean/integer (default 1)
 
 - user_rooms (join table)
   - userId: string (FK → users.id)
   - roomId: string (FK → rooms.id)
   - PK (userId, roomId)
 
 - messages
   - id: bigint/integer (PK, autoincrement)
   - authorId: string (optional)
   - authorName: string (optional, legacy denormalized)
   - content: text
   - timestamp: integer (ms epoch)
   - roomId: string (FK → rooms.id, NOT NULL)
   - status: string (default 'sent')
   - sentAt: integer (ms epoch)
   - deliveredAt: integer (ms epoch)
   - readAt: integer (ms epoch)
 
 - user_sessions
   - id: string (PK)
   - userId: string (FK → users.id, NOT NULL)
   - token: string (UNIQUE, NOT NULL)
   - createdAt: integer (ms epoch, NOT NULL)
   - expiresAt: integer (ms epoch, nullable)
   - refreshToken: string (UNIQUE, nullable)
   - refreshTokenExpiresAt: integer (ms epoch, nullable)
 
 - friends
   - id: string (PK)
   - userA: string (FK → users.id, NOT NULL)
   - userB: string (FK → users.id, NOT NULL)
   - status: string (NOT NULL) – e.g. 'pending' | 'accepted'
 
- indexes (created by initializer)
  - user_sessions: unique on `token`, unique on `refreshToken`, index on `userId`
  - friends: indexes on `userA`, `userB`, plus composite `(userA, status)` and `(userB, status)`
  - messages: composite index on `(roomId, timestamp)` for history pagination (also serves `roomId` only); index on `authorId`
  - user_rooms: index on `roomId` to fetch members by room (PK `(userId, roomId)` already indexes `userId`)
  - rooms: index on `creatorId`; index on `isPublic` (filters/public browsing); index on `name`

Optional indexes (add only if queries justify them):
- rooms: composite `(isPublic, name)` if you often filter public + name
 
---
 
## Domain entities and mapping
 
Source of truth for entities: `domain/entities/*` and DTO mappers in `domain/dto/mappers/*`.
 
 - User (`domain/entities/User.ts`)
   - Fields: `id`, `name`, `password` (hashed)
   - Maps to `users` rows. Exposed to API via `UserDTO` (without `password`).
 
 - Room (`domain/entities/Room.ts`)
   - Fields: `id`, `name`, `creatorId`, `createdAt`, `type`, `isPublic`
   - Members are represented via the `user_rooms` join table.
   - Exposed via `RoomDTO`.
 
 - Message (`domain/entities/Message.ts`)
   - Fields: `id`, `authorId?`, `authorName?`, `content`, `timestamp`, `roomId`, `status`, `sentAt?`, `deliveredAt?`, `readAt?`
   - Exposed via `MessageDTO`.
 
 - Friend (`domain/entities/Friend.ts`)
   - Fields: `id`, `userA`, `userB`, `status`, `requesterId`, `createdAt`, `updatedAt`
   - Exposed via `FriendDTO` and `FriendListItemDTO`.
 
 - UserSession (`domain/entities/UserSession.ts`)
   - Fields: `id`, `userId`, `token`, `createdAt`, `expiresAt?`, `refreshToken?`, `refreshTokenExpiresAt?`
   - Exposed via `SessionDTO`.
 
 Repositories in `infrastructure/repos/*` are thin adapters that translate between SQL rows and entities, one SQL statement per method.
 
 ---
 
 ## Relationships (ER overview)
 
 - One-to-many
   - `users (1) → (n) user_sessions`
   - `rooms (1) → (n) messages`
 - Many-to-many
   - `users (n) ↔ (m) rooms` through `user_rooms`
 - Friendships
   - `friends` rows model an undirected relation between two users (`userA`, `userB`) plus status and requester; a UNIQUE constraint prevents duplicates.
 
 ```mermaid
 erDiagram
   USERS ||--o{ USER_SESSIONS : has
   USERS ||--o{ USER_ROOMS : is_member
   ROOMS ||--o{ USER_ROOMS : has_members
   ROOMS ||--o{ MESSAGES : contains
   USERS ||--o{ FRIENDS : participates
 
   USERS {
     string id PK
     string name
     string password
   }
   ROOMS {
     string id PK
     string name
     string creatorId
     bigint createdAt
     string type
     boolean isPublic
   }
   USER_ROOMS {
     string userId PK,FK
     string roomId PK,FK
   }
   MESSAGES {
     bigint id PK
     string authorId
     string authorName
     text content
     bigint timestamp
     string roomId FK
     string status
     bigint sentAt
     bigint deliveredAt
     bigint readAt
   }
   USER_SESSIONS {
     string id PK
     string userId FK
     string token
     bigint createdAt
     bigint expiresAt
     string refreshToken
     bigint refreshTokenExpiresAt
   }
   FRIENDS {
     string id PK
     string userA FK
     string userB FK
     string status
     string requesterId FK
     bigint createdAt
     bigint updatedAt
   }
 ```
 
 ---
 
 ## Creation order and idempotency
 
 `initializeSchema.ts` ensures tables are created in dependency-friendly order:
 
 1) `users` → 2) `rooms` → 3) `user_rooms` → 4) `messages` → 5) `user_sessions` → 6) `friends` → indexes.
 
 - Statements use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
 - For SQLite, extra `ALTER TABLE ... ADD COLUMN` are executed to upgrade older databases if needed.
 
 ---
 
 ## How repositories use the schema
 
 - Repos: `infrastructure/repos/*.ts`
   - `UsersRepo.ts`, `RoomsRepo.ts`, `MessagesRepo.ts`, `SessionsRepo.ts`, `FriendsRepo.ts`
   - Each method performs one SQL statement using helpers in `infrastructure/sql/*` (dialect flags, queryBuilder, executor).
 - Services: `domain/services/dbServices/*`
   - Compose use-cases using the Unit of Work runner (`unitOfWork.tx/noTx`).
 
 ---
 
 ## Practical notes and conventions
 
 - Time columns are stored as ms since epoch (integers) across drivers.
 - Users↔Rooms membership is only via `user_rooms`.
 - Messages retain legacy `authorName` for compatibility; prefer resolving `authorId` to a `UserDTO` on the client.
 - Sessions enforce uniqueness on `token` and `refreshToken`.
 - Friends enforce UNIQUE(userA, userB) to avoid duplicates regardless of requester.
 
 ---
 
 ## Where to change the schema
 
 - Add or modify columns/tables in `infrastructure/migrations/initializeSchema.ts`.
 - Update repositories in `infrastructure/repos/*` accordingly.
 - Reflect changes in domain entities under `domain/entities/*` and, if exposed, update DTOs/mappers in `domain/dto/*`.
 - Document changes here and in `ARCHITECTURE.md` as needed.
 
 ---
 
 ## Related files
 
 - Schema initializer: `infrastructure/migrations/initializeSchema.ts`
 - Adapters: `infrastructure/adapters/mysqlCallbackDb.ts`, `infrastructure/adapters/sqlliteCallbackDb.ts`
 - Unit of Work: `infrastructure/transaction/UnitOfWork.ts`
 - SQL helpers: `infrastructure/sql/*`
 - Repositories: `infrastructure/repos/*`
 - Entities: `domain/entities/*`
 - DTOs + mappers: `domain/dto/*`, `domain/dto/mappers/*`
 