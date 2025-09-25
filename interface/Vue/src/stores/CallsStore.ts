import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { webrtcClient } from '@/services/webrtc/WebRTCClient';
import { socketService } from '@/services/websocket/websocket';
import { useAuthStore } from './AuthStore';

export type MediaKind = 'audio' | 'video';

interface IncomingCall {
  callId: string;
  fromUser: { id: string; name?: string; avatar?: string };
  toUser?: { id: string; name?: string; avatar?: string };
  media: MediaKind;
}

export const useCallsStore = defineStore('calls', () => {
  // --- State ---
  const activeCallId = ref<string | null>(null);
  const incoming = ref<IncomingCall | null>(null);
  const status = ref<'idle' | 'ringing' | 'accepted' | 'ended'>('idle');
  const iceServers = ref<Array<{ urls: string | string[]; username?: string; credential?: string }>>([]);
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  const quality = ref<{ bitrateKbps: number; rttMs: number; packetsLostPct: number }>({ bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 });
  const micEnabled = ref(true);
  const camEnabled = ref(true);
  const outgoingMedia = ref<MediaKind | null>(null);
  let preAcquiredStream: MediaStream | null = null;
  const pcState = ref<RTCPeerConnectionState>('new');
  const iceState = ref<RTCIceConnectionState>('new');
  const isIncomingCall = ref<boolean>(false);
  const isOutgoingCall = ref<boolean>(false);
  // --- Derived ---
  const inCall = computed(() => status.value === 'accepted');
  const isRinging = computed(() => status.value === 'ringing');
  const userStore = useAuthStore();
  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    socketService.on('callIncoming', (p: any) => {
      const from = p?.fromUser || p?.from || p?.caller;
      incoming.value = { callId: p?.callId, fromUser: from, media: p?.media, toUser: { id: userStore.userId, name: userStore.user } } as IncomingCall;
      console.log("call incoming p", p)
      status.value = 'ringing';
      activeCallId.value = p?.callId || null;
      isIncomingCall.value = true;
      isOutgoingCall.value = false;
    });
    socketService.on('callAccepted', (p: any) => {
      if (!activeCallId.value || p?.callId !== activeCallId.value) return;
      status.value = 'accepted';
      // If we are the caller, start WebRTC now (some servers expect offer after accept)
      if (outgoingMedia.value) {
        fetchTurnConfig().finally(() => {
          webrtcClient.attachStore({
            sendOffer: (callId, sdp) => new Promise((r) => socketService.emit('callOffer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
            sendAnswer: (callId, sdp) => new Promise((r) => socketService.emit('callAnswer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
            sendIceCandidate: (callId, cand) => new Promise((r) => socketService.emit('callIceCandidate', { callId, candidate: (cand?.candidate) }, r)),
            getIceServers: () => iceServers.value as any,
            onLocalStream: (s) => { localStream.value = (s?.value ?? null) as MediaStream | null; },
            onRemoteStream: (s) => {
              const base = (s?.value ?? null) as MediaStream | null;
              const cloned = base ? new MediaStream(base.getTracks()) : null;
              try {
                const vCount = base ? base.getVideoTracks().length : 0;
                const aCount = base ? base.getAudioTracks().length : 0;
                console.debug('[CallsStore][caller] onRemoteStream -> videoTracks:', vCount, 'audioTracks:', aCount);
              } catch {}
              remoteStream.value = cloned;
            },
            onQuality: (q) => { quality.value = (q?.value ?? { bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 }); },
            getPreAcquiredStream: () => preAcquiredStream,
            onConnectionState: (st) => { pcState.value = st; },
            onIceConnectionState: (st) => { iceState.value = st; },
          });
          setTimeout(() => {
            webrtcClient.startCaller(activeCallId.value!, outgoingMedia.value!, iceServers.value as any);
          }, 100);
        });
      }
    });
    socketService.on('callDeclined', (p: any) => {
      if (activeCallId.value && p?.callId === activeCallId.value) {
        status.value = 'ended';
        incoming.value = null;
        activeCallId.value = null;
        try { preAcquiredStream?.getTracks().forEach(t => t.stop()); } catch {}
        preAcquiredStream = null;
      }
    });
    socketService.on('callCanceled', (p: any) => {
      if (activeCallId.value && p?.callId === activeCallId.value) {
        status.value = 'ended';
        incoming.value = null;
        activeCallId.value = null;
        try { preAcquiredStream?.getTracks().forEach(t => t.stop()); } catch {}
        preAcquiredStream = null;
      }
    });
    socketService.on('callEnded', (p: any) => {
      if (activeCallId.value && p?.callId === activeCallId.value) {
        status.value = 'ended';
        incoming.value = null;
        activeCallId.value = null;
        webrtcClient.end();
        localStream.value = null; remoteStream.value = null;
        micEnabled.value = true; camEnabled.value = true;
        try { preAcquiredStream?.getTracks().forEach(t => t.stop()); } catch {}
        preAcquiredStream = null;
      }
    });

    // WebRTC signaling relays (UI layer should handle RTCPeerConnection and use these events)
    socketService.on('callOffer', async (p: any) => {
      if (!p?.callId || typeof p?.sdp !== 'string') return;
      await webrtcClient.handleOffer(p.callId, { type: 'offer', sdp: p.sdp });
    });
    socketService.on('callAnswer', async (p: any) => {
      if (!p?.callId || typeof p?.sdp !== 'string') return;
      await webrtcClient.handleAnswer(p.callId, { type: 'answer', sdp: p.sdp });
    });
    socketService.on('callIceCandidate', async (p: any) => {
      if (!p?.callId || typeof p?.candidate !== 'string') return;
      await webrtcClient.handleIceCandidate(p.callId, { candidate: p.candidate });
    });
  }
  
  bindSocketListeners();

  // --- Actions (emit to server) ---
  function requestCall(targetUserId: string, media: MediaKind): Promise<{ success: boolean; callId?: string; error?: string }>{
    return new Promise((resolve) => {
      fetchTurnConfig().finally(() => {
        socketService.emit('callRequest', { targetUserId, media }, (res: any) => {
          if (res?.success) {
            activeCallId.value = res.callId;
            status.value = 'ringing';
            // Defer WebRTC start until 'callAccepted'
            outgoingMedia.value = media;
            isOutgoingCall.value = true;
            isIncomingCall.value = false;
            // Pre-acquire local media for preview immediately
            (async () => {
              try {
                const constraints: MediaStreamConstraints = media === 'video'
                  ? { audio: true, video: true }
                  : { audio: true };
                preAcquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
                localStream.value = preAcquiredStream;
                // Respect initial mic/cam toggles
                try { preAcquiredStream.getAudioTracks().forEach(t => t.enabled = !!micEnabled.value); } catch {}
                if (media === 'video') { try { preAcquiredStream.getVideoTracks().forEach(t => t.enabled = !!camEnabled.value); } catch {} }
              } catch (err) {
                // If pre-acquire fails, keep going; WebRTC will try again at accept
                // Optionally notify UI via console
                try { console.warn('[CallsStore] pre-acquire stream failed', err); } catch {}
              }
            })();
          }
          resolve(res);
        });
      });
    });
  }

  function acceptCall(callId?: string): Promise<{ success: boolean; error?: string }>{
    const cid = callId || activeCallId.value; if (!cid) return Promise.resolve({ success: false, error: 'no-call' });
    return new Promise((resolve) => {
      socketService.emit('callAccept', { callId: cid }, (res: any) => {
        if (res?.success) status.value = 'accepted';
        if (res?.success) {
          fetchTurnConfig().finally(() => {
            webrtcClient.attachStore({
              sendOffer: (callId, sdp) => new Promise((r) => socketService.emit('callOffer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
              sendAnswer: (callId, sdp) => new Promise((r) => socketService.emit('callAnswer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
              sendIceCandidate: (callId, cand) => new Promise((r) => socketService.emit('callIceCandidate', { callId, candidate: cand }, r)),
              getIceServers: () => iceServers.value as any,
              onLocalStream: (s) => { localStream.value = (s?.value ?? null) as MediaStream | null; },
              onRemoteStream: (s) => {
                const base = (s?.value ?? null) as MediaStream | null;
                const cloned = base ? new MediaStream(base.getTracks()) : null;
                try {
                  const vCount = base ? base.getVideoTracks().length : 0;
                  const aCount = base ? base.getAudioTracks().length : 0;
                  console.debug('[CallsStore][callee] onRemoteStream -> videoTracks:', vCount, 'audioTracks:', aCount);
                } catch {}
                remoteStream.value = cloned;
              },
              onQuality: (q) => { quality.value = (q?.value ?? { bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 }); },
              getPreAcquiredStream: () => preAcquiredStream,
              onConnectionState: (st) => { pcState.value = st; },
              onIceConnectionState: (st) => { iceState.value = st; },
            });
            console.log("fetchTurnConfig().finally localStream ", localStream.value)
            const media = incoming.value?.media || 'audio';
            webrtcClient.startCalleeIfNeeded(cid, media, iceServers.value as any);
          });
        }
        resolve(res);
      });
    });
  }

  function declineCall(reason?: string, callId?: string): Promise<{ success: boolean; error?: string }>{
    const cid = callId || activeCallId.value; if (!cid) return Promise.resolve({ success: false, error: 'no-call' });
    return new Promise((resolve) => {
      socketService.emit('callDecline', { callId: cid, reason }, (res: any) => {
        if (res?.success) {
          status.value = 'ended';
          incoming.value = null;
          activeCallId.value = null;
          webrtcClient.end();
          localStream.value = null; remoteStream.value = null;
          micEnabled.value = true; camEnabled.value = true;
          console.log("declineCall().finally localStream ", localStream.value)
          try { preAcquiredStream?.getTracks().forEach(t => t.stop()); } catch {}
          preAcquiredStream = null;
        }
        resolve(res);
      });
    });
  }

  function cancelCall(callId?: string): Promise<{ success: boolean; error?: string }>{
    const cid = callId || activeCallId.value; if (!cid) return Promise.resolve({ success: false, error: 'no-call' });
    return new Promise((resolve) => {
      socketService.emit('callCancel', { callId: cid }, (res: any) => {
        if (res?.success) {
          status.value = 'ended';
          incoming.value = null;
          activeCallId.value = null;
          try { preAcquiredStream?.getTracks().forEach(t => t.stop()); } catch {}
          preAcquiredStream = null;
        }
        resolve(res);
      });
    });
  }

  function hangup(callId?: string): Promise<{ success: boolean; error?: string }>{
    const cid = callId || activeCallId.value; if (!cid) return Promise.resolve({ success: false, error: 'no-call' });
    return new Promise((resolve) => {
      socketService.emit('callHangup', { callId: cid }, (res: any) => {
        if (res?.success) {
          status.value = 'ended';
          incoming.value = null;
          activeCallId.value = null;
          webrtcClient.end();
          localStream.value = null; remoteStream.value = null;
          micEnabled.value = true; camEnabled.value = true;
        }
        resolve(res);
      });
    });
  }

  // --- Media controls ---
  function setMicEnabled(enabled: boolean) {
    micEnabled.value = enabled;
    try { localStream.value?.getAudioTracks().forEach(t => t.enabled = enabled); } catch {}
  }
  function setCamEnabled(enabled: boolean) {
    camEnabled.value = enabled;
    try { localStream.value?.getVideoTracks().forEach(t => t.enabled = enabled); } catch {}
  }

  // Signaling relays
  function sendOffer(callId: string, sdp: any): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('callOffer', { callId, sdp }, resolve));
  }
  function sendAnswer(callId: string, sdp: any): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('callAnswer', { callId, sdp }, resolve));
  }
  function sendIceCandidate(callId: string, candidate: any): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('callIceCandidate', { callId, candidate }, resolve));
  }

  function fetchTurnConfig(): Promise<{ success: boolean; iceServers: any[] }>{
    return new Promise((resolve) => {
      socketService.emit('getTurnConfig', {}, (res: any) => {
        if (res?.success && Array.isArray(res.iceServers)) {
          iceServers.value = res.iceServers;
        }
        resolve(res);
      });
    });
  }

  return {
    activeCallId,
    incoming,
    status,
    iceServers,
    localStream,
    remoteStream,
    quality,
    micEnabled,
    camEnabled,
    inCall,
    isRinging,
    pcState,
    iceState,
    isIncomingCall,
    isOutgoingCall,
    requestCall,
    acceptCall,
    declineCall,
    cancelCall,
    hangup,
    setMicEnabled,
    setCamEnabled,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    fetchTurnConfig,
    getIceServers: () => iceServers.value,
  };
});
