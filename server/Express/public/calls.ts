// calls.ts - Basic signaling UI for Phase 1 (ringing only)
(function () {
  const w = window as any;
  type IceServer = { urls: string | string[]; username?: string; credential?: string };
  let currentCallId: string | null = null;
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudio: HTMLAudioElement | null = null;
  let audioGate: HTMLDivElement | null = null;
  let iceServers: IceServer[] | null = null;
  let addedTracks = false;
  let makingOffer = false;
  let requestedMedia: 'audio' | 'video' = 'audio';
  let localVideo: HTMLVideoElement | null = null;
  let remoteVideo: HTMLVideoElement | null = null;
  let permissionsReady = false;
  let remoteRenderStream: MediaStream | null = null;
  let pendingAddLocal = false;
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
        </div>
        <div id="active-call" style="display:none;margin-top:8px;padding:8px;border-radius:6px;background:#f3f4f6;color:#111;">
          <span class="status">Call active</span>
          <button class="mute" style="margin-left:10px;padding:4px 8px;border:none;border-radius:6px;background:#6b7280;color:#fff;cursor:pointer;">Mute</button>
          <button class="hangup" style="margin-left:6px;padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;">Hang up</button>
        </div>
        <div id="video-area" style="display:none;margin-top:8px;gap:8px;align-items:center;justify-content:center;">
          <video id="webrtc-local-video" autoplay muted playsinline style="max-width:48%;border-radius:8px;background:#111;aspect-ratio:16/9"></video>
          <video id="webrtc-remote-video" autoplay playsinline style="max-width:48%;border-radius:8px;background:#111;aspect-ratio:16/9"></video>
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
        <div class="perm" style="font-size:12px;color:#6b7280;margin-bottom:10px;">
          Autorisations requises: micro ${navigator?.mediaDevices ? '' : '(non supporté)'}<span class="vonly" style="display:none;"> + caméra</span>
          <button class="grant" style="margin-left:8px;padding:4px 8px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;">Accorder</button>
          <span class="pstat" style="margin-left:6px;color:#ef4444;">En attente…</span>
        </div>
        <div>
          <button class="accept" disabled style="padding:6px 12px;border:none;border-radius:8px;background:#10b981;color:#fff;cursor:not-allowed;opacity:0.7;margin-right:8px;">Accepter</button>
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
    // Note: input/btns removed; calls are now triggered from friends panel via global functions
    const overlay = ensureIncomingOverlay();
    const oTxt = overlay.querySelector('.txt') as HTMLElement | null;
    const oAccept = overlay.querySelector('.accept') as HTMLButtonElement | null;
    const oDecline = overlay.querySelector('.decline') as HTMLButtonElement | null;
    const oPerm = overlay.querySelector('.perm') as HTMLDivElement | null;
    const oGrant = overlay.querySelector('.grant') as HTMLButtonElement | null;
    const oPstat = overlay.querySelector('.pstat') as HTMLSpanElement | null;
    const oVonly = overlay.querySelector('.vonly') as HTMLSpanElement | null;
    const active = document.getElementById('active-call') as HTMLDivElement | null;
    const muteBtn = active?.querySelector('.mute') as HTMLButtonElement | null;
    const hangBtn = active?.querySelector('.hangup') as HTMLButtonElement | null;

    // prepare media renderers
    remoteAudio = document.getElementById('webrtc-remote') as HTMLAudioElement | null;
    if (!remoteAudio) {
      remoteAudio = document.createElement('audio');
      remoteAudio.id = 'webrtc-remote';
      remoteAudio.autoplay = true;
      try { remoteAudio.setAttribute('playsinline', 'true'); } catch {}
      document.body.appendChild(remoteAudio);
    }
    localVideo = document.getElementById('webrtc-local-video') as HTMLVideoElement | null;
    remoteVideo = document.getElementById('webrtc-remote-video') as HTMLVideoElement | null;

    // Wire mute/hang buttons here to guarantee actions
    if (muteBtn) {
      muteBtn.onclick = () => {
        try {
          const track = localStream?.getAudioTracks()[0];
          if (track) {
            const enabled = !!track.enabled;
            track.enabled = !enabled;
            muteBtn.textContent = enabled ? 'Unmute' : 'Mute';
          }
        } catch {}
      };
    }
    if (hangBtn) {
      hangBtn.onclick = () => {
        const id = currentCallId;
        if (id) {
          try { w.socket.emit('callHangup', { callId: id }, (res: any) => {
            if (!res?.success) log(`callHangup failed: ${res?.error||'error'}`);
          }); } catch {}
        }
        endCall();
      };
    }

    // Fallback gate if autoplay is blocked
    audioGate = document.getElementById('webrtc-audio-gate') as HTMLDivElement | null;
    if (!audioGate) {
      audioGate = document.createElement('div');
      audioGate.id = 'webrtc-audio-gate';
      audioGate.style.position = 'fixed';
      audioGate.style.right = '16px';
      audioGate.style.bottom = '80px';
      audioGate.style.background = '#111827';
      audioGate.style.color = '#fff';
      audioGate.style.padding = '8px 12px';
      audioGate.style.borderRadius = '10px';
      audioGate.style.display = 'none';
      audioGate.style.zIndex = '10001';
      audioGate.innerHTML = '<span>Audio bloqué</span> <button style="margin-left:8px;padding:4px 8px;border:none;border-radius:6px;background:#10b981;color:#fff;cursor:pointer;">Activer</button>';
      document.body.appendChild(audioGate);
      const btn = audioGate.querySelector('button') as HTMLButtonElement | null;
      if (btn) btn.onclick = async () => {
        try { await remoteAudio!.play(); audioGate!.style.display = 'none'; } catch {}
      };
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
      pc.ontrack = async (ev) => {
        try {
          const [stream] = ev.streams;
          if (!stream) return;
          const localTrackIds = new Set<string>(
            (localStream?.getTracks() || []).map(t => t.id)
          );
          const isSelfTrack = localTrackIds.has(ev.track?.id || '');
          log(`ontrack kind=${ev.track?.kind} stream.id=${stream?.id} self=${isSelfTrack}`);
          if (isSelfTrack) return; // prevent rendering our own capture

          if (!remoteRenderStream) remoteRenderStream = new MediaStream();
          // Avoid adding duplicates
          const already = remoteRenderStream.getTracks().some(t => t.id === ev.track.id);
          if (!already) remoteRenderStream.addTrack(ev.track);

          if (remoteAudio) {
            remoteAudio.srcObject = remoteRenderStream;
            try { await remoteAudio.play(); } catch { if (audioGate) audioGate.style.display = ''; }
          }
          if (remoteVideo && requestedMedia === 'video') {
            try { (remoteVideo as any).srcObject = remoteRenderStream; } catch {}
            const area = document.getElementById('video-area') as HTMLDivElement | null;
            if (area) area.style.display = '';
          }
        } catch {}
      };
      pc.onconnectionstatechange = () => log(`pc state: ${pc?.connectionState}`);
      // Note: We avoid manual addTransceiver to prevent duplicate m-lines.
      // addTrack will create the needed transceivers.
      return pc;
    }

    async function getLocalMedia(kind: 'audio'|'video') {
      if (localStream) return localStream;
      try {
        if (kind === 'video') {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } as any,
          });
        } else {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
          });
        }
        // bind local preview if video
        if (kind === 'video' && localVideo && localStream) {
          try { (localVideo as any).srcObject = localStream; } catch {}
          const area = document.getElementById('video-area') as HTMLDivElement | null;
          if (area) area.style.display = '';
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        log(`getUserMedia error: ${msg}`);
        (window as any).console?.error?.('getUserMedia error', e);
        localStream = null;
      }
      return localStream;
    }

    function showActive(show: boolean) { if (active) active.style.display = show ? '' : 'none'; }

    // Buttons removed; expose helpers for friends panel
    async function startCall(target: string, media: 'audio'|'video') {
      if (!target) { log('Target userId is required'); return; }
      requestedMedia = media;
      // Enforce permissions before sending request
      const ok = await ensurePermissions(media);
      if (!ok) { log('Permissions not granted'); return; }
      try { w.socket.emit('callRequest', { targetUserId: target, media }, async (res: any) => {
        if (res?.success) {
          currentCallId = String(res.callId);
          log(`Outgoing call (${media}) -> callId=${currentCallId}`);
          await getLocalMedia(media); await ensurePc();
          if (!addedTracks && localStream) {
            localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));
            addedTracks = true;
          }
        } else log(`callRequest failed: ${res?.error||'error'}`);
      }); } catch {}
    }
    (window as any).startCallAudio = (userId: string) => startCall(userId, 'audio');
    (window as any).startCallVideo = (userId: string) => startCall(userId, 'video');

    function haveLocal(kind: 'audio'|'video') {
      const hasAudio = !!localStream?.getAudioTracks()?.some(t => t.readyState !== 'ended');
      const hasVideo = !!localStream?.getVideoTracks()?.some(t => t.readyState !== 'ended');
      return kind === 'audio' ? hasAudio : (hasAudio && hasVideo);
    }

    async function ensurePermissions(kind: 'audio'|'video'): Promise<boolean> {
      try {
        if (haveLocal(kind)) { permissionsReady = true; return true; }
        await getLocalMedia(kind);
        permissionsReady = haveLocal(kind);
        updatePermUI();
        return permissionsReady;
      } catch {
        permissionsReady = false;
        updatePermUI();
        return false;
      }
    }

    function updatePermUI() {
      if (!oPerm) return;
      if (permissionsReady) {
        if (oPstat) { oPstat.textContent = 'OK'; oPstat.style.color = '#10b981'; }
        if (oAccept) { oAccept.disabled = false; oAccept.style.cursor = 'pointer'; oAccept.style.opacity = '1'; }
      } else {
        if (oPstat) { oPstat.textContent = 'En attente…'; oPstat.style.color = '#ef4444'; }
        if (oAccept) { oAccept.disabled = true; oAccept.style.cursor = 'not-allowed'; oAccept.style.opacity = '0.7'; }
      }
    }

    // Incoming ring
    try { w.socket.on('callIncoming', (p: any) => {
      log(`Incoming call from ${p?.fromUser?.name||p?.fromUser?.id||'?'} (media=${p?.media}) callId=${p?.callId}`);
      requestedMedia = (p?.media === 'video') ? 'video' : 'audio';
      // Overlay (centered)
      if (overlay && oTxt && oAccept && oDecline) {
        oTxt.textContent = `Appel entrant de ${p?.fromUser?.name||p?.fromUser?.id||'?'} (${p?.media})`;
        overlay.style.display = 'flex';
        if (oVonly) oVonly.style.display = (requestedMedia === 'video') ? '' : 'none';
        updatePermUI();
        if (oGrant) oGrant.onclick = async () => { await ensurePermissions(requestedMedia); };
        oAccept.onclick = () => {
          try { w.socket.emit('callAccept', { callId: p.callId }, async (res: any) => {
            if (res?.success) {
              currentCallId = String(p.callId);
              log(`Accepted callId=${currentCallId}`);
              overlay.style.display = 'none';
              await getLocalMedia(requestedMedia); await ensurePc();
              // Defer adding tracks until after remote offer is set
              pendingAddLocal = true;
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
        await getLocalMedia(requestedMedia);
        await ensurePc();
        if (!addedTracks && localStream) {
          localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));
          addedTracks = true;
        }
        if (pc!.signalingState !== 'stable') {
          log(`offer skipped: signalingState=${pc!.signalingState}`);
          return;
        }
        log(`creating offer; senders=${pc!.getSenders().length}, transceivers=${pc!.getTransceivers().length}`);
        makingOffer = true;
        const offer = await pc!.createOffer();
        await pc!.setLocalDescription(offer);
        w.socket.emit('callOffer', { callId: currentCallId, sdp: JSON.stringify(offer) });
        showActive(true);
      } catch (e: any) {
        const msg = e?.message || String(e);
        log(`offer error: ${msg}`);
        try { log(`state pc=${pc?.signalingState} conn=${pc?.connectionState}`); } catch {}
        (window as any).console?.error?.('offer error', e);
      } finally { makingOffer = false; }
    }); } catch {}
    try { w.socket.on('callOffer', async (p: any) => {
      log(`callOffer ${p?.callId}`);
      if (!currentCallId) currentCallId = String(p?.callId||'');
      try {
        await ensurePc();
        const offer = JSON.parse(p?.sdp||'{}');
        await pc!.setRemoteDescription(offer);
        // If we deferred local tracks (callee), add them just before creating answer
        if (pendingAddLocal && localStream && !addedTracks) {
          localStream.getTracks().forEach(t => pc!.addTrack(t, localStream!));
          addedTracks = true;
          pendingAddLocal = false;
        }
        // Callee creates answer and sends
        const answer = await pc!.createAnswer();
        await pc!.setLocalDescription(answer);
        w.socket.emit('callAnswer', { callId: currentCallId, sdp: JSON.stringify(answer) });
      } catch (e: any) {
        const msg = e?.message || String(e);
        log(`answer error: ${msg}`);
        (window as any).console?.error?.('answer error', e);
      }
    }); } catch {}
    try { w.socket.on('callAnswer', async (p: any) => {
      log(`callAnswer ${p?.callId}`);
      try {
        const desc = JSON.parse(p?.sdp||'{}');
        await pc?.setRemoteDescription(desc);
        // ensure playback if remote arrived first
        try { await remoteAudio?.play(); } catch { if (audioGate) audioGate.style.display = ''; }
      } catch {}
    }); } catch {}
    try { w.socket.on('callIceCandidate', async (p: any) => {
      log(`callIceCandidate ${p?.callId}`);
      try { const cand = JSON.parse(p?.candidate||'{}'); await pc?.addIceCandidate(cand); } catch {}
    }); } catch {}
    try { w.socket.on('callEnded', (p: any) => {
      log(`callEnded ${p?.callId}`);
      endCall();
    }); } catch {}
    // Ring timeout handling via callDeclined(reason=timeout)
    try { w.socket.on('callDeclined', (p: any) => {
      if (p?.reason === 'timeout') {
        log(`call timed out callId=${p?.callId}`);
        endCall();
      }
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
    if (localVideo) (localVideo as any).srcObject = null;
    if (remoteVideo) (remoteVideo as any).srcObject = null;
    remoteRenderStream = null;
    const area = document.getElementById('video-area') as HTMLDivElement | null;
    if (area) area.style.display = 'none';
    currentCallId = null;
    addedTracks = false;
    makingOffer = false;
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
