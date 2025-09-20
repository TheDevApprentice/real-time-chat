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
      try { (window as any).showToast?.("Lien d'invitation copié dans le presse-papiers"); } catch { alert('Lien d\'invitation (URL) copié dans le presse-papiers.'); }
      try { showSharePanel(shareUrl); } catch {}
    } catch {
      alert('Erreur réseau');
    }
  }

  async function consumeInviteToken() {
    const inp = document.getElementById('invite-token-input') as HTMLInputElement | null;
    const btn = document.getElementById('btn-consume-invite') as HTMLButtonElement | null;
    const raw = (inp?.value || '').trim();
    if (!raw) return;
    if (btn) {
      btn.disabled = true;
      try { btn.style.opacity = '0.6'; btn.style.cursor = 'not-allowed'; } catch {}
    }
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
      try { (window as any).showToast?.('Rejoint avec succès'); } catch {}
      // Optionally, if room already in list, open it
      try {
        const r = (w.rooms || []).find((x: any) => x && x.id === roomId);
        if (r && typeof w.joinRoom === 'function') w.joinRoom(r);
        else w.socket.emit('getRooms');
      } catch {}
    } catch {
      alert('Erreur lors de la consommation du token');
    } finally {
      if (btn) {
        btn.disabled = false;
        try { btn.style.opacity = ''; btn.style.cursor = ''; } catch {}
      }
    }
  }

  function wireToolbar() {
    const bar = ensureToolbar();
    if (!bar) return;
    const btnConsume = document.getElementById('btn-consume-invite') as HTMLButtonElement | null;
    if (btnConsume) {
      const inp = document.getElementById('invite-token-input') as HTMLInputElement | null;
      const syncDisabled = () => {
        const v = (inp?.value || '').trim();
        btnConsume.disabled = !v;
        try { btnConsume.style.opacity = btnConsume.disabled ? '0.6' : ''; btnConsume.style.cursor = btnConsume.disabled ? 'not-allowed' : ''; } catch {}
      };
      btnConsume.onclick = () => consumeInviteToken();
      inp?.addEventListener('input', syncDisabled);
      syncDisabled();
    }
  }

  // --- Share panel (URL + Copy) ---
  function ensureSharePanel(): HTMLElement | null {
    let panel = document.getElementById('invite-share-panel') as HTMLElement | null;
    if (panel) return panel;
    const parent = document.body;
    panel = document.createElement('div');
    panel.id = 'invite-share-panel';
    panel.style.position = 'fixed';
    panel.style.right = '16px';
    panel.style.top = '84px';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    panel.style.padding = '10px';
    panel.style.zIndex = '9998';
    panel.style.minWidth = '320px';
    panel.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <input id="share-url-input" type="text" readonly style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;" />
        <button id="btn-share-copy" class="auth-btn" type="button">Copier</button>
        <button id="btn-share-close" class="icon-btn" type="button" title="Fermer">✕</button>
      </div>
    `;
    parent.appendChild(panel);
    const close = panel.querySelector('#btn-share-close') as HTMLButtonElement | null;
    if (close) close.onclick = () => { try { panel!.style.display = 'none'; } catch {} };
    const copy = panel.querySelector('#btn-share-copy') as HTMLButtonElement | null;
    if (copy) copy.onclick = async () => {
      try {
        const inp = panel!.querySelector('#share-url-input') as HTMLInputElement | null;
        const val = (inp?.value || '').trim();
        if (val) await navigator.clipboard?.writeText(val);
        (window as any).showToast?.('Lien copié');
      } catch {}
    };
    return panel;
  }

  function showSharePanel(url: string) {
    const panel = ensureSharePanel();
    if (!panel) return;
    panel.style.display = '';
    const inp = panel.querySelector('#share-url-input') as HTMLInputElement | null;
    if (inp) {
      inp.value = url || '';
      try { inp.select(); } catch {}
    }
  }

  // Wire on load
  try { wireToolbar(); } catch {}
  // Expose for other components (e.g., header button)
  try { (window as any).createInviteForCurrentRoom = createInviteForCurrentRoom; } catch {}
})();
