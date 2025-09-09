import type { WsContext } from "../router/WsContext";
import { K, TTL, jsonGet, jsonSet, delMany } from "../../../cache/cacheKeys";

function genId(): string {
  // Lightweight UUID-ish id (not for crypto) e.g. ab12cd34-... length ~ 24
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 24);
}

interface CallSession {
  callId: string;
  callerId: string;
  calleeId: string;
  media: "audio" | "video";
  status: "ringing" | "accepted" | "ended";
  createdAt: number;
}

export class CallsWsController {
  async callRequest(
    ctx: WsContext<{ targetUserId: string; media: "audio" | "video"; roomId?: string }>
  ) {
    const { socket, io, services } = ctx;
    const callerId = (socket.data as any)?.userId as string | undefined;
    if (!callerId) return { success: false, error: "Not authenticated." };

    const { targetUserId, media } = (ctx.payload || {}) as any;
    if (!targetUserId || (media !== "audio" && media !== "video")) {
      return { success: false, error: "Invalid payload." };
    }
    if (targetUserId === callerId) return { success: false, error: "Cannot call yourself." };

    const { friendService, roomService, redisService, userService } = services as any;

    // Permission: accepted friends OR share at least one room
    let allowed = false;
    try {
      const isFriend = await friendService.areFriends(callerId, targetUserId);
      if (isFriend) allowed = true;
      if (!allowed) {
        const shared = await roomService.haveSharedRoom(callerId, targetUserId);
        if (shared) allowed = true;
      }
    } catch {}
    if (!allowed) return { success: false, error: "Not allowed to call this user." };

    // Busy check
    try {
      const calleeBusy = await redisService.get(K.userCall(targetUserId));
      if (calleeBusy) {
        try { socket.emit("callBusy", { targetUserId }); } catch {}
        return { success: false, error: "User is busy." };
      }
    } catch {}

    // Create call session
    const callId = genId();
    const ringTimeoutSec = Math.max(5, Math.min(300, Number(process.env.CALL_RING_TIMEOUT || TTL.callRinging)));
    const sess: CallSession = {
      callId,
      callerId,
      calleeId: targetUserId,
      media,
      status: "ringing",
      createdAt: Date.now(),
    };
    await jsonSet(redisService, K.callSession(callId), sess, ringTimeoutSec);
    try { await redisService.set(K.userCall(callerId), callId, { EX: ringTimeoutSec }); } catch {}
    try { await redisService.set(K.userCall(targetUserId), callId, { EX: ringTimeoutSec }); } catch {}

    // Load basic user info for UI
    let caller: any = null;
    try { caller = await userService.getUserById(callerId); } catch {}
    const fromUser = caller ? { id: caller.id, name: caller.name, avatar: caller.avatarUrl || undefined } : { id: callerId };

    // Notify callee on all devices
    try {
      const sockets = await redisService.sMembers(K.userSockets(targetUserId));
      for (const sid of sockets || []) {
        try { io.to(sid).emit("callIncoming", { callId, fromUser, media }); } catch {}
      }
    } catch {}

    // Auto-timeout ring: if still ringing after TTL.callRinging, end and notify
    setTimeout(async () => {
      try {
        const s = await jsonGet<CallSession>(redisService, K.callSession(callId));
        if (s && s.status === "ringing") {
          s.status = "ended";
          await jsonSet(redisService, K.callSession(callId), s, 10);
          const notify = async (uid: string) => {
            try {
              const devs = await redisService.sMembers(K.userSockets(uid));
              for (const d of devs || []) io.to(d).emit("callDeclined", { callId, reason: "timeout" });
            } catch {}
          };
          await notify(s.callerId);
          await notify(s.calleeId);
          await delMany(redisService, [K.userCall(s.callerId), K.userCall(s.calleeId), K.callSession(callId)]);
        }
      } catch {}
    }, (ringTimeoutSec + 1) * 1000);

    return { success: true, callId };
  }

  async callAccept(ctx: WsContext<{ callId: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId } = (ctx.payload || {}) as any;
    if (!callId) return { success: false, error: "Missing callId." };

    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (sess.status !== "ringing") return { success: false, error: "Call not in ringing state." };
    if (sess.calleeId !== uid) return { success: false, error: "Only callee can accept." };

    sess.status = "accepted";
    await jsonSet(redisService, K.callSession(callId), sess, TTL.callActive);
    try { await redisService.set(K.userCall(sess.callerId), callId, { EX: TTL.callActive }); } catch {}
    try { await redisService.set(K.userCall(sess.calleeId), callId, { EX: TTL.callActive }); } catch {}

    // Notify caller devices
    try {
      const sockets = await redisService.sMembers(K.userSockets(sess.callerId));
      for (const sid of sockets || []) io.to(sid).emit("callAccepted", { callId });
    } catch {}

    return { success: true };
  }

  async callHangup(ctx: WsContext<{ callId: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId } = (ctx.payload || {}) as any;
    if (!callId) return { success: false, error: "Missing callId." };

    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (uid !== sess.callerId && uid !== sess.calleeId) return { success: false, error: "Not part of this call." };

    // Mark ended and notify the peer
    sess.status = "ended";
    await jsonSet(redisService, K.callSession(callId), sess, 10);
    const other = uid === sess.callerId ? sess.calleeId : sess.callerId;
    try {
      const sockets = await redisService.sMembers(K.userSockets(other));
      for (const sid of sockets || []) io.to(sid).emit("callEnded", { callId });
    } catch {}
    try { await delMany(redisService, [K.userCall(sess.callerId), K.userCall(sess.calleeId), K.callSession(callId)]); } catch {}
    return { success: true };
  }

  async callDecline(ctx: WsContext<{ callId: string; reason?: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId, reason } = (ctx.payload || {}) as any;
    if (!callId) return { success: false, error: "Missing callId." };

    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (sess.status === "ended") return { success: true };
    if (uid !== sess.calleeId && uid !== sess.callerId) return { success: false, error: "Not part of this call." };

    sess.status = "ended";
    await jsonSet(redisService, K.callSession(callId), sess, 10);

    // Notify the opposite party
    const other = uid === sess.callerId ? sess.calleeId : sess.callerId;
    try {
      const sockets = await redisService.sMembers(K.userSockets(other));
      for (const sid of sockets || []) io.to(sid).emit("callDeclined", { callId, reason });
    } catch {}

    try { await delMany(redisService, [K.userCall(sess.callerId), K.userCall(sess.calleeId), K.callSession(callId)]); } catch {}

    return { success: true };
  }

  async callCancel(ctx: WsContext<{ callId: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId } = (ctx.payload || {}) as any;
    if (!callId) return { success: false, error: "Missing callId." };

    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (sess.callerId !== uid) return { success: false, error: "Only caller can cancel ringing." };
    if (sess.status !== "ringing") return { success: false, error: "Call is not ringing." };

    sess.status = "ended";
    await jsonSet(redisService, K.callSession(callId), sess, 10);

    // Notify callee devices
    try {
      const sockets = await (services as any).redisService.sMembers(K.userSockets(sess.calleeId));
      for (const sid of sockets || []) io.to(sid).emit("callCanceled", { callId });
    } catch {}

    try { await delMany(redisService, [K.userCall(sess.callerId), K.userCall(sess.calleeId), K.callSession(callId)]); } catch {}

    return { success: true };
  }

  async callOffer(ctx: WsContext<{ callId: string; sdp: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId, sdp } = (ctx.payload || {}) as any;
    if (!callId || !sdp) return { success: false, error: "Missing fields." };
    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (uid !== sess.callerId && uid !== sess.calleeId) return { success: false, error: "Not part of this call." };
    const other = uid === sess.callerId ? sess.calleeId : sess.callerId;
    try {
      const sockets = await redisService.sMembers(K.userSockets(other));
      for (const sid of sockets || []) io.to(sid).emit('callOffer', { callId, sdp });
    } catch {}
    return { success: true };
  }

  async callAnswer(ctx: WsContext<{ callId: string; sdp: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId, sdp } = (ctx.payload || {}) as any;
    if (!callId || !sdp) return { success: false, error: "Missing fields." };
    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (uid !== sess.callerId && uid !== sess.calleeId) return { success: false, error: "Not part of this call." };
    const other = uid === sess.callerId ? sess.calleeId : sess.callerId;
    try {
      const sockets = await redisService.sMembers(K.userSockets(other));
      for (const sid of sockets || []) io.to(sid).emit('callAnswer', { callId, sdp });
    } catch {}
    return { success: true };
  }

  async callIceCandidate(ctx: WsContext<{ callId: string; candidate: string }>) {
    const { socket, io, services } = ctx;
    const uid = (socket.data as any)?.userId as string | undefined;
    if (!uid) return { success: false, error: "Not authenticated." };
    const { callId, candidate } = (ctx.payload || {}) as any;
    if (!callId || !candidate) return { success: false, error: "Missing fields." };
    const { redisService } = services as any;
    const sess = await jsonGet<CallSession>(redisService, K.callSession(callId));
    if (!sess) return { success: false, error: "Call not found." };
    if (uid !== sess.callerId && uid !== sess.calleeId) return { success: false, error: "Not part of this call." };
    const other = uid === sess.callerId ? sess.calleeId : sess.callerId;
    try {
      const sockets = await redisService.sMembers(K.userSockets(other));
      for (const sid of sockets || []) io.to(sid).emit('callIceCandidate', { callId, candidate });
    } catch {}
    return { success: true };
  }

  async getTurnConfig(ctx: WsContext) {
    const stunRaw = process.env.WEBRTC_STUN || '';
    const turnUrlsRaw = process.env.WEBRTC_TURN_URLS || '';
    const turnUsername = process.env.WEBRTC_TURN_USERNAME || '';
    const turnCredential = process.env.WEBRTC_TURN_CREDENTIAL || '';

    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [];
    // STUN: comma-separated list like "stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478"
    if (stunRaw) {
      const urls = stunRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (urls.length === 1) iceServers.push({ urls: urls[0] });
      else if (urls.length > 1) iceServers.push({ urls });
    }
    // TURN: comma-separated; if username/credential provided, attach them
    if (turnUrlsRaw) {
      const urls = turnUrlsRaw.split(',').map(s => s.trim()).filter(Boolean);
      for (const u of urls) {
        iceServers.push(turnUsername || turnCredential ? { urls: u, username: turnUsername, credential: turnCredential } : { urls: u });
      }
    }
    // Fallback public STUN if none specified (dev only)
    if (iceServers.length === 0) {
      iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
    }
    return { success: true, iceServers };
  }
}
