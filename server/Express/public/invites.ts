// invites.ts - simple UI to create/consume invite tokens via REST
(function () {
  const w = window as any;
  if (w.__invites_ts_initialized__) return;
  w.__invites_ts_initialized__ = true;

  function ensureToolbar(): HTMLElement | null {
    const panel = document.getElementById("room-panel") as HTMLElement | null;
    if (!panel) return null;
    let bar = document.getElementById("invite-toolbar") as HTMLElement | null;
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "invite-toolbar";
      bar.style.margin = "8px 0";
      bar.style.display = "flex";
      bar.style.gap = "8px";
      bar.style.alignItems = "center";
      bar.innerHTML = `
        <input id="invite-token-input" type="text" placeholder="Coller un token pour rejoindre" style="flex:1; min-width:200px;"/>
        <button id="btn-consume-invite" class="chat-send-btn" title="Rejoindre">Rejoindre</button>
      `;
      // Insert toolbar at the bottom of the room panel
      panel.appendChild(bar);
    }
    return bar;
  }

  async function createInviteForCurrentRoom() {
    const selectedRoom = w.selectedRoom;
    const currentUser = w.currentUser;
    if (!selectedRoom || !currentUser) {
      alert('Sélectionnez une room avant de créer une invitation.');
      return;
    }
    if (selectedRoom && selectedRoom.type === 'user') {
      alert('Impossible de partager une conversation privée (DM).');
      return;
    }
    try {
      const csrf = (typeof getCookie === 'function' ? getCookie('X-XSRF-TOKEN') : '') || '';
      const res = await fetch('/api/chat/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrf,
        },
        credentials: 'include',
        body: JSON.stringify({ roomId: selectedRoom.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        alert(data?.error || 'Impossible de créer une invitation');
        return;
      }
      // Copy a full shareable URL (so the recipient hits the same backend)
      const shareUrl = `${location.origin}/api/chat/invite/${encodeURIComponent(String(data.token))}`;
      try { navigator.clipboard?.writeText(shareUrl); } catch {}
      alert('Lien d\'invitation (URL) copié dans le presse-papiers.');
    } catch {
      alert('Erreur réseau');
    }
  }

  async function consumeInviteToken() {
    const inp = document.getElementById('invite-token-input') as HTMLInputElement | null;
    const raw = (inp?.value || '').trim();
    if (!raw) return;
    // Accept either full URL or bare token; support signed tokens with dots/underscores
    let token = raw;
    try {
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        const parts = u.pathname.split('/').filter(Boolean);
        token = parts[parts.length - 1] || raw;
      }
    } catch { token = raw; }
    try {
      const res = await fetch(`/api/chat/invite/${encodeURIComponent(token)}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.payload?.roomId) {
        alert(data?.error || 'Invitation invalide ou expirée');
        return;
      }
      const roomId = data.payload.roomId as string;
      // Try to join immediately; UI will update via sockets
      w.socket.emit('joinRoom', { roomId });
      // Optionally, if room already in list, open it
      try {
        const r = (w.rooms || []).find((x: any) => x && x.id === roomId);
        if (r && typeof w.joinRoom === 'function') w.joinRoom(r);
        else w.socket.emit('getRooms');
      } catch {}
    } catch {
      alert('Erreur lors de la consommation du token');
    }
  }

  function wireToolbar() {
    const bar = ensureToolbar();
    if (!bar) return;
    const btnConsume = document.getElementById('btn-consume-invite') as HTMLButtonElement | null;
    btnConsume && (btnConsume.onclick = () => consumeInviteToken());
  }

  // Wire on load
  try { wireToolbar(); } catch {}
  // Expose for other components (e.g., header button)
  try { (window as any).createInviteForCurrentRoom = createInviteForCurrentRoom; } catch {}
})();
