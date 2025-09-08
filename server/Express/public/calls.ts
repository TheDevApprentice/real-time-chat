// calls.ts - Basic signaling UI for Phase 1 (ringing only)
(function () {
  const w = window as any;
  // UI elements
  function ensureCallsPanel() {
    let panel = document.getElementById('calls-panel') as HTMLDivElement | null;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'calls-panel';
      panel.style.marginTop = '10px';
      panel.style.padding = '10px';
      panel.style.border = '1px solid #e5e7eb';
      panel.style.borderRadius = '8px';
      panel.style.background = '#fff';
      panel.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <strong>Calls (test)</strong>
          <input id="call-target" type="text" placeholder="Target userId" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;" />
          <button id="call-audio" style="padding:6px 10px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;">Call (Audio)</button>
          <button id="call-video" style="padding:6px 10px;border:none;border-radius:6px;background:#8b5cf6;color:#fff;cursor:pointer;">Call (Video)</button>
        </div>
        <div id="incoming-call" style="display:none;padding:8px;border-radius:6px;background:#111827;color:#fff;">
          <span class="txt"></span>
          <button class="accept" style="margin-left:10px;padding:4px 8px;border:none;border-radius:6px;background:#10b981;color:#fff;cursor:pointer;">Accepter</button>
          <button class="decline" style="margin-left:6px;padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;">Refuser</button>
        </div>
        <ul id="call-log" style="list-style:disc;margin:8px 0 0 16px;"></ul>
      `;
      const chat = document.getElementById('chat') || document.body;
      chat.appendChild(panel);
    }
    return panel;
  }

  function log(msg: string) {
    const ul = document.getElementById('call-log');
    if (!ul) return;
    const li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  }

  function init() {
    ensureCallsPanel();
    const input = document.getElementById('call-target') as HTMLInputElement | null;
    const btnA = document.getElementById('call-audio') as HTMLButtonElement | null;
    const btnV = document.getElementById('call-video') as HTMLButtonElement | null;
    const incoming = document.getElementById('incoming-call') as HTMLDivElement | null;
    const txt = incoming?.querySelector('.txt') as HTMLElement | null;
    const acceptBtn = incoming?.querySelector('.accept') as HTMLButtonElement | null;
    const declineBtn = incoming?.querySelector('.decline') as HTMLButtonElement | null;

    btnA && (btnA.onclick = () => {
      const target = input?.value.trim();
      if (!target) { log('Target userId is required'); return; }
      try { w.socket.emit('callRequest', { targetUserId: target, media: 'audio' }, (res: any) => {
        if (res?.success) log(`Outgoing call (audio) -> callId=${res.callId}`);
        else log(`callRequest failed: ${res?.error||'error'}`);
      }); } catch {}
    });
    btnV && (btnV.onclick = () => {
      const target = input?.value.trim();
      if (!target) { log('Target userId is required'); return; }
      try { w.socket.emit('callRequest', { targetUserId: target, media: 'video' }, (res: any) => {
        if (res?.success) log(`Outgoing call (video) -> callId=${res.callId}`);
        else log(`callRequest failed: ${res?.error||'error'}`);
      }); } catch {}
    });

    // Incoming ring
    try { w.socket.on('callIncoming', (p: any) => {
      log(`Incoming call from ${p?.fromUser?.name||p?.fromUser?.id||'?'} (media=${p?.media}) callId=${p?.callId}`);
      if (incoming && txt) {
        txt.textContent = `Appel entrant de ${p?.fromUser?.name||p?.fromUser?.id||'?'} (${p?.media})`;
        incoming.style.display = '';
        acceptBtn && (acceptBtn.onclick = () => {
          try { w.socket.emit('callAccept', { callId: p.callId }, (res: any) => {
            if (res?.success) log(`Accepted callId=${p.callId}`);
            else log(`callAccept failed: ${res?.error||'error'}`);
            incoming.style.display = 'none';
          }); } catch {}
        });
        declineBtn && (declineBtn.onclick = () => {
          try { w.socket.emit('callDecline', { callId: p.callId, reason: 'declined' }, (res: any) => {
            if (res?.success) log(`Declined callId=${p.callId}`);
            else log(`callDecline failed: ${res?.error||'error'}`);
            incoming.style.display = 'none';
          }); } catch {}
        });
      }
    }); } catch {}

    // Other events
    try { w.socket.on('callAccepted', (p: any) => { log(`callAccepted callId=${p?.callId}`); }); } catch {}
    try { w.socket.on('callDeclined', (p: any) => { log(`callDeclined callId=${p?.callId} reason=${p?.reason||''}`); }); } catch {}
    try { w.socket.on('callCanceled', (p: any) => { log(`callCanceled callId=${p?.callId}`); }); } catch {}
    try { w.socket.on('callBusy', (p: any) => { log(`callBusy targetUserId=${p?.targetUserId}`); }); } catch {}
  }

  // Expose minimal helpers for dev
  (window as any).callCancel = function(callId: string) {
    try { w.socket.emit('callCancel', { callId }, (res: any) => log(res?.success ? `Canceled callId=${callId}` : `callCancel failed: ${res?.error||'error'}`)); } catch {}
  };

  // Initialize on load (after socket availability)
  function waitSocket(attempt = 0) {
    if ((window as any).socket) { init(); return; }
    if (attempt > 20) return;
    setTimeout(() => waitSocket(attempt + 1), 500);
  }
  waitSocket();
})();
