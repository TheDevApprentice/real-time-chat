<template>
  <transition name="fade">
    <div v-if="visible" class="call-overlay">
      <div class="call-stage">
        <template v-if="showIncomingCard && caller">
          <div class="incoming-card">
            <div class="incoming-title">Appel entrant</div>
            <div class="incoming-caller">
              <div class="avatar-circle sm">{{ caller.initials }}</div>
              <div class="who">
                <div class="name">{{ caller.name }}</div>
                <div class="kind">{{ incomingKindLabel }}</div>
              </div>
            </div>
            <div class="incoming-actions">
              <button class="btn accept" @click="accept">Accepter</button>
              <button class="btn decline" @click="decline">Refuser</button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="tiles">
            <div class="tile" v-for="(p, idx) in normalizedParticipants" :key="idx">
              <div class="video-placeholder" :class="{ muted: effectiveType === 'voice' }">
                <div class="avatar-circle">{{ p.initials }}</div>
                <div class="name">{{ p.name }}</div>
                <div class="badge" v-if="effectiveType === 'voice'">Audio</div>
                <div class="badge" v-else>Vidéo</div>
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
import { computed, ref, watch } from 'vue';
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
const callsStore = useCallsStore();

function toggleMic() { micOn.value = !micOn.value; }
function toggleCam() { camOn.value = !camOn.value; }

const normalizedParticipants = computed(() => {
  const list = (props.participants || []).slice(0, 2);
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
