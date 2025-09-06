# Express Test UI (public/) – Architecture & Build Guide

This folder contains the desktop-only test UI for the real-time chat server. It is a lightweight TypeScript frontend that compiles to a single JavaScript bundle loaded by `index.html`.

The UI is organized by concern into multiple `.ts` files and assembled with a simple TypeScript build (no bundler, no modules). All globals are placed on `window` to keep the integration simple.

---

## tsconfig.json – Build Configuration

File: `server/Express/public/tsconfig.json`

Key options:
- `target: "ES2019"`
  - Output modern JS compatible with current browsers.
- `module: "none"`
  - No ESM/CommonJS modules; everything is concatenated, exposing globals on `window`.
- `outFile: "chat-client.js"`
  - Produces a single bundle consumed by `index.html`.
- `moduleResolution: "classic"`
  - Prevents Node-style resolution/typing from polluting the browser build.
- `skipLibCheck: true`
  - Faster builds; lib type checking skipped.
- `lib: ["DOM", "ES2019"]`
  - Only browser APIs + ES features.
- `types: []`
  - Opt-out of ambient Node types which can conflict with DOM.
- `include: ["refs.ts", "*.ts"]`
  - Entry file `refs.ts` plus all local `.ts` files.

Compile command (from `server/Express/public/`):

```bash
npx tsc -p tsconfig.json
```

This emits a single `chat-client.js` file used by the UI.

---

## File-by-File Overview

- `index.html`
  - Static markup and CSS links for the test UI.
  - Loads one script: `./chat-client.js` (the compiled bundle).

- `refs.ts`
  - Entry file listing all `.ts` sources in dependency order using triple-slash references.
  - Controls the final order of concatenation into `chat-client.js`.

- `core.ts`
  - Cross-cutting utilities:
    - `ensureTheme()` – sets an initial theme so CSS variables apply.
    - `debounce(fn, wait)` – simple debounce helper.
    - `getCookie(name)` – cookie reader.
    - `formatRelative(ts)` – relative time for presence labels.

- `dom.ts`
  - UI helpers (globals):
    - `showSidebar(show)`, `showChat(show)`, `syncLayoutVisibility()` – layout visibility.
    - `setTypingBanner(text)`, `renderTypingBanner()` – typing indicator just under the title.

- `friends.ts`
  - Friends and friend-requests dropdown toolbars (globals):
    - Renders accepted friends and pending requests.
    - Updates the requests badge and auto-closes when no pending.
    - Accept/Reject actions wired to the server.
    - `startDM(friendId, friendName)` – creates/opens a DM.
    - `requestFriendList()` – fetches friends and re-renders dropdowns.

- `search.ts`
  - User search bar logic (globals):
    - Debounced search to `/api/chat/users/search`.
    - `+` button to send a friend request.

- `rooms.ts`
  - Unified rooms & DMs list (globals):
    - `renderRoomList()` – renders all rooms with icons and unread badges.
    - `renderParticipants(users)` – displays the participants line.
    - `joinRoom(room)` – opens a room, resets unread, triggers DM presence.

- `messaging.ts`
  - Chat messaging (globals):
    - `renderMsg(message)` – renders a single message with status tick for own messages.
    - Send-form submit handler – emits `sendMessageToRoom`.
    - Typing start/stop + blur – emits `typingStart/typingStop` to server.

- `room_creation.ts`
  - Room creation drawer & invites (globals):
    - Drawer open/close controls.
    - Create-room form submit.
    - Private toggle to reveal invite UI.
    - Invites: `renderInvitedUsers()`, `runInviteSearch(q)` over accepted friends.

- `sockets.ts`
  - Socket.IO wiring and app state (globals):
    - Initializes a single global `socket` (`window.socket`).
    - Authentication via cookie token on load.
    - Handles server events: `rooms`, `roomUsers`, `roomHistory`, `message`, `messageStatusUpdated`, `unreadCounts`, `typing`, `friendUpdated`, `forceLogout`, `error`.
    - Delegates to UI helpers: `renderRoomList`, `renderMsg`, `renderParticipants`, `requestFriendList`, `renderTypingBanner`, etc.

- `chat-client.ts`
  - Auth UI only + small bridges:
    - Login/Register form handlers (including cookie set on success).
    - Logout / LogoutAll buttons.
    - Close-chat button (clears `window.selectedRoom`, resets UI).
    - DM presence helpers exposed globally: `setupDmPresence(room)`, `fetchPresence(userId)`.
    - Minimal residual code that calls into the helpers above.

- `base.css`, `chat.css`
  - Styling for the test UI.

---

## Compile – Single Command

From `server/Express/public/`:

```bash
npx tsc -p tsconfig.json
```

This produces `chat-client.js` that `index.html` loads. If running in Docker, rebuild the `server` container or hard refresh the page to pull latest JS.

---

## End-to-End UI Flow (What happens in the browser)

Below is the high-level sequence focusing on the UI code paths and the files responsible for each step.

1) Page load + theme
- `core.ts` → `ensureTheme()` applies a default theme so CSS variables are set.
- `index.html` loads the bundle `chat-client.js`.

2) Socket initialization and auth
- `sockets.ts` creates a global `socket` (`window.socket = io()`).
- `sockets.ts` reads `session_token` (via `getCookie`) and emits `authenticate` if present.
- On success:
  - Sets `window.currentUser`.
  - Calls `showAuthPanel(false)` (from `chat-client.ts`), `syncLayoutVisibility()` (from `dom.ts`).
  - Emits `getRooms` to fetch rooms and calls `requestFriendList()` (from `friends.ts`).
- On failure/no token:
  - Calls `showAuthPanel(true)` so login/register are visible.

3) Friends & requests toolbar
- `friends.ts` exposes `requestFriendList()` and populates dropdowns (accepted/pending).
- Badge shows count of pending; auto-closes when it reaches zero.
- Clicking `Message` in friends dropdown calls `startDM()` which either opens an existing DM or emits `createRoom`.
- The requests dropdown will not open if there are no pending requests.

4) Rooms list (unified Conversations & Rooms)
- `sockets.ts` handles `rooms` and sets `window.rooms`.
- `rooms.ts` → `renderRoomList()` lists all rooms (DMs show 👤, others 📁) with unread badges and active highlight.
- Clicking an item calls `joinRoom(room)` which:
  - Sets `window.selectedRoom = room`.
  - Clears unread for that room and emits `joinRoom`.
  - Triggers DM presence (`setupDmPresence`) if `room.type === 'user'`.

5) Participants & presence in a DM
- `sockets.ts` handles `roomUsers` and calls `renderParticipants(users)` (from `rooms.ts`).
- If this is a DM, it also calls `setupDmPresence({ type: 'user', users })`.
- `chat-client.ts`:
  - `setupDmPresence(room)` uses `fetchPresence(otherUserId)` and updates a small label near the title:
    - `• en ligne` when online.
    - `• vu …` using `formatRelative(lastSeen)`.
    - `• hors ligne` otherwise.
  - A 30s interval keeps presence info fresh.

6) History and live messages
- `sockets.ts` handles `roomHistory` and calls `renderMsg(message)` (from `messaging.ts`) for each past message.
- `sockets.ts` handles `message`:
  - If the room is open, it renders and acknowledges delivery/read for messages from others.
  - If another room, increments unread for that room and re-renders the list.
- `sockets.ts` handles `messageStatusUpdated` and updates ticks in the open room.

7) Typing indicators
- `messaging.ts` listens to the message input:
  - Emits `typingStart` if typing starts, `typingStop` on inactivity or blur.
- `sockets.ts` handles `typing` from the server and updates a banner via `renderTypingBanner()` (from `dom.ts`).

8) Sending messages
- `messaging.ts` handles the chat form submit:
  - Emits `sendMessageToRoom` with content and timestamp.

9) Create a room (and private rooms with invites)
- `room_creation.ts` controls the left-side drawer and the create-room form.
- Toggling "private" reveals an invite search over accepted friends:
  - `runInviteSearch(q)` filters accepted friends locally.
  - `renderInvitedUsers()` manages the invited list UI.
- Submit emits `createRoom` with `isPublic` or with `invitedUserIds` for private.

10) Logout / Close chat
- `chat-client.ts` wires Logout / LogoutAll buttons.
- `chat-client.ts` close chat button:
  - Clears `window.selectedRoom`, empties chat, stops presence timer, and resyncs layout.

11) Edge cases
- `sockets.ts` handles `forceLogout`: clears cookie/user and shows auth panel.
- Errors during auth/REST show a message in the auth area or via `alert()` when already authenticated.

---

## Tips & Conventions
- Keep functions small and side-effect free; expose only what’s needed on `window`.
- If you add a new concern, create `xyz.ts` and add it to `refs.ts` before `chat-client.ts`.
- Always compile with `npx tsc -p tsconfig.json` to generate a single `chat-client.js`.
- If UI doesn’t reflect changes, hard refresh (Ctrl+F5) or rebuild the Docker `server` service.
