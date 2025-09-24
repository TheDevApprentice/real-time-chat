<template>
  <HomeLayout
    ref="HomeLayoutChild"
    :sidebarExpended="sidebarExpended"
    @updateSideBarExpended="updateSideBarExpended"
    @logout="logout"
  >
    <template #sidebar>
      <HomeSideBar
        :sidebarHovered="sidebarHovered"
        @askLogout="askLogout"
        @openAddFriendModal="openAddFriendModal"
        @openCreateRoomModal="openCreateRoomModal"
        @updateSideBarHover="updateSideBarHover"
      />
    </template>

    <template #upper-chat>
      <UpperChatZone
        :sidebarHovered="sidebarHovered"
        @add-friend="openAddFriendModal"
        @create-room="openCreateRoomModal"
        @click-call="clickVoiceCall"
        @click-video-call="clickVideoCall"
      />
    </template>

    <template #chat>
      <ChatZone
        :sidebarExpended="sidebarExpended"
        @updateSideBarExpended="updateSideBarExpended"
        @click-call="clickVoiceCall"
        @click-video-call="clickVideoCall"
      />
    </template>
  </HomeLayout>
  <!-- Fullscreen Call Overlay -->
  <CallOverlay
    :visible="callVisible"
    :participants="callParticipants"
    :type="callType"
    @close="callVisible = false"
  />
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, onBeforeUnmount, watch } from "vue";
import { ensureAudioPermission, ensureVideoPermission } from '@/utils/media';
import { useAuthStore } from "@/stores/AuthStore";
import { useCallsStore } from "@/stores/CallsStore";
import type { Conversation } from "@/components/home/chatZone/SideBarConversations.vue";

const HomeLayout = defineAsyncComponent({
  loader: () => import("@components/layouts/home/HomeLayout.vue"),
  delay: 200,
  timeout: 20000,
  suspensible: true,
});
const HomeSideBar = defineAsyncComponent({
  loader: () => import("@components/home/layout/HomeSideBar.vue"),
  delay: 200,
  timeout: 20000,
  suspensible: true,
});
const ChatZone = defineAsyncComponent({
  loader: () => import("@components/home/layout/HomeChatZone.vue"),
  delay: 200,
  timeout: 20000,
  suspensible: true,
});
const UpperChatZone = defineAsyncComponent({
  loader: () => import("@components/home/layout/HomeUpperChatZone.vue"),
  delay: 200,
  timeout: 20000,
  suspensible: true,
});
const CallOverlay = defineAsyncComponent({
  loader: () => import("@/components/home/calls/CallOverlay.vue"),
  delay: 0,
  timeout: 20000,
  suspensible: true,
});

const authStore = useAuthStore();
const callsStore = useCallsStore();
const HomeLayoutChild = ref();
const sidebarHovered = ref(false);
const sidebarExpended = ref(true);
// Call overlay state
const callVisible = ref(false);
const callType = ref<'voice' | 'video'>('voice');
const callParticipants = ref<Array<{ id?: string; name?: string; avatar?: string }>>([]);

function askLogout() {
  HomeLayoutChild.value.askLogout();
}
function openAddFriendModal() {
  HomeLayoutChild.value.openAddFriendModal();
}

function openCreateRoomModal() {
  HomeLayoutChild.value.openCreateRoomModal();
}

async function logout() {
  await authStore.logout();
}

function updateSideBarHover(value: boolean) {
  if (hoverTimeoutId) clearTimeout(hoverTimeoutId);
  hoverTimeoutId = window.setTimeout(() => {
    sidebarHovered.value = value;
  }, 150);
}

function updateSideBarExpended(value: boolean) {
  if (expendedTimeoutId) clearTimeout(expendedTimeoutId);
  expendedTimeoutId = window.setTimeout(() => {
    sidebarExpended.value = value;
  }, 150);
}

async function clickVoiceCall(chat: Conversation) {
  callType.value = 'voice';
  callParticipants.value = (chat?.participants || []).map(p => ({ name: p.name, avatar: p.avatar, id: (p as any).id }));
  // Private DM: call the other participant directly via CallsStore
  if (chat.type === 'user') {
    const me = authStore.userId;
    const target = (chat.participants || []).find(p => (p as any).id && (p as any).id !== me) as any;
    console.log("Voice call id me ", me);
    console.log("Voice call target ", target);
    if (target?.id) {
      const ok = await ensureAudioPermission();
      if (!ok) console.warn('Microphone permission not granted');
      try { await callsStore.requestCall(String(target.id), 'audio'); } catch {}
    }
  } else {
    // Public/group room: just open overlay for now (users can join existing call if any)
    // TODO: implement group call create/join flow in CallsStore when backend is ready.
  }
  callVisible.value = true;
}

async function clickVideoCall(chat: Conversation) {
  callType.value = 'video';
  callParticipants.value = (chat?.participants || []).map(p => ({ name: p.name, avatar: p.avatar, id: (p as any).id }));
  if (chat.type === 'user') {
    const me = authStore.userId;
    const target = (chat.participants || []).find(p => (p as any).id && (p as any).id !== me) as any;
    console.log("Video call id me ", me);
    console.log("Video call target ", target);
    if (target?.id) {
      const ok = await ensureVideoPermission();
      if (!ok) console.warn('Camera/Microphone permission not granted');
      try { await callsStore.requestCall(String(target.id), 'video'); } catch {}
    }
  } else {
    // Public/group room: show overlay; future: group call start/join
  }
  callVisible.value = true;
}

// Auto open overlay on incoming calls and close on end
watch(() => callsStore.incoming, (inc) => {
  if (inc) {
    callType.value = inc.media === 'video' ? 'video' : 'voice';
    const caller = inc.fromUser || { name: 'Utilisateur', avatar: '?' } as any;
    const meLabel = (authStore as any)?.user?.name || 'Moi';
    callParticipants.value = [
      { name: caller.name || 'Utilisateur', avatar: caller.avatar || '?' },
      { name: meLabel, avatar: (meLabel || '?').toString().trim().charAt(0).toUpperCase() },
    ];
    callVisible.value = true;
  }
});
watch(() => callsStore.status, (s) => {
  if (s === 'ended') callVisible.value = false;
});

// Track pending timeouts to avoid updates after unmount
let hoverTimeoutId: number | undefined;
let expendedTimeoutId: number | undefined;

// Cleanup on component destroy
onBeforeUnmount(() => {
  if (hoverTimeoutId) clearTimeout(hoverTimeoutId);
  if (expendedTimeoutId) clearTimeout(expendedTimeoutId);
});
</script>

<style scoped>
.scroll-bar {
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.scroll-bar::-webkit-scrollbar {
  display: none;
}

.sidebar-glass {
  /* background: rgba(30, 34, 44, 0.72); */
  background: var(--background);
  backdrop-filter: blur(14px);
  border-right: 1.5px solid rgba(120, 120, 160, 0.12);
}
.sidebar-divider {
  height: 1.5px;
  background: #fff;
  opacity: 0.08;
  border-radius: 2px;
}
.sidebar-title {
  color: var(--color-text);
  letter-spacing: 0.02em;
}
.sidebar-section {
  margin-left: 0.7rem;
  color: var(--color-text);
  font-weight: 600;
  font-size: 1rem;
}
.sidebar-btn-add {
  background: #6c47ff;
  color: #fff;
  border-radius: 50%;
  width: 2.2rem;
  height: 2.2rem;
  font-size: 1.3rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background 0.2s, box-shadow 0.2s;
}
.sidebar-btn-add:hover {
  background: #825fff;
  box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  animation: pulse-btn 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-btn {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  }
  50% {
    transform: scale(1.11);
    box-shadow: 0 0px 24px 4px rgba(108, 71, 255, 0.17);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  }
}

.sidebar-room {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--color-text);
}
.sidebar-room:hover,
.sidebar-room-active {
  background: rgba(108, 71, 255, 0.11);
  color: var(--color-text);
}
.sidebar-room-label {
  font-weight: 500;
  color: var(--color-text);

  transition: color 0.2s;
}
.sidebar-btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text);

  border-radius: 8px;
  width: 100%;
  padding: 0.5rem;
  box-shadow: 0 0px 6px 0px rgba(81, 146, 211, 0.57);
  transition: background 0.2s, box-shadow 0.2s, color 0.2s;
  font-size: 1.3rem;
}
.sidebar-btn-action:hover {
  background: rgba(108, 71, 255, 0.13);
  box-shadow: 0 0px 10px 0px rgba(81, 146, 211, 0.686);
  color: #fff;
}

.sidebar-btn-logout {
  color: #ef4444;
}
.sidebar-btn-logout:hover {
  background: rgba(239, 68, 68, 0.13);
  color: #fff;
}
.search-bar {
  display: flex;
  justify-self: center;
  align-self: center;
  gap: 0.7rem;
  z-index: 30;
  position: absolute;
  padding: 1.3rem 2.2rem 0.5rem 0;
  top: -0.3rem;
  transform: translateX(2%);
}
</style>
