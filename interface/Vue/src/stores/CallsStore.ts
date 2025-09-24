import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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
      }
    });

    // WebRTC signaling relays (UI layer should handle RTCPeerConnection and use these events)
    socketService.on('callOffer', (_p: any) => {/* handled by UI layer via store subscription */});
    socketService.on('callAnswer', (_p: any) => {/* handled by UI layer via store subscription */});
    socketService.on('callIceCandidate', (_p: any) => {/* handled by UI layer via store subscription */});
  }
  bindSocketListeners();

  // --- Actions (emit to server) ---
  function requestCall(targetUserId: string, media: MediaKind): Promise<{ success: boolean; callId?: string; error?: string }>{
    return new Promise((resolve) => {
      socketService.emit('callRequest', { targetUserId, media }, (res: any) => {
        if (res?.success) {
          activeCallId.value = res.callId;
          status.value = 'ringing';
        }
        resolve(res);
      });
    });
  }

  function acceptCall(callId?: string): Promise<{ success: boolean; error?: string }>{
    const cid = callId || activeCallId.value; if (!cid) return Promise.resolve({ success: false, error: 'no-call' });
    return new Promise((resolve) => {
      socketService.emit('callAccept', { callId: cid }, (res: any) => {
        if (res?.success) status.value = 'accepted';
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
        }
        resolve(res);
      });
    });
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
    inCall,
    isRinging,
    requestCall,
    acceptCall,
    declineCall,
    cancelCall,
    hangup,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    fetchTurnConfig,
  };
});
