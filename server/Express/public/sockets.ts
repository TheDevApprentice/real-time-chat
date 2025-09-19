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
  w.__presenceByUser = w.__presenceByUser || ({} as Record<string, { online: boolean; lastSeen: number | null }>);

  // --- PRESENCE CHANGES (server-pushed) ---
  socket.on("presenceChanged", (evt: { userId: string; status: "online" | "offline"; lastSeen: number | null }) => {
    try {
      if (!evt || !evt.userId) return;
      const online = evt.status === "online";
      (w.__presenceByUser as any)[evt.userId] = { online, lastSeen: evt.lastSeen ?? null };
      // If selected room is a DM and involves this user, update the presence label immediately
      const room = w.selectedRoom;
      if (room && room.type === "user" && Array.isArray(room.users)) {
        const others = room.users.filter((u: any) => u && w.currentUser && u.id !== w.currentUser.id);
        const other = others && others[0];
        if (other && other.id === evt.userId) {
          if (typeof updatePresenceLabel === "function") {
            if (online) updatePresenceLabel("• en ligne");
            else {
              const ls = typeof evt.lastSeen === "number" ? evt.lastSeen : null;
              const text = humanizeAgo(ls);
              updatePresenceLabel(text ? `• vu ${text}` : "");
            }
          }
        }
      }
      // Update DM room presence dot immediately if visible
      try { if (typeof w.updateRoomPresenceDot === "function") w.updateRoomPresenceDot(evt.userId); } catch {}
      // Optionally refresh room list to reflect badges if needed elsewhere
      if (typeof w.renderRoomList === "function") w.renderRoomList();
    } catch {}
  });

  function humanizeAgo(ts: number | null): string {
    try {
      if (!ts || !Number.isFinite(ts)) return "il y a …";
      const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (s < 60) return "il y a quelques secondes";
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} h`;
      const d = Math.floor(h / 24);
      return `${d} j`;
    } catch { return ""; }
  }

  // --- AUTH ON LOAD via cookie ---
  try {
    const token =
      typeof getCookie === "function" ? getCookie("session_token") : null;
    if (token) {
      // Helper: small auth debug banner
      if (!w.showAuthDebug) {
        w.showAuthDebug = function showAuthDebug(msg?: string) {
          try {
            let el = document.getElementById('auth-debug-banner') as HTMLDivElement | null;
            if (!msg) {
              if (el) el.remove();
              return;
            }
            if (!el) {
              el = document.createElement('div');
              el.id = 'auth-debug-banner';
              el.style.position = 'fixed';
              el.style.top = '0';
              el.style.left = '0';
              el.style.right = '0';
              el.style.zIndex = '9999';
              el.style.background = '#fff3cd';
              el.style.color = '#856404';
              el.style.border = '1px solid #ffeeba';
              el.style.padding = '6px 10px';
              el.style.fontSize = '12px';
              el.style.textAlign = 'center';
              document.body.appendChild(el);
            }
            el.textContent = msg;
          } catch {}
        };
      }

      socket.emit("authenticate", { token }, (res: any) => {
        if (res && res.success) {
          const u = res.user || {};
          w.currentUser = { id: u.id, name: u.name };
          if (!u || !u.id || !u.name) {
            w.showAuthDebug?.("[DEBUG] Auth OK mais user manquant dans la réponse (UI lit res.user.*)");
          } else {
            w.showAuthDebug?.(); // clear
          }
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

  // Ensure a "Load earlier" button exists at the top of the chat window
  function ensureLoadMoreBtn() {
    try {
      const chatWindow = document.getElementById("chat-window") as HTMLElement | null;
      if (!chatWindow) return;
      let host = document.getElementById('chat-load-more-host') as HTMLDivElement | null;
      if (!host) {
        host = document.createElement('div');
        host.id = 'chat-load-more-host';
        host.style.display = 'flex';
        host.style.justifyContent = 'center';
        host.style.margin = '8px 0';
        chatWindow.parentElement?.insertBefore(host, chatWindow); // place above chatWindow
      }
      let btn = document.getElementById('btn-load-earlier') as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-load-earlier';
        btn.className = 'icon-btn';
        btn.textContent = 'Charger les messages précédents';
        btn.onclick = onLoadMoreClicked;
        host.appendChild(btn);
      }
    } catch {}
  }

  // Click handler: request older messages using loadRoomHistory
  function onLoadMoreClicked(ev: MouseEvent) {
    try { ev.preventDefault(); } catch {}
    const btn = document.getElementById('btn-load-earlier') as HTMLButtonElement | null;
    const room = (window as any).selectedRoom;
    if (!room || !room.id) return;
    const roomId = String(room.id);
    const cursor = Number(((window as any).__historyCursorByRoom || {})[roomId] ?? 0) || 0;
    const size = 50;
    if (btn) { btn.disabled = true; btn.textContent = 'Chargement…'; }
    try {
      socket.emit('loadRoomHistory', { roomId, cursor, size }, (res: any) => {
        try {
          const page = (res && res.success) ? res.page : null;
          const items = page && Array.isArray(page.items) ? page.items : [];
          if (items.length > 0) prependMessages(items);
          // Update cursor
          (window as any).__historyCursorByRoom = (window as any).__historyCursorByRoom || {};
          (window as any).__historyCursorByRoom[roomId] = cursor + items.length;
          const hasMore = !!(page && page.nextCursor != null);
          if (btn) {
            btn.disabled = !hasMore;
            btn.textContent = hasMore ? 'Charger les messages précédents' : 'Aucun message supplémentaire';
          }
        } finally {
          try { if (btn && !btn.disabled) btn.blur(); } catch {}
        }
      });
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = 'Charger les messages précédents'; }
    }
  }

  // Prepend an array of MessageDTO into the chat window
  function prependMessages(msgs: any[]) {
    try {
      const chatWindow = document.getElementById('chat-window') as HTMLElement | null;
      if (!chatWindow || !Array.isArray(msgs) || msgs.length === 0) return;
      const first = chatWindow.firstChild as Node | null;
      for (const m of msgs) {
        const el = buildMsgEl(m);
        if (first) chatWindow.insertBefore(el, first);
        else chatWindow.appendChild(el);
      }
      // Keep scroll near the previous first item
      try { chatWindow.scrollTop = 0; } catch {}
    } catch {}
  }

  // Minimal message renderer for prepending (aligned with chat-client.ts)
  function buildMsgEl(msg: any): HTMLElement {
    const w = window as any;
    const authorName = msg?.author?.name || '???';
    const content = String(msg?.content || '');
    const timestamp = typeof msg?.timestamp === 'number' ? msg.timestamp : Date.now();
    const isMine = !!(w.currentUser && authorName === w.currentUser.name);
    const div = document.createElement('div');
    let classes = 'message';
    classes += isMine ? ' mine' : '';
    div.className = classes;
    if (msg && msg.id != null) {
      try { (div as any).dataset.messageId = String(msg.id); } catch {}
    }
    const time = new Date(timestamp).toLocaleTimeString();
    const statusText = '';
    div.innerHTML = `
      <div class="msg-meta-row">
        <span class="msg-author">${authorName}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-content">${content}</div>
      ${isMine ? `<span class="msg-status" aria-label="status">${statusText}</span>` : ''}
    `;
    return div;
  }

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
    // Pagination support: initialize cursor and show load-more button
    try {
      w.__historyCursorByRoom = w.__historyCursorByRoom || {};
      const count = Array.isArray(data.messages) ? data.messages.length : 0;
      w.__historyCursorByRoom[data.roomId] = count;
      ensureLoadMoreBtn();
    } catch {}
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
