// analytics.ts - Top Active Rooms panel and last-message previews
(function () {
  const w = window as any;
  if (w.__analytics_ts_initialized__) return;
  w.__analytics_ts_initialized__ = true;

  function ensurePanel(): HTMLElement | null {
    const panel = document.getElementById("room-panel") as HTMLElement | null;
    if (!panel) return null;
    let sec = document.getElementById("top-active-rooms") as HTMLElement | null;
    if (!sec) {
      sec = document.createElement("section");
      sec.id = "top-active-rooms";
      sec.className = "top-active-block";
      sec.style.margin = "12px 0";
      sec.innerHTML = `
        <ul id="top-active-list" class="room-list" style="max-height:160px; overflow:auto; margin:0; padding:0;"></ul>
      `;
      panel.appendChild(sec);
    }
    return sec;
  }

  function el(id: string): HTMLElement | null {
    return document.getElementById(id) as HTMLElement | null;
  }

  async function renderTopActive(limit = 8) {
    const sec = ensurePanel();
    const ul = el('top-active-list') as HTMLUListElement | null;
    if (!ul || !sec) return;
    ul.innerHTML = '';
    try {
      const res = await (w.getTopActiveRooms ? w.getTopActiveRooms(limit) : Promise.resolve({ success: false }));
      if (!res || !res.success) return;
      const items: any[] = Array.isArray(res.items) ? res.items : [];
      for (const room of items) {
        const li = document.createElement('li');
        li.className = 'room-list-item';
        const name = room?.name || (room?.type === 'user' ? 'DM' : 'Room');
        const initial = (name || '?').trim().charAt(0).toUpperCase();
        const typeIcon = room?.type === 'user' ? '👤' : '📁';
        li.innerHTML = `
          <div class="room-avatar" aria-hidden="true">${initial}</div>
          <span class="room-type-icon" aria-hidden="true">${typeIcon}</span>
          <span class="room-name">${name}</span>
          <span class="room-lastmsg" style="display:block;color:#888;font-size:12px;margin-left:28px;"></span>
        `;
        li.style.cursor = 'pointer';
        li.onclick = () => {
          try {
            if (typeof w.joinRoom === 'function') w.joinRoom(room);
            else if (w.socket) w.socket.emit('joinRoom', { roomId: room.id });
          } catch {}
        };
        ul.appendChild(li);
        // Fetch last message preview
        try {
          const lastRes = await (w.getRoomLastMessage ? w.getRoomLastMessage(room.id) : Promise.resolve(null));
          const span = li.querySelector('.room-lastmsg') as HTMLElement | null;
          if (span && lastRes && lastRes.success && lastRes.message) {
            const preview = String(lastRes.message.content || '').slice(0, 80);
            span.textContent = preview ? preview : '';
          }
        } catch {}
      }
    } catch {}
  }

  function wirePanel() {
    ensurePanel();
    const btn = document.getElementById('btn-refresh-top') as HTMLButtonElement | null;
    if (btn) btn.onclick = () => renderTopActive(8);
    // Auto-render once on load
    renderTopActive(8).catch(() => undefined);
  }

  try { wirePanel(); } catch {}

  // ================= Header Buttons (Share + Stats) =================
  function ensureHeaderButtons() {
    try {
      const title = document.getElementById('selected-room-title') as HTMLElement | null;
      if (!title) return;
      const selected = (window as any).selectedRoom as any | null;
      // Share button
      let btnShare = document.getElementById('btn-share-room') as HTMLButtonElement | null;
      if (!btnShare) {
        btnShare = document.createElement('button');
        btnShare.id = 'btn-share-room';
        btnShare.className = 'auth-btn';
        btnShare.style.marginLeft = '8px';
        btnShare.textContent = 'Partager';
        btnShare.title = 'Créer une invitation';
        btnShare.onclick = () => {
          try { (w.createInviteForCurrentRoom || (()=>{}))(); } catch {}
        };
        title.appendChild(btnShare);
      }
      // Hide/disable for DM rooms
      try {
        if (selected && selected.type === 'user') {
          btnShare.style.display = 'none';
        } else {
          btnShare.style.display = '';
        }
      } catch {}
      // Stats button
      let btnStats = document.getElementById('btn-room-stats') as HTMLButtonElement | null;
      if (!btnStats) {
        btnStats = document.createElement('button');
        btnStats.id = 'btn-room-stats';
        btnStats.className = 'auth-btn';
        btnStats.style.marginLeft = '6px';
        btnStats.textContent = 'Stats';
        btnStats.title = 'Afficher les statistiques';
        btnStats.onclick = () => toggleStatsPanel();
        title.appendChild(btnStats);
      }
    } catch {}
  }

  function ensureStatsContainer(): HTMLElement | null {
    const title = document.getElementById('selected-room-title') as HTMLElement | null;
    if (!title) return null;
    let container = document.getElementById('room-stats-panel') as HTMLElement | null;
    if (!container) {
      container = document.createElement('div');
      container.id = 'room-stats-panel';
      container.style.fontSize = '12px';
      container.style.color = '#555';
      container.style.border = '1px dashed #ddd';
      container.style.borderRadius = '6px';
      container.style.padding = '8px';
      container.style.margin = '8px 0';
      container.style.display = 'none';
      title.parentElement?.insertBefore(container, title.nextSibling);
    }
    return container;
  }

  function toggleStatsPanel() {
    const container = ensureStatsContainer();
    if (!container) return;
    if (container.style.display === 'none') {
      container.style.display = '';
      renderRoomStats(container).catch(()=>undefined);
    } else {
      container.style.display = 'none';
    }
  }

  async function renderRoomStats(container: HTMLElement) {
    try {
      const selectedRoom = w.selectedRoom;
      if (!selectedRoom) { container.textContent = 'Aucune room sélectionnée.'; return; }
      const to = Date.now();
      const from = to - 24*3600*1000; // 24h
      const res = await (w.getRoomMessageCounts ? w.getRoomMessageCounts(selectedRoom.id, 'hour', from, to) : Promise.resolve(null));
      if (!res || !res.success) { container.textContent = 'Impossible de charger les stats.'; return; }
      const items = Array.isArray(res.items) ? res.items : [];
      const total = items.reduce((acc: number, it: any) => acc + (Number(it?.count)||0), 0);
      // Simple render: total + list of last 8 buckets
      const last = items.slice(-8);
      container.innerHTML = `
        <div style="margin-bottom:6px;">Messages (24h): <b>${total}</b></div>
        <ul style="margin:0; padding-left:16px; max-height:120px; overflow:auto;">
          ${last.map((it: any)=>`<li>${it.bucket} — ${it.count}</li>`).join('')}
        </ul>
      `;
    } catch {
      container.textContent = 'Erreur lors du rendu des stats.';
    }
  }

  // Wrap joinRoom to inject buttons when a room is opened
  try {
    const originalJoin = w.joinRoom;
    if (typeof originalJoin === 'function') {
      w.joinRoom = function wrappedJoinRoom(room: any) {
        originalJoin(room);
        try { ensureHeaderButtons(); } catch {}
        const panel = document.getElementById('room-stats-panel') as HTMLElement | null;
        if (panel) panel.style.display = 'none';
      };
    } else {
      // Fallback: try once on load
      ensureHeaderButtons();
    }
  } catch {}
})();
