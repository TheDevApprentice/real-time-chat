import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { webrtcClient } from '@/services/webrtc/WebRTCClient';
import { socketService } from '@/services/websocket/websocket';

export type MediaKind = 'audio' | 'video';

interface IncomingCall {
  callId: string;
  fromUser: { id: string; name?: string; avatar?: string };
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

  // --- Derived ---
  const inCall = computed(() => status.value === 'accepted');
  const isRinging = computed(() => status.value === 'ringing');

  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    socketService.on('callIncoming', (p: any) => {
      const from = p?.fromUser || p?.from || p?.caller;
      incoming.value = { callId: p?.callId, fromUser: from, media: p?.media } as IncomingCall;
      status.value = 'ringing';
      activeCallId.value = p?.callId || null;
    });
    socketService.on('callAccepted', (p: any) => {
      if (!activeCallId.value || p?.callId !== activeCallId.value) return;
      status.value = 'accepted';
    });
    socketService.on('callDeclined', (p: any) => {
      if (activeCallId.value && p?.callId === activeCallId.value) {
        status.value = 'ended';
        incoming.value = null;
        activeCallId.value = null;
      }
    });
    socketService.on('callCanceled', (p: any) => {
      if (activeCallId.value && p?.callId === activeCallId.value) {
        status.value = 'ended';
        incoming.value = null;
        activeCallId.value = null;
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
            webrtcClient.attachStore({
              sendOffer: (callId, sdp) => new Promise((r) => socketService.emit('callOffer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
              sendAnswer: (callId, sdp) => new Promise((r) => socketService.emit('callAnswer', { callId, sdp: (sdp?.sdp ?? '') }, r)),
              sendIceCandidate: (callId, cand) => new Promise((r) => socketService.emit('callIceCandidate', { callId, candidate: (cand?.candidate ?? '') }, r)),
              getIceServers: () => iceServers.value as any,
              onLocalStream: (s) => { localStream.value = (s?.value ?? null) as MediaStream | null; },
              onRemoteStream: (s) => { remoteStream.value = (s?.value ?? null) as MediaStream | null; },
              onQuality: (q) => { quality.value = (q?.value ?? { bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 }); },
            });
            webrtcClient.startCaller(res.callId, media, iceServers.value as any);
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
              sendOffer: (callId, sdp) => new Promise((r) => socketService.emit('callOffer', { callId, sdp }, r)),
              sendAnswer: (callId, sdp) => new Promise((r) => socketService.emit('callAnswer', { callId, sdp }, r)),
              sendIceCandidate: (callId, cand) => new Promise((r) => socketService.emit('callIceCandidate', { callId, candidate: cand }, r)),
              getIceServers: () => iceServers.value as any,
              onLocalStream: (s) => { localStream.value = (s?.value ?? null) as MediaStream | null; },
              onRemoteStream: (s) => { remoteStream.value = (s?.value ?? null) as MediaStream | null; },
              onQuality: (q) => { quality.value = (q?.value ?? { bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 }); },
            });
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
