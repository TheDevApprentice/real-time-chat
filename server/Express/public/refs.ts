// refs.ts - TypeScript build entry for chat UI (desktop-only)
// Build to a single bundle (no modules) with:
//   npx tsc --target ES2019 --module none --outFile chat-client.js refs.ts
// This file lists all source files in dependency order using triple-slash references.
// Initially we only include chat-client.ts. We will split concerns into multiple
// files (core.ts, dom.ts, auth.ts, rooms.ts, friends.ts, room_creation.ts,
// search.ts, messaging.ts, sockets.ts) and add them here step-by-step.

/// <reference path="./core.ts" />
/// <reference path="./dom.ts" />
/// <reference path="./friends.ts" />
/// <reference path="./search.ts" />
/// <reference path="./rooms.ts" />
/// <reference path="./messaging.ts" />
/// <reference path="./room_creation.ts" />
/// <reference path="./invites.ts" />
/// <reference path="./sockets.ts" />
/// <reference path="./analytics.ts" />
/// <reference path="./calls.ts" />
/// <reference path="./chat-client.ts" />
