// rooms.ts - unified room list rendering and room join helpers
// Works with global state kept on window (no modules).
(function () {
  const w = window as any;
  if (w.__rooms_ts_initialized__) return; // idempotent
  w.__rooms_ts_initialized__ = true;

  // ---- Pins & Filters state (persisted) ----
  try {
    const raw = localStorage.getItem('rt:pins');
    w.__rt_pins = new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { w.__rt_pins = new Set<string>(); }
  try { if (typeof w.__rt_room_query !== 'string') w.__rt_room_query = localStorage.getItem('rt:roomQuery') || ''; } catch {}
  try { if (w.__rt_sort_mode !== 'recent' && w.__rt_sort_mode !== 'unread') w.__rt_sort_mode = (localStorage.getItem('rt:roomSort') as any) || 'recent'; } catch { w.__rt_sort_mode = 'recent'; }
  try { if (typeof w.__rt_pinned_only !== 'boolean') w.__rt_pinned_only = localStorage.getItem('rt:pinnedOnly') === '1'; } catch {}

  // Provide helpers on window only if not already present
  if (!w.renderRoomList)
    w.renderRoomList = function renderRoomList() {
      const roomListAll = document.getElementById(
        "room-list-all"
      ) as HTMLElement | null;
      const noRoomMsgAll = document.getElementById(
        "no-room-msg-all"
      ) as HTMLElement | null;
      const rooms: any[] = w.rooms || [];
      const currentUser = w.currentUser;
      const selectedRoom = w.selectedRoom;
      const unreadCounts: Record<string, number> = w.unreadCounts || {};
      if (roomListAll) roomListAll.innerHTML = "";

      // Ensure filter bar exists above the list (search + pinned-only + sort)
      (function ensureFilterBar(){
        try {
          const host = document.getElementById('room-list-section');
          if (!host) return;
          let bar = document.getElementById('room-filter-bar') as HTMLDivElement | null;
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'room-filter-bar';
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.gap = '8px';
            bar.style.margin = '8px 8px 4px 8px';
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'room-search-input';
            input.placeholder = 'Search rooms or users…';
            input.value = String(w.__rt_room_query || '');
            input.style.flex = '1';
            input.oninput = () => { try { w.__rt_room_query = input.value || ''; localStorage.setItem('rt:roomQuery', String(w.__rt_room_query)); } catch {} ; try { w.renderRoomList?.(); } catch {} };
            input.onkeydown = (ev: KeyboardEvent) => {
              if (ev.key === 'Escape' || (ev as any).key === 'Esc') {
                try { ev.preventDefault(); } catch {}
                try { w.__rt_room_query = ''; localStorage.setItem('rt:roomQuery',''); input.value=''; } catch {}
                try { w.renderRoomList?.(); } catch {}
              }
            };

  // Real-time presence dot updater for DM rooms
  if (!w.updateRoomPresenceDot)
    w.updateRoomPresenceDot = function updateRoomPresenceDot(userId: string) {
      try {
        if (!userId) return;
        const meId = (w.currentUser && w.currentUser.id) || null;
        const rooms: any[] = Array.isArray(w.rooms) ? w.rooms : [];
        const matches = rooms.filter((r) => {
          if (!r || r.type !== 'user') return false;
          const users = Array.isArray(r.users) ? r.users : [];
          const ids = users.map((u:any)=>u&&u.id).filter(Boolean);
          return meId && ids.includes(meId) && ids.includes(userId);
        });
        if (!matches.length) return;
        const state = (w as any).__presenceByUser && (w as any).__presenceByUser[String(userId)];
        const online = !!(state && state.online);
        const list = document.getElementById('room-list-all') as HTMLElement | null;
        if (!list) return;
        for (const room of matches) {
          const li = list.querySelector(`li.room-list-item[data-room-id="${CSS.escape(String(room.id))}"]`) as HTMLElement | null;
          if (!li) continue;
          const dot = li.querySelector('.presence-dot') as HTMLElement | null;
          if (!dot) continue;
          try {
            dot.classList.remove('presence-online','presence-offline');
            dot.classList.add(online ? 'presence-online' : 'presence-offline');
          } catch {}
        }
      } catch {}
    };
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'icon-btn';
            clearBtn.textContent = '✕';
            clearBtn.title = 'Clear search';
            clearBtn.onclick = () => { try { w.__rt_room_query = ''; localStorage.setItem('rt:roomQuery',''); input.value=''; w.renderRoomList?.(); } catch {} };
            const poBtn = document.createElement('button');
            poBtn.type = 'button';
            poBtn.className = 'icon-btn';
            const setPoText = () => poBtn.textContent = `Pinned Only: ${w.__rt_pinned_only ? 'On' : 'Off'}`;
            setPoText();
            poBtn.onclick = () => { try { w.__rt_pinned_only = !w.__rt_pinned_only; localStorage.setItem('rt:pinnedOnly', w.__rt_pinned_only ? '1' : '0'); setPoText(); w.renderRoomList?.(); } catch {} };

            const sortBtn = document.createElement('button');
            sortBtn.type = 'button';
            sortBtn.className = 'icon-btn';
            const setSortBtnText = () => sortBtn.textContent = `Sort: ${w.__rt_sort_mode === 'unread' ? 'Unread' : (w.__rt_sort_mode==='unreadFirst'?'Unread First':'Recent')}`;
            setSortBtnText();
            sortBtn.onclick = () => {
              try {
                w.__rt_sort_mode = (w.__rt_sort_mode === 'recent') ? 'unread' : (w.__rt_sort_mode === 'unread' ? 'unreadFirst' : 'recent');
                localStorage.setItem('rt:roomSort', w.__rt_sort_mode);
                setSortBtnText();
                w.renderRoomList?.();
              } catch {}
            };
            bar.appendChild(input);
            bar.appendChild(clearBtn);
            bar.appendChild(poBtn);
            bar.appendChild(sortBtn);
            // Insert before UL
            const ul = document.getElementById('room-list-all');
            if (ul?.parentElement) ul.parentElement.insertBefore(bar, ul);
            else host.appendChild(bar);
          }
        } catch {}
      })();

      let visibleRooms = rooms.filter((room) => {
        if (room.isPublic === false) {
          const meId = currentUser?.id;
          if (!meId) return false;
          if (room.creatorId === meId) return true;
          const members: Array<{ id: string; name: string }> = Array.isArray(
            room.users
          )
            ? room.users
            : [];
          return members.some((u) => u && u.id === meId);
        }
        return true; // public
      });

      // Apply text search filter
      try {
        const q = String(w.__rt_room_query || '').trim().toLowerCase();
        if (q) {
          visibleRooms = visibleRooms.filter((room) => {
            let label = room.name || (room.type === 'user' ? 'DM' : 'Room');
            if (room.type === 'user') {
              const meId = currentUser?.id;
              const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
              const other = meId ? members.find((u) => u && u.id !== meId) : null;
              if (other?.name) label = other.name;
            }
            return String(label || '').toLowerCase().includes(q);
          });
        }
      } catch {}

      // Apply unread-only filter if enabled (set by UI quickbar)
      try {
        if ((w as any).__rt_unread_only) {
          visibleRooms = visibleRooms.filter((r) => (unreadCounts && unreadCounts[r.id] > 0));
        }
      } catch {}

      // Pins set (used for both optional filter and sorting)
      const pins: Set<string> = (w.__rt_pins instanceof Set) ? w.__rt_pins : new Set<string>();

      // Apply pinned-only filter if enabled
      try {
        if (w.__rt_pinned_only) {
          visibleRooms = visibleRooms.filter((r) => pins.has(String(r.id)));
        }
      } catch {}

      // Sorting: pinned first, then by selected mode (recent, unread, unreadFirst)
      function lastTsFor(room: any): number {
        try {
          const cache = (w as any).roomLastMsgCache?.[String(room.id)];
          if (cache && typeof cache.lastTs === 'number') return cache.lastTs;
        } catch {}
        return 0;
      }
      const pinnedRooms = visibleRooms.filter(r => pins.has(String(r.id)));
      const otherRooms = visibleRooms.filter(r => !pins.has(String(r.id)));
      const sortMode = (w.__rt_sort_mode === 'unread' || w.__rt_sort_mode === 'unreadFirst') ? w.__rt_sort_mode : 'recent';
      const sorter = (a: any, b: any) => {
        if (sortMode === 'unread' || sortMode === 'unreadFirst') {
          const ua = unreadCounts[a.id] || 0; const ub = unreadCounts[b.id] || 0;
          if (ub !== ua) return ub - ua;
          const ta = lastTsFor(a); const tb = lastTsFor(b);
          return tb - ta;
        } else {
          const ta = lastTsFor(a); const tb = lastTsFor(b);
          if (tb !== ta) return tb - ta;
          const ua = unreadCounts[a.id] || 0; const ub = unreadCounts[b.id] || 0;
          return ub - ua;
        }
      };
      pinnedRooms.sort(sorter);
      otherRooms.sort(sorter);
      // Render headers and groups
      if (noRoomMsgAll)
        noRoomMsgAll.style.display = (pinnedRooms.length + otherRooms.length) ? "none" : "block";

      // simple cache { [roomId]: { text, cachedAt, lastTs } }
      w.roomLastMsgCache = w.roomLastMsgCache || {};

      function appendHeader(text: string) {
        try {
          if (!roomListAll) return;
          const h = document.createElement('li');
          h.className = 'room-list-header';
          h.textContent = text;
          roomListAll.appendChild(h);
        } catch {}
      }

      let idx = 0;
      if (pinnedRooms.length) appendHeader('Pinned');
      const renderOrder: any[] = [...pinnedRooms, ...otherRooms];
      renderOrder.forEach((room) => {
        if (idx === pinnedRooms.length && pinnedRooms.length && otherRooms.length) appendHeader('Others');
        idx++;
        const li = document.createElement("li");
        li.className = "room-list-item";
        try { if (room && room.id) (li as any).dataset.roomId = String(room.id); } catch {}
        let label = room.name || (room.type === "user" ? "DM" : "Room");
        if (room.type === "user") {
          try {
            const meId = currentUser?.id;
            const members: Array<{ id: string; name: string }> = Array.isArray(
              room.users
            )
              ? room.users
              : [];
            const other = meId ? members.find((u) => u && u.id !== meId) : null;
            if (other && other.name) label = other.name;
          } catch {}
        }
        const typeIcon = room.type === "user" ? "👤" : "📁";
        const initial = (label || "?").trim().charAt(0).toUpperCase();
        li.innerHTML = `
        <div class="room-avatar" aria-hidden="true">${initial}</div>
        <span class="room-type-icon" aria-hidden="true">${typeIcon}</span>
        <span class="presence-dot presence-offline" aria-hidden="true"></span>
        <span class="room-name">${label}</span>
        <span class="room-lastmsg-inline" style="color:#888;font-size:12px;margin-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%;display:inline-block;vertical-align:middle;"></span>
        <span class="room-badge" hidden></span>
        <button type="button" class="icon-btn" style="margin-left:auto" aria-label="Pin" title="Pin/Unpin" data-pin="1">${pins.has(String(room.id)) ? '★' : '☆'}</button>
      `;
        li.style.cursor = "pointer";
        li.onclick = () => (w.joinRoom ? w.joinRoom(room) : undefined);
        if (selectedRoom && selectedRoom.id === room.id)
          li.classList.add("active");
        const badge = li.querySelector(".room-badge") as HTMLElement | null;
        const count = unreadCounts[room.id] || 0;
        if (badge) {
          if (count > 0) {
            badge.textContent = String(count);
            badge.hidden = false;
          } else {
            badge.hidden = true;
          }
        }
        roomListAll && roomListAll.appendChild(li);

        // Highlight search match in name
        try {
          const q = String(w.__rt_room_query || '').trim().toLowerCase();
          if (q) {
            const nameEl = li.querySelector('.room-name') as HTMLElement | null;
            if (nameEl) {
              const src = String(nameEl.textContent || '');
              const i = src.toLowerCase().indexOf(q);
              if (i >= 0) {
                const before = src.slice(0, i);
                const mid = src.slice(i, i + q.length);
                const after = src.slice(i + q.length);
                nameEl.innerHTML = `${before}<span class="rt-hl">${mid}</span>${after}`;
              }
            }
          }
        } catch {}

        // Pin toggle
        try {
          const pinBtn = li.querySelector('button[data-pin]') as HTMLButtonElement | null;
          if (pinBtn) {
            pinBtn.onclick = (ev) => {
              try { ev.stopPropagation(); ev.preventDefault(); } catch {}
              const id = String(room.id);
              if (pins.has(id)) pins.delete(id); else pins.add(id);
              try { localStorage.setItem('rt:pins', JSON.stringify(Array.from(pins))); } catch {}
              w.__rt_pins = pins; // update global
              try { w.renderRoomList?.(); } catch {}
            };
          }
        } catch {}

        // Presence dot for DMs only
        if (room.type === "user") {
          try {
            const presEl = li.querySelector('.presence-dot') as HTMLElement | null;
            const meId = currentUser?.id;
            const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
            const other = meId ? members.find((u) => u && u.id !== meId) : null;
            if (presEl && other) {
              // Prefer cached server-pushed presence if available for instant update
              const cache = (w as any).__presenceByUser && (w as any).__presenceByUser[String(other.id)];
              presEl.classList.remove('presence-online','presence-offline');
              if (cache) {
                if (cache.online) presEl.classList.add('presence-online');
                else presEl.classList.add('presence-offline');
              } else if (typeof (w.fetchPresence) === 'function') {
                // Fallback to REST presence fetch when cache not available yet
                (w.fetchPresence as any)(other.id).then((pr: any) => {
                  try {
                    presEl.classList.remove('presence-online','presence-offline');
                    if (pr && pr.status === 'online') presEl.classList.add('presence-online');
                    else presEl.classList.add('presence-offline');
                  } catch {}
                }).catch(() => undefined);
              } else {
                presEl.classList.add('presence-offline');
              }
            }
          } catch {}
        }

        // Helpers for media-only preview detection
        function isMediaUrl(u: string): boolean {
          const s = String(u || '').toLowerCase();
          if (!/^https?:\/\//.test(s)) return false;
          return /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.mp4|\.webm|\.ogg)(\?.*)?$/.test(s);
        }
        function previewFromContent(content: string): string {
          try {
            const lines = String(content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (lines.length > 0 && lines.every((l) => isMediaUrl(l))) return '[Pièce jointe]';
            const text = String(content || '').slice(0, 80);
            return text;
          } catch {
            return String(content || '').slice(0, 80);
          }
        }

        // Fill last message preview inline (cached 15s)
        try {
          const previewEl = li.querySelector('.room-lastmsg-inline') as HTMLElement | null;
          if (previewEl) {
            const cacheKey = String(room.id || '');
            const now = Date.now();
            const cache = w.roomLastMsgCache[cacheKey];
            if (cache && now - (cache.cachedAt || 0) < 15000) {
              previewEl.textContent = cache.text ? ` – ${cache.text}` : '';
            } else if (typeof w.getRoomLastMessage === 'function') {
              w.getRoomLastMessage(cacheKey).then((res: any) => {
                try {
                  const msg = (res && res.success) ? res.message : null;
                  const text = msg ? previewFromContent(String(msg.content || '')) : '';
                  previewEl.textContent = text ? ` – ${text}` : '';
                  const lastTs = msg && typeof msg.timestamp === 'number' ? Number(msg.timestamp) : Date.now();
                  w.roomLastMsgCache[cacheKey] = { text, cachedAt: Date.now(), lastTs };
                } catch {}
              }).catch(() => undefined);
            }
          }
        } catch {}
      });
    };

  // Real-time update helper for last message preview
  if (!w.updateRoomLastMsgPreview)
    w.updateRoomLastMsgPreview = function updateRoomLastMsgPreview(
      roomId: string,
      text: string
    ) {
      try {
        if (!roomId) return;
        w.roomLastMsgCache = w.roomLastMsgCache || {};
        const isMediaOnly = (() => {
          try {
            const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (lines.length === 0) return false;
            return lines.every((l) => (/^https?:\/\//.test(l) && /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.mp4|\.webm|\.ogg)(\?.*)?$/.test(l.toLowerCase())));
          } catch { return false; }
        })();
        const preview = isMediaOnly ? '[Pièce jointe]' : (text || '').slice(0, 80);
        // Cache with fresh timestamps (we don't have message ts here, fallback to now)
        w.roomLastMsgCache[String(roomId)] = { text: preview, cachedAt: Date.now(), lastTs: Date.now() };
        // Update DOM if present
        const roomListAll = document.getElementById(
          "room-list-all"
        ) as HTMLElement | null;
        if (roomListAll) {
          const li = roomListAll.querySelector(
            `li.room-list-item[data-room-id="${CSS.escape(String(roomId))}"]`
          ) as HTMLElement | null;
          const el = li?.querySelector(
            ".room-lastmsg-inline"
          ) as HTMLElement | null;
          if (el) el.textContent = preview ? ` – ${preview}` : '';
        }
      } catch {}
    };

  if (!w.renderParticipants)
    w.renderParticipants = function renderParticipants(
      users: Array<{ id: string; name: string }>
    ) {
      const roomParticipants = document.getElementById(
        "room-participants"
      ) as HTMLElement | null;
      if (!roomParticipants) return;
      if (!users || users.length === 0) {
        roomParticipants.textContent = "";
        return;
      }
      const names = users.map((u) => u.name).join(", ");
      roomParticipants.textContent = `Participants: ${names}`;
    };

  if (!w.joinRoom)
    w.joinRoom = function joinRoom(room: any) {
      const currentUser = w.currentUser;
      if (!currentUser) return;
      w.selectedRoom = room;
      const selectedRoomTitle = document.getElementById(
        "selected-room-title"
      ) as HTMLElement | null;
      if (selectedRoomTitle)
        selectedRoomTitle.textContent = `💬 Room : ${room.name}`;
      // Reset typing banner and state
      if (w.typingUsers && typeof w.typingUsers.clear === "function")
        w.typingUsers.clear();
      if (typeof w.setTypingBanner === "function")
        try {
          w.setTypingBanner("");
        } catch {}
      // UI: responsive visibility
      if (typeof w.syncLayoutVisibility === "function")
        w.syncLayoutVisibility();
      const chatWindow = document.getElementById(
        "chat-window"
      ) as HTMLElement | null;
      if (chatWindow) chatWindow.innerHTML = "";
      const roomParticipants = document.getElementById(
        "room-participants"
      ) as HTMLElement | null;
      if (roomParticipants) roomParticipants.textContent = "";
      const socket = w.socket;
      socket.emit("joinRoom", { roomId: room.id });
      // Reset unread counter
      w.unreadCounts = w.unreadCounts || {};
      w.unreadCounts[room.id] = 0;
      try {
        if (typeof w.renderRoomList === "function") w.renderRoomList();
      } catch {}
      try {
        if (typeof w.setupDmPresence === "function") w.setupDmPresence(room);
      } catch {}
    };
})();
