// rooms.ts - unified room list rendering and room join helpers
// Works with global state kept on window (no modules).
(function () {
  const w = window as any;
  if (w.__rooms_ts_initialized__) return; // idempotent
  w.__rooms_ts_initialized__ = true;

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

      const visibleRooms = rooms.filter((room) => {
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

      if (noRoomMsgAll)
        noRoomMsgAll.style.display = visibleRooms.length ? "none" : "block";

      // simple cache { [roomId]: { text: string, ts: number } }
      w.roomLastMsgCache = w.roomLastMsgCache || {};

      visibleRooms.forEach((room) => {
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
        <span class="room-name">${label}</span>
        <span class="room-lastmsg-inline" style="color:#888;font-size:12px;margin-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%;display:inline-block;vertical-align:middle;"></span>
        <span class="room-badge" hidden></span>
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

        // Fill last message preview inline (cached 15s)
        try {
          const previewEl = li.querySelector('.room-lastmsg-inline') as HTMLElement | null;
          if (previewEl) {
            const cacheKey = String(room.id || '');
            const now = Date.now();
            const cache = w.roomLastMsgCache[cacheKey];
            if (cache && now - cache.ts < 15000) {
              previewEl.textContent = cache.text ? ` – ${cache.text}` : '';
            } else if (typeof w.getRoomLastMessage === 'function') {
              w.getRoomLastMessage(cacheKey).then((res: any) => {
                try {
                  const text = res && res.success && res.message ? String(res.message.content || '').slice(0, 80) : '';
                  previewEl.textContent = text ? ` – ${text}` : '';
                  w.roomLastMsgCache[cacheKey] = { text, ts: Date.now() };
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
        const preview = (text || '').slice(0, 80);
        // Cache with fresh ts
        w.roomLastMsgCache[String(roomId)] = { text: preview, ts: Date.now() };
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
