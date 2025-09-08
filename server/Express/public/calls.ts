// calls.ts - Basic signaling UI for Phase 1 (ringing only)
(function () {
  const w = window as any;
  type IceServer = { urls: string | string[]; username?: string; credential?: string };
  let currentCallId: string | null = null;
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudio: HTMLAudioElement | null = null;
  let iceServers: IceServer[] | null = null;
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
        <div id="active-call" style="display:none;margin-top:8px;padding:8px;border-radius:6px;background:#f3f4f6;color:#111;">
          <span class="status">Call active</span>
          <button class="mute" style="margin-left:10px;padding:4px 8px;border:none;border-radius:6px;background:#6b7280;color:#fff;cursor:pointer;">Mute</button>
          <button class="hangup" style="margin-left:6px;padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;">Hang up</button>
        </div>
        <ul id="call-log" style="list-style:disc;margin:8px 0 0 16px;"></ul>
      `;
      const chat = document.getElementById('chat') || document.body;
      chat.appendChild(panel);
    }
    return panel;
  }

  function ensureCallsButton() {
    let btn = document.getElementById('calls-fab') as HTMLButtonElement | null;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'calls-fab';
      btn.textContent = 'Appels';
      btn.style.position = 'fixed';
      btn.style.right = '16px';
      btn.style.bottom = '16px';
      btn.style.padding = '10px 14px';
      btn.style.border = 'none';
      btn.style.borderRadius = '9999px';
      btn.style.background = '#8b5cf6';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      btn.style.cursor = 'pointer';
      btn.onclick = () => {
        const panel = ensureCallsPanel();
        panel.style.display = panel.style.display === 'none' ? '' : (panel.style.display || '') === '' ? 'none' : '';
      };
      document.body.appendChild(btn);
    }
    return btn;
  }

  function ensureIncomingOverlay() {
    let overlay = document.getElementById('incoming-overlay') as HTMLDivElement | null;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'incoming-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.55)';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '10000';
      const card = document.createElement('div');
      card.style.background = '#ffffff';
      card.style.borderRadius = '12px';
      card.style.padding = '16px';
      card.style.minWidth = '280px';
      card.style.textAlign = 'center';
      card.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;">Appel entrant</div>
        <div class="txt" style="margin-bottom:12px;color:#374151"></div>
        <div>
          <button class="accept" style="padding:6px 12px;border:none;border-radius:8px;background:#10b981;color:#fff;cursor:pointer;margin-right:8px;">Accepter</button>
          <button class="decline" style="padding:6px 12px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;">Refuser</button>
        </div>
      `;
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    }
    return overlay;
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
    ensureCallsButton();
    ensureIncomingOverlay();
    const input = document.getElementById('call-target') as HTMLInputElement | null;
    const btnA = document.getElementById('call-audio') as HTMLButtonElement | null;
    const btnV = document.getElementById('call-video') as HTMLButtonElement | null;
    const incoming = document.getElementById('incoming-call') as HTMLDivElement | null;
    const txt = incoming?.querySelector('.txt') as HTMLElement | null;
    const acceptBtn = incoming?.querySelector('.accept') as HTMLButtonElement | null;
    const declineBtn = incoming?.querySelector('.decline') as HTMLButtonElement | null;
    const overlay = ensureIncomingOverlay();
    const oTxt = overlay.querySelector('.txt') as HTMLElement | null;
    const oAccept = overlay.querySelector('.accept') as HTMLButtonElement | null;
    const oDecline = overlay.querySelector('.decline') as HTMLButtonElement | null;
    const active = document.getElementById('active-call') as HTMLDivElement | null;
    const muteBtn = active?.querySelector('.mute') as HTMLButtonElement | null;
    const hangBtn = active?.querySelector('.hangup') as HTMLButtonElement | null;

    // prepare remote audio tag
    remoteAudio = document.getElementById('webrtc-remote') as HTMLAudioElement | null;
    if (!remoteAudio) {
      remoteAudio = document.createElement('audio');
      remoteAudio.id = 'webrtc-remote';
      remoteAudio.autoplay = true;
      try { remoteAudio.setAttribute('playsinline', 'true'); } catch {}
      document.body.appendChild(remoteAudio);
    }

    const ensureIce = async () => {
      if (iceServers) return iceServers;
      try {
        const cfg = await new Promise<any>((resolve) => {
          w.socket.emit('getTurnConfig', {}, (res: any) => resolve(res));
        });
        if (cfg?.success && Array.isArray(cfg.iceServers)) iceServers = cfg.iceServers;
        else iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      } catch { iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]; }
      return iceServers!;
    };

    async function ensurePc(): Promise<RTCPeerConnection> {
      if (pc) return pc;
      const servers = await ensureIce();
      pc = new RTCPeerConnection({ iceServers: servers });
      pc.onicecandidate = (ev) => {
        if (ev.candidate && currentCallId) {
          try { w.socket.emit('callIceCandidate', { callId: currentCallId, candidate: JSON.stringify(ev.candidate) }); } catch {}
        }
      };
      pc.ontrack = (ev) => {
        try {
          const [stream] = ev.streams;
          if (remoteAudio && stream) remoteAudio.srcObject = stream;
        } catch {}
      };
      pc.onconnectionstatechange = () => log(`pc state: ${pc?.connectionState}`);
      return pc;
    }

    async function getMic() {
      if (localStream) return localStream;
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream;
    }

    function showActive(show: boolean) { if (active) active.style.display = show ? '' : 'none'; }

    btnA && (btnA.onclick = () => {
      const target = input?.value.trim();
      if (!target) { log('Target userId is required'); return; }
      try { w.socket.emit('callRequest', { targetUserId: target, media: 'audio' }, async (res: any) => {
        if (res?.success) {
          currentCallId = String(res.callId);
          log(`Outgoing call (audio) -> callId=${currentCallId}`);
          // prepare local mic and pc, wait for acceptance to create offer
          await getMic(); await ensurePc();
          localStream!.getTracks().forEach(t => pc!.addTrack(t, localStream!));
        }
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
      // Inline banner
      if (incoming && txt) {
        txt.textContent = `Appel entrant de ${p?.fromUser?.name||p?.fromUser?.id||'?'} (${p?.media})`;
        incoming.style.display = '';
        acceptBtn && (acceptBtn.onclick = () => {
          try { w.socket.emit('callAccept', { callId: p.callId }, async (res: any) => {
            if (res?.success) {
              currentCallId = String(p.callId);
              log(`Accepted callId=${currentCallId}`);
              incoming.style.display = 'none';
              // Callee prepares mic + pc and waits for offer
              await getMic(); await ensurePc();
              localStream!.getTracks().forEach(t => pc!.addTrack(t, localStream!));
              showActive(true);
            } else log(`callAccept failed: ${res?.error||'error'}`);
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
      // Overlay (centered)
      if (overlay && oTxt && oAccept && oDecline) {
        oTxt.textContent = `Appel entrant de ${p?.fromUser?.name||p?.fromUser?.id||'?'} (${p?.media})`;
        overlay.style.display = 'flex';
        oAccept.onclick = () => {
          try { w.socket.emit('callAccept', { callId: p.callId }, async (res: any) => {
            if (res?.success) {
              currentCallId = String(p.callId);
              log(`Accepted callId=${currentCallId}`);
              overlay.style.display = 'none';
              await getMic(); await ensurePc();
              localStream!.getTracks().forEach(t => pc!.addTrack(t, localStream!));
              showActive(true);
            } else log(`callAccept failed: ${res?.error||'error'}`);
          }); } catch {}
        };
        oDecline.onclick = () => {
          try { w.socket.emit('callDecline', { callId: p.callId, reason: 'declined' }, (res: any) => {
            if (res?.success) log(`Declined callId=${p.callId}`);
            else log(`callDecline failed: ${res?.error||'error'}`);
            overlay.style.display = 'none';
          }); } catch {}
        };
      }
    }); } catch {}

    // Other events
    try { w.socket.on('callAccepted', async (p: any) => {
      log(`callAccepted callId=${p?.callId}`);
      if (!currentCallId) currentCallId = String(p?.callId||'');
      // Caller creates offer and sends
      try {
        await ensurePc();
        if (localStream) localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));
        const offer = await pc!.createOffer();
        await pc!.setLocalDescription(offer);
        w.socket.emit('callOffer', { callId: currentCallId, sdp: JSON.stringify(offer) });
        showActive(true);
      } catch (e) { log('offer error'); }
    }); } catch {}
    try { w.socket.on('callOffer', async (p: any) => {
      log(`callOffer ${p?.callId}`);
      if (!pc) await ensurePc();
      try {
        const desc = JSON.parse(p?.sdp||'{}');
        await pc!.setRemoteDescription(desc);
        const answer = await pc!.createAnswer();
        await pc!.setLocalDescription(answer);
        w.socket.emit('callAnswer', { callId: currentCallId || String(p?.callId||''), sdp: JSON.stringify(answer) });
      } catch (e) { log('answer error'); }
    }); } catch {}
    try { w.socket.on('callAnswer', async (p: any) => {
      log(`callAnswer ${p?.callId}`);
      try { const desc = JSON.parse(p?.sdp||'{}'); await pc?.setRemoteDescription(desc); } catch {}
    }); } catch {}
    try { w.socket.on('callIceCandidate', async (p: any) => {
      log(`callIceCandidate ${p?.callId}`);
      try { const cand = JSON.parse(p?.candidate||'{}'); await pc?.addIceCandidate(cand); } catch {}
    }); } catch {}
  }

  // Expose minimal helpers for dev
  (window as any).callCancel = function(callId: string) {
    try { w.socket.emit('callCancel', { callId }, (res: any) => log(res?.success ? `Canceled callId=${callId}` : `callCancel failed: ${res?.error||'error'}`)); } catch {}
  };

  function endCall() {
    try { if (pc) { pc.onicecandidate = null; pc.ontrack = null; pc.close(); } } catch {}
    pc = null;
    try { localStream?.getTracks().forEach(t => t.stop()); } catch {}
    localStream = null;
    if (remoteAudio) remoteAudio.srcObject = null;
    currentCallId = null;
    const active = document.getElementById('active-call') as HTMLDivElement | null;
    if (active) active.style.display = 'none';
  }

  // UI controls
  (function wireControls(){
    const active = document.getElementById('active-call') as HTMLDivElement | null;
    const muteBtn = active?.querySelector('.mute') as HTMLButtonElement | null;
    const hangBtn = active?.querySelector('.hangup') as HTMLButtonElement | null;
    if (muteBtn) muteBtn.onclick = () => {
      try {
        const enabled = !!localStream?.getAudioTracks()[0]?.enabled;
        if (localStream?.getAudioTracks()[0]) localStream.getAudioTracks()[0].enabled = !enabled;
        muteBtn.textContent = enabled ? 'Unmute' : 'Mute';
      } catch {}
    };
    if (hangBtn) hangBtn.onclick = () => { endCall(); };
  })();

  // Initialize on load (after socket availability)
  function waitSocket(attempt = 0) {
    if ((window as any).socket) { init(); return; }
    if (attempt > 20) return;
    setTimeout(() => waitSocket(attempt + 1), 500);
  }
  waitSocket();
})();
