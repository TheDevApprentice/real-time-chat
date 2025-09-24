<template>
  <transition name="fade">
    <div v-if="visible" class="call-overlay">
      <div class="call-stage">
        <template v-if="showIncomingCard && caller">
          <div class="incoming-card">
            <div class="incoming-title">Appel entrant</div>
            <div class="incoming-caller">
              <div class="avatar-circle sm pulse">{{ caller.initials }}</div>
              <div class="who">
                <div class="name">{{ caller.name }}</div>
                <div class="kind">{{ incomingKindLabel }}</div>
              </div>
            </div>
            <div class="incoming-actions">
              <button class="action-btn accept" @click="accept">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Phone/answer icon -->
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.57 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.09a2 2 0 0 1 2.11-.45c.85.26 1.73.45 2.63.57A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>Accepter</span>
              </button>
              <button class="action-btn decline" @click="decline">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Hangup icon (curved handset) -->
                  <path d="M4 13c2.5-2 5.3-3 8-3s5.5 1 8 3l-2 4c-1.7-1.4-3.7-2.2-6-2.2S7.7 15.6 6 17L4 13z"/>
                </svg>
                <span>Refuser</span>
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- In-call view or ringing (outgoing) -->
          <div class="tiles">
            <!-- Left tile: caller/remote -->
            <div class="tile">
              <div class="video-placeholder" :class="{ muted: effectiveType === 'voice' }">
                <template v-if="callsStore.status === 'accepted' && effectiveType === 'video' && remoteReady">
                  <video ref="remoteVideo" autoplay playsinline class="preview-video"></video>
                  <div class="qual-badges">
                    <span class="q-badge">{{ qualityText }}</span>
                    <span class="q-badge subtle">RTT {{ callsStore.quality.rttMs }} ms</span>
                    <span class="q-badge subtle">Perte {{ callsStore.quality.packetsLostPct }}%</span>
                  </div>
                </template>
                <template v-else>
                  <div class="avatar-circle">{{ normalizedParticipants[0].initials }}</div>
                  <div class="name">{{ normalizedParticipants[0].name }}</div>
                  <div class="badge" v-if="effectiveType === 'voice'">Audio</div>
                  <div class="badge" v-else>Vidéo</div>
                </template>
              </div>
            </div>
            <!-- Right tile: me/local -->
            <div class="tile">
              <div class="video-placeholder" :class="{ muted: effectiveType === 'voice' }">
                <template v-if="callsStore.status === 'accepted' && effectiveType === 'video' && localReady">
                  <video ref="localVideo" autoplay playsinline muted class="preview-video"></video>
                </template>
                <template v-else-if="effectiveType === 'video' && previewReady">
                  <video ref="previewVideo" autoplay playsinline muted class="preview-video"></video>
                  <div class="badge">Prévisualisation</div>
                </template>
                <template v-else>
                  <div class="avatar-circle">{{ normalizedParticipants[1].initials }}</div>
                  <div class="name">{{ normalizedParticipants[1].name }}</div>
                  <div class="badge" v-if="effectiveType === 'voice'">Audio</div>
                  <div class="badge" v-else>Vidéo</div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="controls">
        <button class="ctrl-btn" :class="{ active: micOn }" @click="toggleMic" aria-label="Micro">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" stroke="currentColor" stroke-width="2"/>
            <path d="M19 11a7 7 0 11-14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="ctrl-btn" :class="{ active: camOn }" @click="toggleCam" aria-label="Caméra" v-if="type==='video'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 7.5C3 6.12 4.12 5 5.5 5h7A2.5 2.5 0 0115 7.5v1.8l3.3-2.2a1 1 0 011.7.83v7.14a1 1 0 01-1.7.83L15 13.7v1.8A2.5 2.5 0 0112.5 18h-7A2.5 2.5 0 013 15.5v-8Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctrl-btn hangup" @click="onHangup" aria-label="Raccrocher">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 13c2.5-2 5.3-3 8-3s5.5 1 8 3l-2 4c-1.7-1.4-3.7-2.2-6-2.2S7.7 15.6 6 17L4 13z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useCallsStore } from '@/stores/CallsStore';
import { ensureAudioPermission, ensureVideoPermission } from '@/utils/media';

const props = defineProps<{ 
  visible: boolean; 
  participants: Array<{ id?: string; name?: string; avatar?: string }>; 
  type: 'voice' | 'video';
}>();
const emit = defineEmits<{ close: [] }>();

const micOn = ref(true);
const camOn = ref(true);
const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const localReady = ref(false);
const remoteReady = ref(false);
const callsStore = useCallsStore();

function toggleMic() {
  micOn.value = !micOn.value;
  try { callsStore.setMicEnabled(micOn.value); } catch {}
}
function toggleCam() {
  camOn.value = !camOn.value;
  try { callsStore.setCamEnabled(camOn.value); } catch {}
}

const normalizedParticipants = computed(() => {
  const list = (props.participants || []).slice(0, 2);
  // Ensure order: caller on the left, 'Moi' on the right when present
  if (list.length === 2) {
    const meIdx = list.findIndex(p => (p.name || '').trim().toLowerCase() === 'moi');
    if (meIdx === 0) {
      list.reverse();
    }
  }
  while (list.length < 2) list.push({ name: 'Participant', avatar: '?' });
  return list.map(p => ({
    name: p.name || 'Participant',
    initials: (p.name || '?').trim().slice(0, 2).toUpperCase(),
  }));
});
// Show accept/refuse if we have an incoming call and it's not accepted/ended yet
const showIncomingCard = computed(() => !!callsStore.incoming && callsStore.status !== 'accepted' && callsStore.status !== 'ended');
const incomingKindLabel = computed(() => {
  const k = callsStore.incoming?.media === 'video' ? 'Appel vidéo' : 'Appel audio';
  return k;
});
const effectiveType = computed(() => {
  return (callsStore.status === 'ringing' && callsStore.incoming?.media)
    ? callsStore.incoming.media
    : props.type;
});
const caller = computed(() => {
  const from = callsStore.incoming?.fromUser as any;
  if (from && (from.name || from.id)) {
    const name = from.name || 'Utilisateur';
    return { name, initials: name.trim().slice(0,2).toUpperCase() };
  }
  // Fallback to first participant provided by parent (Home watcher fills this on incoming)
  const p = (props.participants && props.participants[0]) as any;
  if (p && (p.name || p.id)) {
    const name = p.name || 'Utilisateur';
    return { name, initials: name.trim().slice(0,2).toUpperCase() };
  }
  return null as any;
});
// Close overlay when call ends
watch(callsStore.$state, () => {
  const s = callsStore.status;
  if (s === 'ended') {
    // Emit close so parent hides overlay
    emit('close');
  }
});

// Keep UI toggle in sync with store when streams come in
watch(() => callsStore.micEnabled, (v) => { micOn.value = !!v; });
watch(() => callsStore.camEnabled, (v) => { camOn.value = !!v; });

// Attach streams to video elements when available
watch(() => callsStore.localStream, async (s) => {
  await nextTick();
  const stream = s as any as MediaStream | null;
  if (localVideo.value && stream) {
    (localVideo.value as any).srcObject = stream;
    localReady.value = true;
    try { await (localVideo.value as HTMLVideoElement).play(); } catch {}
  } else {
    localReady.value = false;
  }
});
watch(() => callsStore.remoteStream, async (s) => {
  await nextTick();
  const stream = s as any as MediaStream | null;
  if (remoteVideo.value && stream) {
    (remoteVideo.value as any).srcObject = stream;
    remoteReady.value = true;
    try { await (remoteVideo.value as HTMLVideoElement).play(); } catch {}
  } else {
    remoteReady.value = false;
  }
});

const qualityText = computed(() => {
  const kbps = callsStore.quality?.bitrateKbps ?? 0;
  if (kbps > 1500) return `Qualité: Haute (${kbps} kbps)`;
  if (kbps > 600) return `Qualité: Moyenne (${kbps} kbps)`;
  return `Qualité: Basse (${kbps} kbps)`;
});

function onHangup() {
  callsStore.hangup().finally(() => {
    // Ensure UI closes even if network is slow
    emit('close');
  });
}

async function accept() {
  try {
    const media = callsStore.incoming?.media || props.type;
    if (media === 'video') {
      await ensureVideoPermission();
    } else {
      await ensureAudioPermission();
    }
  } catch {}
  callsStore.acceptCall();
}
function decline() {
  callsStore.declineCall('user-declined');
  emit('close');
}

// -------- Local preview for outgoing video (ringing without incoming) --------
const previewVideo = ref<HTMLVideoElement | null>(null);
const previewStream = ref<MediaStream | null>(null);
const previewReady = ref(false);

async function startPreviewIfNeeded() {
  const isOutgoingRinging = callsStore.status === 'ringing' && !callsStore.incoming;
  if (!isOutgoingRinging) return stopPreview();
  if (props.type !== 'video') return stopPreview();
  if (previewStream.value) return; // already started
  try {
    await ensureVideoPermission();
    if (navigator?.mediaDevices?.getUserMedia) {
      previewStream.value = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      await nextTick();
      if (previewVideo.value && previewStream.value) {
        (previewVideo.value as any).srcObject = previewStream.value;
        previewReady.value = true;
      }
    }
  } catch {
    // ignore preview failure
  }
}

function stopPreview() {
  previewReady.value = false;
  if (previewStream.value) {
    try { previewStream.value.getTracks().forEach(t => t.stop()); } catch {}
  }
  previewStream.value = null;
}

watch(() => callsStore.status, () => startPreviewIfNeeded());
watch(() => props.type, () => startPreviewIfNeeded());
onMounted(() => startPreviewIfNeeded());
onBeforeUnmount(() => stopPreview());

</script>

<style scoped>
.call-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(1200px 600px at 20% -10%, rgba(123, 97, 255, 0.18) 0%, rgba(123, 97, 255, 0) 50%),
              radial-gradient(1600px 700px at 110% -40%, rgba(0, 194, 255, 0.18) 0%, rgba(0, 194, 255, 0) 55%),
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
  .tiles { grid-template-columns: 1fr; height: auto; }
}

.tile {
  position: relative;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(93, 140, 255, 0.25);
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.25);
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
.video-placeholder.muted { filter: grayscale(0.1); }

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
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  box-shadow: 0 8px 22px rgba(68, 102, 214, 0.35);
}
.avatar-circle.sm { width: 72px; height: 72px; }
.avatar-circle.pulse { animation: callerPulse 1.8s ease-in-out infinite; }
@keyframes callerPulse {
  0% { box-shadow: 0 0 0 0 rgba(68, 102, 214, 0.35); }
  70% { box-shadow: 0 0 0 18px rgba(68, 102, 214, 0); }
  100% { box-shadow: 0 0 0 0 rgba(68, 102, 214, 0); }
}
.name { margin-top: 0.7rem; font-weight: 600; letter-spacing: .02em; }
.badge {
  margin-top: .35rem;
  font-size: 12px;
  color: #c8d1ff;
  background: rgba(108,71,255,0.22);
  border: 1px solid rgba(108,71,255,0.35);
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
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
.incoming-title { color: #eaf0ff; font-weight: 600; opacity: 0.95; }
.incoming-caller { display: flex; align-items: center; gap: 12px; }
.incoming-caller .who { display: flex; flex-direction: column; }
.incoming-caller .who .name { margin: 0; font-size: 1.05rem; }
.incoming-caller .who .kind { color: #c9d4ff; font-size: 0.95rem; opacity: .9; }
.incoming-actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.2);
  transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
  background: rgba(255,255,255,0.1);
}
.action-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
.action-btn:active { transform: scale(0.98); }
.action-btn svg { display: block; }
.action-btn.accept { background: #19c37d; }
.action-btn.decline { background: #ef4444; }

.controls {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: rgba(17, 24, 39, 0.55);
  border: 1px solid rgba(93,140,255,0.25);
  border-radius: 999px;
  padding: 8px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.ctrl-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .18s, transform .08s, color .18s;
}
.ctrl-btn:hover { background: rgba(255,255,255,0.16); }
.ctrl-btn:active { transform: scale(0.96); }
.ctrl-btn.active { color: #7fa6ff; }

.ctrl-btn.hangup { background: #ef4444; color: white; border-color: rgba(0,0,0,0.08); }
.ctrl-btn.hangup:hover { background: #f05252; }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
