import { ref } from 'vue';
import type { MediaKind } from '@/stores/CallsStore';

export type WebRTCQuality = {
  bitrateKbps: number;
  rttMs: number;
  packetsLostPct: number;
};

export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private callId: string | null = null;
  private media: MediaKind | null = null;
  private statsTimer: number | null = null;
  private store: {
    sendOffer: (callId: string, sdp: any) => Promise<any> | any,
    sendAnswer: (callId: string, sdp: any) => Promise<any> | any,
    sendIceCandidate: (callId: string, cand: any) => Promise<any> | any,
    getIceServers: () => RTCIceServer[],
    onLocalStream?: (s: ReturnType<typeof ref<MediaStream | null>>) => void,
    onRemoteStream?: (s: ReturnType<typeof ref<MediaStream | null>>) => void,
    onQuality?: (q: ReturnType<typeof ref<WebRTCQuality>>) => void,
    onError?: (err: unknown) => void,
    getPreAcquiredStream?: () => MediaStream | null,
    onConnectionState?: (state: RTCPeerConnectionState) => void,
    onIceConnectionState?: (state: RTCIceConnectionState) => void,
  } | null = null;

  public localStream = ref<MediaStream | null>(null);
  public remoteStream = ref<MediaStream | null>(null);
  public connectionState = ref<RTCPeerConnectionState>('new');
  public iceConnectionState = ref<RTCIceConnectionState>('new');
  public quality = ref<WebRTCQuality>({ bitrateKbps: 0, rttMs: 0, packetsLostPct: 0 });

  attachStore(store: WebRTCClient["store"]) { this.store = store; }

  private createPC(iceServers: RTCIceServer[]) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc!.onicecandidate = (e) => {
      if (e.candidate && this.callId && this.store) {
        try { console.debug('[RTC] onicecandidate -> sending', e.candidate.candidate); } catch {}
        this.store.sendIceCandidate(this.callId, JSON.stringify(e.candidate));
      }
    };
    this.pc!.onconnectionstatechange = () => {
      try { console.debug('[RTC] connectionState', this.pc!.connectionState); } catch {}
      this.connectionState.value = this.pc!.connectionState;
      try { this.store?.onConnectionState?.(this.connectionState.value); } catch {}
    };
    this.pc!.oniceconnectionstatechange = () => {
      try { console.debug('[RTC] iceConnectionState', this.pc!.iceConnectionState); } catch {}
      this.iceConnectionState.value = this.pc!.iceConnectionState;
      try { this.store?.onIceConnectionState?.(this.iceConnectionState.value); } catch {}
    };
    this.pc!.ontrack = (ev) => {
      try { console.debug('[RTC] ontrack', ev.track.kind, ev.streams?.[0]?.id); } catch {}
      const useIncomingStreamObject = () => {
        const stream0 = ev.streams && ev.streams[0];
        if (stream0) {
          this.remoteStream.value = stream0;
          if (this.store?.onRemoteStream) this.store.onRemoteStream(this.remoteStream);
          return true;
        }
        return false;
      };
      const addTrackToAggregatedStream = () => {
        if (!this.remoteStream.value) this.remoteStream.value = new MediaStream();
        try {
          const tracks = this.remoteStream.value.getTracks();
          if (!tracks.includes(ev.track)) this.remoteStream.value.addTrack(ev.track);
        } catch {}
        if (this.store?.onRemoteStream) this.store.onRemoteStream(this.remoteStream);
      };
      const ensure = () => {
        if (!useIncomingStreamObject()) addTrackToAggregatedStream();
      };
      if (ev.track.muted) {
        ev.track.onunmute = () => { try { ensure(); } catch {} };
      } else {
        ensure();
      }
    };
  }

  async startCaller(callId: string, media: MediaKind, iceServers: RTCIceServer[]) {
    this.callId = callId; this.media = media;
    if (this.pc) await this.end();
    this.createPC(iceServers);

    // Pre-add transceivers to explicitly advertise receive capability and avoid one-way media
    try {
      this.pc!.addTransceiver('audio', { direction: 'sendrecv' });
      this.pc!.addTransceiver('video', { direction: media === 'video' ? 'sendrecv' : 'recvonly' });
    } catch {}

    // Use pre-acquired local stream if provided (for local preview before accept)
    const pre = this.store?.getPreAcquiredStream?.() || null;
    if (pre) {
      this.localStream.value = pre;
    } else {
      // Get local media
      const constraints: MediaStreamConstraints = media === 'video'
        ? { audio: true, video: true }
        : { audio: true };
      try {
        this.localStream.value = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        try { console.warn('[RTC] getUserMedia failed for video, falling back to audio-only (keeping recv video)', err?.name || err); } catch {}
        try {
          this.localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e2) {
          this.store?.onError?.(e2);
          throw e2;
        }
      }
    }
    if (this.localStream.value) {
      this.localStream.value.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream.value!));
    }
    if (this.store?.onLocalStream) this.store.onLocalStream(this.localStream);

    // Always allow receiving video so peer's camera can be displayed even if we start as audio-only
    const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await this.pc.setLocalDescription(offer);
    try { console.debug('[RTC] sending offer, hasVideo?', /\bm=video\b/.test(offer.sdp || '')); } catch {}
    await this.store?.sendOffer(callId, offer);
    this.startStatsLoop();
  }

  async startCalleeIfNeeded(callId: string, media: MediaKind, iceServers: RTCIceServer[]) {
    this.callId = callId; this.media = media;
    if (this.pc) return; // already started
    this.createPC(iceServers);
    // Do not pre-add transceivers; rely on addTrack to create m-lines to avoid mapping issues
    const pre = this.store?.getPreAcquiredStream?.() || null;
    if (pre) {
      this.localStream.value = pre;
    } else {
      const constraints: MediaStreamConstraints = media === 'video'
        ? { audio: true, video: true }
        : { audio: true };
      try {
        this.localStream.value = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        try { console.warn('[RTC] getUserMedia failed for video (callee), falling back to audio-only (keeping recv video)', err?.name || err); } catch {}
        try {
          this.localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e2) {
          this.store?.onError?.(e2);
          throw e2;
        }
      }
    }
    this.localStream.value.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream.value!));
    if (this.store?.onLocalStream) this.store.onLocalStream(this.localStream);
    this.startStatsLoop();
  }

  async handleOffer(callId: string, sdp: RTCSessionDescriptionInit) {
    // Infer media kind from SDP to avoid starting as audio-only for video calls
    const sdpText = (sdp as any)?.sdp as string | undefined;
    const hasVideo = !!sdpText && /\bm=video\b/.test(sdpText);
    const inferred: MediaKind = hasVideo ? 'video' : 'audio';
    this.media = this.media || inferred;
    if (!this.pc) {
      await this.startCalleeIfNeeded(callId, this.media, this.store?.getIceServers() || []);
    }
    await this.pc!.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    try { console.debug('[RTC] sending answer, hasVideo?', /\bm=video\b/.test(answer.sdp || '')); } catch {}
    await this.store?.sendAnswer(callId, answer);
  }

  async handleAnswer(_callId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async handleIceCandidate(_callId: string, candidate: RTCIceCandidateInit | string) {
    if (!this.pc) return;
    try {
      const cand: RTCIceCandidateInit = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
      await this.pc.addIceCandidate(new RTCIceCandidate(cand));
    } catch {}
  }

  // Ensure we have a live local video track and that the sender uses it
  async ensureLocalVideoTrack() {
    if (!this.pc) return;
    try {
      // Try to find a live local video track
      let live = this.localStream.value?.getVideoTracks().find(t => t.readyState === 'live');
      if (!live) {
        // Acquire a fresh one
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = s.getVideoTracks()[0];
        if (!newTrack) return;
        if (!this.localStream.value) this.localStream.value = new MediaStream();
        // Remove old ended tracks to avoid duplicates in preview
        try { this.localStream.value.getVideoTracks().forEach(t => { try { t.stop(); } catch {}; this.localStream.value!.removeTrack(t); }); } catch {}
        this.localStream.value.addTrack(newTrack);
        live = newTrack;
      }

      // Replace the sender track if present; otherwise addTrack
      const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(live);
      } else {
        // Fallback: addTrack (may require renegotiation on some browsers)
        try { this.pc.addTrack(live, this.localStream.value!); } catch {}
      }

      // Ensure video transceiver switches to sendrecv for sending camera
      try {
        const vtr = this.pc.getTransceivers().find(tr => tr.receiver?.track?.kind === 'video' || tr.sender?.track?.kind === 'video');
        if (vtr && vtr.direction !== 'sendrecv') {
          try { (vtr as any).direction = 'sendrecv'; } catch {}
        }
      } catch {}

      // Renegotiate to advertise the new sending video m-line if needed
      await this.renegotiate();

      // Update local preview in UI
      if (this.store?.onLocalStream) this.store.onLocalStream(this.localStream);
    } catch (e) {
      try { console.warn('[RTC] ensureLocalVideoTrack failed', e); } catch {}
    }
  }

  // Lightweight renegotiation helper (caller or callee can use it)
  private async renegotiate() {
    if (!this.pc || !this.callId || !this.store) return;
    try {
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pc.setLocalDescription(offer);
      await this.store.sendOffer(this.callId, offer);
    } catch (e) {
      try { console.warn('[RTC] renegotiate failed', e); } catch {}
    }
  }

  async end() {
    if (this.statsTimer) { window.clearInterval(this.statsTimer); this.statsTimer = null; }
    if (this.pc) {
      try { this.pc.getSenders().forEach(s => { try { s.track?.stop(); } catch {} }); } catch {}
      try { this.pc.getReceivers().forEach(r => { try { r.track.stop(); } catch {} }); } catch {}
      try { this.pc.close(); } catch {}
    }
    this.pc = null; this.callId = null; this.media = null;
    if (this.localStream.value) { try { this.localStream.value.getTracks().forEach(t => t.stop()); } catch {} }
    if (this.remoteStream.value) { try { this.remoteStream.value.getTracks().forEach(t => t.stop()); } catch {} }
    this.localStream.value = null; this.remoteStream.value = null;
    if (this.store?.onLocalStream) this.store.onLocalStream(this.localStream);
    if (this.store?.onRemoteStream) this.store.onRemoteStream(this.remoteStream);
  }

  private startStatsLoop() {
    if (!this.pc) return;
    if (this.statsTimer) window.clearInterval(this.statsTimer);
    let lastBytes = 0; let lastTs = 0;
    this.statsTimer = window.setInterval(async () => {
      if (!this.pc) return;
      try {
        const stats = await this.pc.getStats();
        let bytesNow = 0; let rtt = 0; let lost = 0; let total = 0;
        stats.forEach((r) => {
          if (r.type === 'outbound-rtp' && (r as any).bytesSent) {
            bytesNow += (r as any).bytesSent;
          }
          if ((r.type === 'remote-inbound-rtp' || r.type === 'inbound-rtp') && (r as any).packetsLost != null && (r as any).packetsReceived != null) {
            lost += (r as any).packetsLost;
            total += (r as any).packetsLost + (r as any).packetsReceived;
          }
          if ((r as any).roundTripTime) {
            rtt = Math.max(rtt, (r as any).roundTripTime * 1000);
          }
        });
        const ts = Date.now();
        let bitrateKbps = 0;
        if (lastTs && bytesNow >= lastBytes) {
          const deltaBytes = bytesNow - lastBytes;
          const deltaSec = (ts - lastTs) / 1000;
          bitrateKbps = Math.round((deltaBytes * 8) / 1000 / Math.max(0.2, deltaSec));
        }
        lastBytes = bytesNow; lastTs = ts;
        const packetsLostPct = total > 0 ? Math.round((lost / total) * 100) : 0;
        this.quality.value = { bitrateKbps, rttMs: Math.round(rtt), packetsLostPct };
        if (this.store?.onQuality) this.store.onQuality(this.quality);
      } catch {}
    }, 2000);
  }
}

export const webrtcClient = new WebRTCClient();
