// sockets.ts - WebSocket setup and event wiring (global, no modules)
// Assumes other helpers are available globally (renderRoomList, renderMsg, renderParticipants, requestFriendList)
// and DOM helpers (showAuthPanel, syncLayoutVisibility, setTypingBanner, renderTypingBanner).

declare const io: any;

// Create a single global socket and expose it
// Include CSRF token in the handshake auth for defense-in-depth
var socket: any =
  (window as any).socket ||
  io({
    auth: {
      csrf: typeof getCookie === "function" ? getCookie("X-XSRF-TOKEN") : undefined,
    },
  });
(window as any).socket = socket;

(function () {
  const w = window as any;
  if (w.__sockets_ts_initialized__) return;
  w.__sockets_ts_initialized__ = true;

  // Shared state on window
  w.currentUser = w.currentUser || null;
  w.selectedRoom = w.selectedRoom || null;
  w.rooms = w.rooms || [];
  w.unreadCounts = w.unreadCounts || {};
  w.typingUsers = w.typingUsers || new Set<string>();
  w.dmPresenceInterval = w.dmPresenceInterval || null;

  // --- AUTH ON LOAD via cookie ---
  try {
    const token =
      typeof getCookie === "function" ? getCookie("session_token") : null;
    if (token) {
      socket.emit("authenticate", { token }, (res: any) => {
        if (res && res.success) {
          w.currentUser = { id: res.id, name: res.name };
          if (typeof showAuthPanel === "function") showAuthPanel(false);
          socket.emit("getRooms");
          if (typeof requestFriendList === "function") requestFriendList();
          if (typeof syncLayoutVisibility === "function")
            syncLayoutVisibility();
        } else {
          if (typeof showAuthPanel === "function") showAuthPanel(true);
        }
      });

  // --- Room online counter updates ---
  socket.on("roomOnline", (payload: { roomId: string; count: number }) => {
    try {
      const rid = String(payload?.roomId || '');
      const count = Number(payload?.count ?? 0) || 0;
      (window as any).statsOnOnline?.(rid, count);
    } catch {}
  });

  // --- AGGREGATED TYPING COUNT ---
  socket.on("typingCount", (payload: any) => {
    try {
      if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
        return;
      const count = Number(payload.count || 0);
      if (typeof setTypingBanner === "function") {
        if (count <= 0) setTypingBanner("");
        else if (count === 1) setTypingBanner("Quelqu'un est en train d'écrire…");
        else setTypingBanner(`${count} personnes écrivent…`);
      }
    } catch {}
  });

  // --- ROOM ONLINE COUNT ---
  socket.on("roomOnline", (payload: any) => {
    try {
      if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
        return;
      // For DM, presence label is handled by setupDmPresence; for groups show online count
      if (w.selectedRoom && w.selectedRoom.type !== "user") {
        const n = Number(payload.count || 0);
        if (typeof updatePresenceLabel === "function")
          updatePresenceLabel(`• ${n} en ligne`);
      }
    } catch {}
  });

  // --- EXPOSE WS AGGREGATION HELPERS ---
  w.getTopActiveRooms = function getTopActiveRooms(limit = 10): Promise<any> {
    return new Promise((resolve) => {
      try {
        socket.emit("getTopActiveRooms", { limit }, (res: any) => resolve(res));
      } catch {
        resolve({ success: false });
      }
    });
  };
  w.getRoomLastMessage = function getRoomLastMessage(roomId: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        socket.emit("getRoomLastMessage", { roomId }, (res: any) => resolve(res));
      } catch {
        resolve({ success: false });
      }
    });
  };
  w.getRoomMessageCounts = function getRoomMessageCounts(
    roomId: string,
    range: 'hour' | 'day' = 'hour',
    from?: number,
    to?: number
  ): Promise<any> {
    return new Promise((resolve) => {
      try {
        socket.emit("getRoomMessageCounts", { roomId, range, from, to }, (res: any) => resolve(res));
      } catch {
        resolve({ success: false });
      }
    });
  };
    } else {
      if (typeof showAuthPanel === "function") showAuthPanel(true);
    }
  } catch {}

  // --- SERVER-PUSHED UNREAD COUNTS ---
  socket.on("unreadCounts", (payload: any) => {
    try {
      const counts =
        payload && typeof payload === "object" ? payload.counts || {} : {};
      if (counts && typeof counts === "object") {
        w.unreadCounts = { ...counts };
        if (typeof w.renderRoomList === "function") w.renderRoomList();
      }
    } catch {}
  });

  // --- FORCE LOGOUT ACROSS DEVICES ---
  socket.on("forceLogout", function () {
    w.currentUser = null;
    document.cookie =
      "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    if (typeof showAuthPanel === "function") showAuthPanel(true);
    alert("Vous avez été déconnecté de tous vos appareils.");
  });

  // --- ROOMS LIST ---
  socket.on("rooms", (serverRooms: any[]) => {
    w.rooms = serverRooms || [];
    if (typeof w.renderRoomList === "function") w.renderRoomList();
    // If we requested a DM creation, auto-open once it appears
    if (w.pendingDmTargetId && w.currentUser) {
      try {
        const meId = w.currentUser.id;
        const dm = (w.rooms as any[]).find((r) => {
          if (r.type !== "user") return false;
          const members: Array<{ id: string; name: string }> = Array.isArray(
            r.users
          )
            ? r.users
            : [];
          const ids = members.map((u) => u && u.id).filter(Boolean);
          return ids.includes(meId) && ids.includes(w.pendingDmTargetId);
        });
        if (dm) {
          w.pendingDmTargetId = null;
          if (typeof w.joinRoom === "function") w.joinRoom(dm);
        }
      } catch {}
    }
  });

  // --- PARTICIPANTS IN ROOM ---
  socket.on("roomUsers", (payload: any) => {
    if (!w.selectedRoom || !payload || payload.roomId !== w.selectedRoom.id)
      return;
    if (typeof w.renderParticipants === "function")
      w.renderParticipants(payload.users || []);
    try {
      // If this is a DM, use the user list from the event to compute presence
      const users = Array.isArray(payload.users) ? payload.users : [];
      if (
        (w.selectedRoom && w.selectedRoom.type === "user") &&
        typeof w.setupDmPresence === "function"
      ) {
        w.setupDmPresence({ type: "user", users });
      }
    } catch {}
  });

  // --- ROOM HISTORY ---
  socket.on("roomHistory", (data: any) => {
    if (!w.selectedRoom || data.roomId !== w.selectedRoom.id) return;
    const chatWindow = document.getElementById(
      "chat-window"
    ) as HTMLElement | null;
    if (chatWindow) chatWindow.innerHTML = "";
    (data.messages || []).forEach((m: any) => {
      if (typeof w.renderMsg === "function") w.renderMsg(m);
    });
    // Mark as delivered/read upon viewing history
    try {
      const now = Date.now();
      (data.messages || []).forEach((m: any) => {
        const authorName = m?.author?.name;
        const mine = w.currentUser && authorName === w.currentUser.name;
        const midStr = m?.id != null ? String(m.id) : "";
        const mid = parseInt(midStr, 10);
        if (!mine && Number.isFinite(mid)) {
          socket.emit("messageDelivered", {
            messageId: mid,
            roomId: data.roomId,
            timestamp: now,
          });
          socket.emit("messageRead", {
            messageId: mid,
            roomId: data.roomId,
            timestamp: now,
          });
        }
      });
    } catch {}
  });

  // --- INCOMING MESSAGE ---
  socket.on("message", (data: any) => {
    // Stats: count message for the room
    try { (window as any).statsOnMessage?.(String(data?.roomId || '')); } catch {}
    if (w.selectedRoom && data.roomId === w.selectedRoom.id) {
      if (typeof w.renderMsg === "function") w.renderMsg(data.message);
      // Update inline last message preview for this room
      try {
        if (typeof w.updateRoomLastMsgPreview === 'function')
          w.updateRoomLastMsgPreview(String(data.roomId || ''), String(data?.message?.content || ''));
      } catch {}
      // Acknowledge delivery/read for messages from others in active room
      try {
        const m = data.message;
        const authorName = m?.author?.name;
        const mine = w.currentUser && authorName === w.currentUser.name;
        const mid = parseInt(String(m?.id ?? ""), 10);
        if (!mine && Number.isFinite(mid)) {
          const now = Date.now();
          socket.emit("messageDelivered", {
            messageId: mid,
            roomId: data.roomId,
            timestamp: now,
          });
          socket.emit("messageRead", {
            messageId: mid,
            roomId: data.roomId,
            timestamp: now,
          });
        }
      } catch {}
      return;
    }
    // Otherwise, increment unread counter (ignore own messages)
    try {
      const authorName = data?.message?.author?.name;
      if (!w.currentUser || authorName === w.currentUser.name) return;
      // Update list last message preview for the room
      try {
        if (typeof w.updateRoomLastMsgPreview === 'function')
          w.updateRoomLastMsgPreview(String(data.roomId || ''), String(data?.message?.content || ''));
      } catch {}
      // Mark as delivered when message arrives for a room that's not active
      try {
        const mid = parseInt(String(data?.message?.id ?? ""), 10);
        if (Number.isFinite(mid)) {
          const now = Date.now();
          socket.emit("messageDelivered", {
            messageId: mid,
            roomId: data.roomId,
            timestamp: now,
          });
        }
      } catch {}
      w.unreadCounts[data.roomId] = (w.unreadCounts[data.roomId] || 0) + 1;
      if (typeof w.renderRoomList === "function") w.renderRoomList();
    } catch {}
  });

  // --- MESSAGE STATUS UPDATES ---
  socket.on("messageStatusUpdated", (evt: any) => {
    try {
      const chatWindow = document.getElementById(
        "chat-window"
      ) as HTMLElement | null;
      const mid = evt && evt.messageId != null ? String(evt.messageId) : "";
      if (!mid || !chatWindow) return;
      const el = chatWindow.querySelector(
        `[data-message-id="${mid}"]`
      ) as HTMLElement | null;
      if (!el) return;
      const statusEl = el.querySelector(".msg-status") as HTMLElement | null;
      if (!statusEl) return;
      const status = String(evt.status || "").toLowerCase();
      if (status === "read") statusEl.textContent = "✓✓";
      else if (status === "delivered") {
        if (statusEl.textContent !== "✓✓") statusEl.textContent = "✓";
      }
    } catch {}
  });

  // --- FRIENDS REALTIME ---
  socket.on("friendUpdated", () => {
    if (typeof requestFriendList === "function") requestFriendList();
  });

  // --- TYPING RECEIVED ---
  socket.on("typing", (payload: any) => {
    try {
      if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
        return;
      const uid = String(payload.userId || "");
      if (!uid || (w.currentUser && uid === w.currentUser.id)) return;
      if (payload.typing) w.typingUsers.add(uid);
      else w.typingUsers.delete(uid);
      if (typeof renderTypingBanner === "function") renderTypingBanner();
    } catch {}
  });

  // --- GENERIC ERROR ---
  socket.on("error", (err: any) => {
    const authPanel = document.getElementById(
      "auth-panel"
    ) as HTMLElement | null;
    const authError = document.getElementById(
      "auth-error"
    ) as HTMLElement | null;
    if (authPanel && authPanel.style.display !== "none" && authError) {
      authError.textContent = err?.error || "Erreur serveur";
      authError.style.display = "block";
    } else {
      alert(err?.error || "Erreur serveur");
    }
  });
})();
