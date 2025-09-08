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
