# Domain DTOs: usage and response shapes (WS + REST)

This document summarizes the shape and usage of Domain DTOs used by the server.
All DTOs live under: `server/Express/domain/dto/`

- Barrel: `server/Express/domain/dto/index.ts`
- Mappers: `server/Express/domain/dto/mappers/*`

## DTO modules

- Users: `user.dto.ts`
- Rooms: `room.dto.ts`
- Messages: `message.dto.ts`
- Friends: `friend.dto.ts`
- Sessions/Auth: `session.dto.ts`, `auth.dto.ts`
- Calls (WebRTC signaling): `calls.dto.ts`
- Pagination: `pagination.dto.ts`

## Mappers

- `mapUserToDTO(user: User): UserDTO`
- `mapRoomToDTO(room: Room): RoomDTO`
- `mapMessageToDTO(msg: Message): MessageDTO`
- `mapFriendToDTO(f: Friend): FriendDTO`
- `mapSessionToDTO(s: UserSession): SessionDTO`

Mappers are used by controllers to serialize domain entities to DTOs.

---

## WebSocket (WS) usage

### Rooms
- Controller: `api/routes/WS/controllers/RoomsWsController.ts`
- Events:
  - `rooms` → `RoomDTO[]`
  - `roomUsers` → `{ roomId: string; users: UserDTO[] }`
  - `roomHistory` → `{ roomId: string; messages: MessageDTO[] }` (compat)
  - `loadRoomHistory(payload: RoomHistoryQueryDTO)` → returns:
    - Compat: `{ success, roomId, cursor, size, ver, messages: MessageDTO[], nextCursor? }`
    - New: `page: PageDTO<MessageDTO>` with `{ items, nextCursor? }`

### Messages
- Controller: `api/routes/WS/controllers/MessagesWsController.ts`
- Events / responses:
  - `message` → `{ roomId: string; message: MessageDTO }`
  - `sendMessageToRoom` returns `{ success, message: MessageDTO, finalUrls: string[] }`
  - Redis cache for last message stores a `MessageDTO`.

### Auth
- Controller: `api/routes/WS/controllers/AuthWsController.ts`
- Requests (typed):
  - `login(payload: LoginRequestDTO)`
  - `refreshToken(payload: RefreshTokenRequestDTO)`
- Responses include new DTO fields and keep backward-compat fields:
  - `authenticate` → `{ success, user: UserDTO, id, name }`
  - `login` → `{ user: UserDTO, token, refreshToken, expiresAt, id, name, refreshTokenExpiresAt }`
  - `refreshToken` → `{ user?: UserDTO, token, refreshToken, expiresAt, id, name, refreshTokenExpiresAt }`
  - `getSessions` → `{ success, sessions: SessionDTO[] }`

### Friends
- Controller: `api/routes/WS/controllers/FriendsWsController.ts`
- Requests (typed):
  - `friendRequest(payload: FriendRequestDTO)`
  - `friendRespond(payload: FriendRespondDTO)`
- Responses/events:
  - `friendRequest` returns `{ success, request: FriendDTO }`
  - `friendRespond` returns `{ success, result: FriendDTO }`
  - Event `friendUpdated` emits `{ type: 'request' | 'respond', data: FriendDTO, action? }`
  - `friendList` returns `{ success, items: FriendListItemDTO[] }`

### Calls (WebRTC signaling)
- Controller: `api/routes/WS/controllers/CallsWsController.ts`
- Requests (typed):
  - `callRequest(payload: CallRequestDTO & { targetUserId?: string; roomId?: string })`
    - DTO supports `calleeId` or `targetUserId` for compatibility.
  - `callAccept(payload: CallAcceptDTO)`
  - `callDecline(payload: CallDeclineDTO)`
  - `callCancel(payload: CallCancelDTO)`
  - `callOffer(payload: CallOfferDTO)`
  - `callAnswer(payload: CallAnswerDTO)`
  - `callIceCandidate(payload: CallIceCandidateDTO)`
  - `callHangup(payload: CallHangupDTO)`

---

## REST usage

### Chat
- Controller: `api/routes/REST/controllers/ChatRESTController.ts`
- Routes:
  - `GET /api/chat/rooms` → `RoomDTO[]`
  - `GET /api/chat/users/search` → `UserDTO[]`
  - `GET /api/chat/rooms/:roomId/messages` → `MessageDTO[]`
  - `GET /api/chat/rooms/:roomId/users` → `UserDTO[]`

### Users
- Controller: `api/routes/REST/controllers/UserRESTController.ts`
- Routes:
  - `GET /api/user/users` → `UserDTO[]`
  - `GET /api/user/sessions` → `SessionDTO[]`
  - `GET /api/user/sessions/:token` → `SessionDTO`

### Auth
- Controller: `api/routes/REST/controllers/AuthRESTController.ts`
- Routes (responses include DTOs and legacy fields for compatibility):
  - `POST /api/auth/register` → `{ user: UserDTO, id, name }`
  - `GET /api/auth/me` → `{ user: UserDTO, id, name }`
  - `POST /api/auth/refresh-token` → `{ user?: UserDTO, id, name, refreshToken, refreshTokenExpiresAt, expiresAt }`

---

## Pagination (PageDTO)

- DTO: `PageDTO<T> = { items: T[]; nextCursor?: number }`
- WS `loadRoomHistory` now also returns `page: PageDTO<MessageDTO>` alongside legacy fields.

---

## Backward compatibility notes

- WS Auth responses keep legacy fields (`id`, `name`, `refreshTokenExpiresAt`) while adding DTO fields (`user`, `expiresAt`).
- `loadRoomHistory` continues returning `messages` and `nextCursor` directly, with an additional `page` object.
- Calls `callRequest` accepts either `calleeId` or `targetUserId` in the payload.

---

## Validation & typing guidance

- Prefer consuming DTOs and mappers from the barrel: `import { UserDTO, mapUserToDTO, ... } from "../../domain/dto"`.
- For WS payload validation, keep using Zod schemas in `utils/ValidationUtil`, aligned with DTO shapes.

---

## Examples

### RoomDTO example
```json
{
  "id": "room-123",
  "name": "General",
  "creatorId": "u1",
  "createdAt": 1711111111111,
  "type": "room",
  "isPublic": true,
  "users": [{ "id": "u1", "name": "Alice" }]
}
```

### MessageDTO example
```json
{
  "id": "42",
  "author": { "id": "u1", "name": "Alice" },
  "content": "Hello",
  "timestamp": 1711111111111,
  "status": "sent",
  "sentAt": 1711111111111
}
```

### Auth WS login response example
```json
{
  "user": { "id": "u1", "name": "Alice" },
  "token": "...",
  "refreshToken": "...",
  "expiresAt": 1711711111111,
  "id": "u1",
  "name": "Alice",
  "refreshTokenExpiresAt": 1711411111111
}
```
