<template>
  <transition name="fade">
    <div v-if="visible" class="call-overlay">
      <div class="call-stage">
        <SignalHud
          :pc-state="callsStore.pcState"
          :ice-state="callsStore.iceState"
          :status="callsStore.status"
          :type="type"
        />
        <template v-if="showIncomingCard && caller">
          <IncomingCard
            :caller="caller"
            :kind="incomingKindLabel"
            @accept="accept"
            @decline="decline"
          />
        </template>
        <template v-else>
          <!-- In-call view or ringing (outgoing) -->
          <div class="tiles">
            <!-- Left tile: me/local -->
            <div class="tile">
              <div
                class="video-placeholder"
                :class="{ muted: effectiveType === 'voice' }"
              >
                <video
                  v-show="effectiveType === 'video' && hasLocalVideo"
                  ref="localVideo"
                  muted
                  autoplay
                  playsinline
                  class="preview-video"
                ></video>
                <template v-if="!(effectiveType === 'video' && hasLocalVideo)">
                  <div class="avatar-circle">
                    {{ me.initials }}
                  </div>
                  <div class="name">
                    {{ me.name }}
                  </div>
                  <div class="badge" v-if="effectiveType === 'voice'">
                    Audio
                  </div>
                  <div class="badge" v-else>Vidéo</div>
                </template>
              </div>
            </div>
            <!-- Right tile: remote/peer -->
            <div class="tile">
              <div
                class="video-placeholder"
                :class="{ muted: effectiveType === 'voice' }"
              >
                <video
                  v-show="effectiveType === 'video' && hasRemoteVideo"
                  ref="remoteVideo"
                  autoplay
                  playsinline
                  class="preview-video"
                ></video>
                <template v-if="!(effectiveType === 'video' && hasRemoteVideo)">
                  <div class="avatar-circle">
                    {{ peer.initials }}
                  </div>
                  <div class="name">
                    {{ peer.name }}
                  </div>
                  <div class="badge" v-if="effectiveType === 'voice'">
                    Audio
                  </div>
                  <div class="badge" v-else>Vidéo</div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="controls">
        <ControlButton
          :class="{ active: callsStore.micEnabled }"
          :active="callsStore.micEnabled"
          aria-label="Micro"
          :icon-svg="`<svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z' stroke='currentColor' stroke-width='2'/><path d='M19 11a7 7 0 11-14 0' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M12 18v3' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>`"
          @click="toggleMic"
        />
        <ControlButton
          v-if="type === 'video'"
          :class="{ active: callsStore.camEnabled }"
          :active="callsStore.camEnabled"
          aria-label="Caméra"
          :icon-svg="`<svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M3 7.5C3 6.12 4.12 5 5.5 5h7A2.5 2.5 0 0115 7.5v1.8l3.3-2.2a1 1 0 011.7.83v7.14a1 1 0 01-1.7.83L15 13.7v1.8A2.5 2.5 0 0112.5 18h-7A2.5 2.5 0 013 15.5v-8Z' fill='currentColor'/></svg>`"
          @click="toggleCam"
        />
        <ControlButton
          :extra-class="'hangup'"
          aria-label="Raccrocher"
          :icon-svg="`<svg width='22' height='22' viewBox='0 0 24 24' fill='none'><path d='M4 13c2.5-2 5.3-3 8-3s5.5 1 8 3l-2 4c-1.7-1.4-3.7-2.2-6-2.2S7.7 15.6 6 17L4 13z' fill='currentColor'/></svg>`"
          @click="onHangup"
        />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from "vue";
import { useCallsStore } from "@/stores/CallsStore";
import { ensureAudioPermission, ensureVideoPermission } from "@/utils/media";
import ControlButton from "./ControlButton.vue";
import SignalHud from "./SignalHud.vue";
import IncomingCard from "./IncomingCard.vue";

const props = defineProps<{
  visible: boolean;
  participants: Array<{ id?: string; name?: string; avatar?: string }>;
  type: "voice" | "video";
}>();
const emit = defineEmits<{ close: [] }>();

const callsStore = useCallsStore();
// Media element refs
const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);

function toggleMic() {
  try {
    callsStore.setMicEnabled(!callsStore.micEnabled);
    console.log("micEnabled", callsStore.micEnabled);
  } catch {}
}

function toggleCam() {
  try {
    callsStore.setCamEnabled(!callsStore.camEnabled);
    console.log("camEnabled", callsStore.camEnabled);
  } catch {}
}

const normalizedParticipants = computed(() => {
  const list = (props.participants || []).slice(0, 2);
  // Ensure order: caller on the left, 'Moi' on the right when present
  if (list.length === 2) {
    const meIdx = list.findIndex(
      (p) => (p.name || "").trim().toLowerCase() === "moi"
    );
    if (meIdx === 0) {
      list.reverse();
    }
  }
  while (list.length < 2) list.push({ name: "Participant", avatar: "?" });
  return list.map((p) => ({
    name: p.name || "Participant",
    initials: (p.name || "?").trim().slice(0, 2).toUpperCase(),
  }));
});
// Show accept/refuse if we have an incoming call and it's not accepted/ended yet
const showIncomingCard = computed(
  () =>
    !!callsStore.incoming &&
    callsStore.status !== "accepted" &&
    callsStore.status !== "ended"
);
const incomingKindLabel = computed(() => {
  const k =
    callsStore.incoming?.media === "video" ? "Appel vidéo" : "Appel audio";
  return k;
});

const effectiveType = computed(() => {
  return callsStore.status === "ringing" && callsStore.incoming?.media
    ? callsStore.incoming.media
    : props.type;
});
const caller = computed(() => {
  const from = callsStore.incoming?.fromUser as any;
  if (from && (from.name || from.id)) {
    const name = from.name || "Utilisateur";
    return { name, initials: name.trim().slice(0, 2).toUpperCase() };
  }
  // Fallback to first participant provided by parent (Home watcher fills this on incoming)
  const p = (props.participants && props.participants[0]) as any;
  if (p && (p.name || p.id)) {
    const name = p.name || "Utilisateur";
    return { name, initials: name.trim().slice(0, 2).toUpperCase() };
  }
  return null as any;
});
const callee = computed(() => {
  const to = callsStore.incoming?.toUser as any;
  if (to && (to.name || to.id)) {
    const name = to.name || "Utilisateur";
    return { name, initials: name.trim().slice(0, 2).toUpperCase() };
  }
  // Fallback to second participant
  const p = (props.participants && props.participants[1]) as any;
  if (p && (p.name || p.id)) {
    const name = p.name || "Utilisateur";
    return { name, initials: name.trim().slice(0, 2).toUpperCase() };
  }
  return null as any;
});
// Map to UI positions: left is always "me", right is always "peer" on both sides
const me = computed(() => {
  // When this client is the callee (incoming), "me" corresponds to callee
  const m = callsStore.isIncomingCall ? callee.value : caller.value;
  return (
    m || {
      name: normalizedParticipants.value[1].name,
      initials: normalizedParticipants.value[1].initials,
    }
  );
});
const peer = computed(() => {
  // The other party
  const p = callsStore.isIncomingCall ? caller.value : callee.value;
  return (
    p || {
      name: normalizedParticipants.value[0].name,
      initials: normalizedParticipants.value[0].initials,
    }
  );
});

// Helper computeds to decide when to render video vs avatar/name
// Keep logic simple to avoid races: if we have a stream reference, show the <video>.
const hasLocalVideo = computed(() => {
  if (effectiveType.value !== "video") return false;
  return !!callsStore.localStream && !!callsStore.camEnabled;
});

const hasRemoteVideo = computed(() => {
  if (effectiveType.value !== "video") return false;
  return !!callsStore.remoteStream;
});

function onHangup() {
  callsStore.hangup().finally(() => {
    // Ensure UI closes even if network is slow
    emit("close");
  });
}

async function accept() {
  try {
    const media = callsStore.incoming?.media || props.type;
    if (media === "video") {
      await ensureVideoPermission();
      await ensureAudioPermission();
    } else {
      await ensureAudioPermission();
    }
  } catch {}
  callsStore.acceptCall();
}

function decline() {
  callsStore.declineCall("user-declined");
  emit("close");
}

onMounted(async () => {
  // callsStore.setMicEnabled(true);
  // callsStore.setCamEnabled(true);

  await ensureAudioPermission();
  await ensureVideoPermission();
});

// Minimal binding: whenever store streams change, bind them to media elements
watch(
  () => callsStore.localStream,
  async (s) => {
    await nextTick();
    const stream = s as MediaStream | null;
    if (localVideo.value && stream) {
      console.log("Stream local : ", stream);
      try {
        (localVideo.value as any).srcObject = stream;
      } catch {
        console.error("Failed to set local stream");
      }
    }
  },
  { immediate: true }
);
watch(
  () => callsStore.remoteStream,
  async (s) => {
    await nextTick();
    const stream = s as MediaStream | null;
    if (remoteVideo.value && stream) {
      console.log("Stream remote : ", stream);
      try {
        (remoteVideo.value as any).srcObject = stream;
        console.log("Remote video", remoteVideo.value);
      } catch (e) {
        console.error("Failed to set remote stream", e);
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.call-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(
      1200px 600px at 20% -10%,
      rgba(123, 97, 255, 0.18) 0%,
      rgba(123, 97, 255, 0) 50%
    ),
    radial-gradient(
      1600px 700px at 110% -40%,
      rgba(0, 194, 255, 0.18) 0%,
      rgba(0, 194, 255, 0) 55%
    ),
    rgba(17, 24, 39, 0.95);
  display: flex;
  flex-direction: column;
  z-index: 9999;
}

.call-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.tiles {
  width: min(1200px, 100%);
  height: min(70vh, 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 12px;
}

@media (max-width: 768px) {
  .tiles {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.tile {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(93, 140, 255, 0.25);
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.video-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #e5e7eb;
}
.video-placeholder.muted {
  filter: grayscale(0.1);
}

.avatar-circle {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  box-shadow: 0 8px 22px rgba(68, 102, 214, 0.35);
}
.avatar-circle.sm {
  width: 72px;
  height: 72px;
}
.avatar-circle.pulse {
  animation: callerPulse 1.8s ease-in-out infinite;
}
@keyframes callerPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(68, 102, 214, 0.35);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(68, 102, 214, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(68, 102, 214, 0);
  }
}
.name {
  margin-top: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.badge {
  margin-top: 0.35rem;
  font-size: 12px;
  color: #c8d1ff;
  background: rgba(108, 71, 255, 0.22);
  border: 1px solid rgba(108, 71, 255, 0.35);
  padding: 2px 8px;
  border-radius: 999px;
}

/* Incoming card (glass) */
.incoming-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.incoming-title {
  color: #eaf0ff;
  font-weight: 600;
  opacity: 0.95;
}
.incoming-caller {
  display: flex;
  align-items: center;
  gap: 12px;
}
.incoming-caller .who {
  display: flex;
  flex-direction: column;
}
.incoming-caller .who .name {
  margin: 0;
  font-size: 1.05rem;
}
.incoming-caller .who .kind {
  color: #c9d4ff;
  font-size: 0.95rem;
  opacity: 0.9;
}
.incoming-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
  background: rgba(255, 255, 255, 0.1);
}
.action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.action-btn:active {
  transform: scale(0.98);
}
.action-btn svg {
  display: block;
}
.action-btn.accept {
  background: #19c37d;
}
.action-btn.decline {
  background: #ef4444;
}

.controls {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: rgba(17, 24, 39, 0.55);
  border: 1px solid rgba(93, 140, 255, 0.25);
  border-radius: 999px;
  padding: 8px 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.ctrl-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, transform 0.08s, color 0.18s;
}
.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
.ctrl-btn:active {
  transform: scale(0.96);
}
.ctrl-btn.active {
  color: #7fa6ff;
}

.ctrl-btn.hangup {
  background: #ef4444;
  color: white;
  border-color: rgba(0, 0, 0, 0.08);
}
.ctrl-btn.hangup:hover {
  background: #f05252;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Signaling HUD */
.signal-hud {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 10;
}
.sig-badge {
  font-size: 12px;
  color: #dbe2ff;
  background: rgba(108, 71, 255, 0.22);
  border: 1px solid rgba(108, 71, 255, 0.35);
  padding: 2px 8px;
  border-radius: 999px;
}
</style>
