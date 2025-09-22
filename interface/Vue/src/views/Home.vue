<template>
  <HomeLayout
    ref="HomeLayoutChild"
    :sidebarExpended="sidebarExpended"
    @updateSideBarExpended="updateSideBarExpended"
    @logout="logout"
  >
    <template #sidebar>
      <HomeSideBar
        :mockConversations="mockConversations"
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
        :searchQuery="searchQuery"
        :users="users"
        :filteredUsers="filteredUsers"
        @updateSearchQuery="updateSearchQuery"
        @add-friend="openAddFriendModal"
        @create-room="openCreateRoomModal"
      />
    </template>

    <template #chat>
      <ChatZone
        :conversations="mockConversations"
        :sidebarExpended="sidebarExpended"
        @updateSideBarExpended="updateSideBarExpended"
      />
    </template>
  </HomeLayout>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onBeforeUnmount, onMounted, watch } from "vue";
import type { Conversation } from "@components/home/chatZone/SideBarConversations.vue";
import type { Bubble } from "@components/home/chat/view/ChatBubble.vue";
import { useAuthStore } from "@/stores/AuthStore";
import { useRoomsStore } from "@/stores/RoomsStore";
import { useMessagesStore } from "@/stores/MessagesStore";
import { useUserStore } from "@/stores/UserStore";
import { useFriendsStore } from "@/stores/FriendsStore";

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

const authStore = useAuthStore();
const roomsStore = useRoomsStore();
const messagesStore = useMessagesStore();
const userStore = useUserStore();
const friendsStore = useFriendsStore();
const HomeLayoutChild = ref();
const sidebarHovered = ref(false);
const sidebarExpended = ref(true);
const searchQuery = ref("");
// Users for the search bar (mapped from REST /chat/users/search)
const users = ref<Array<{ id: string; name: string; avatar: string; isOnline: boolean; pendingInvitation: boolean; isFriend: boolean; incoming: boolean; outgoing: boolean; }>>([]);

const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  const userId = authStore.userId;
  if (!userId) return [];
  return users.value.filter((u) => u.id !== userId);  
});

function updateSearchQuery(searchQueryChanged: string) {
  console.log("Home Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}

// Map store Rooms/Messages to the Conversation/Bubble shapes expected by child components
const mockConversations = computed<Conversation[]>(() => {
  const rooms = roomsStore.rooms || [];
  const myId = authStore.userId;
  return rooms.map((r) => {
    // Compute display label and avatar
    let label = r.name || (r.type === 'user' ? 'DM' : 'Room');
    let avatar = (label || '?').trim().charAt(0).toUpperCase();
    if (r.type === 'user') {
      const meId = myId || undefined;
      const members: Array<{ id: string; name: string }> = Array.isArray((r as any).users) ? (r as any).users : [];
      const other = members.find((u) => !meId || u.id !== meId) || members[0];
      if (other?.name) {
        label = other.name;
        avatar = (other.name || '?').trim().charAt(0).toUpperCase();
      }
    }
    // Map messages for this room
    const rs = messagesStore.byRoom[r.id] || { items: [] } as any;
    const bubbles: Bubble[] = (rs.items as any[]).map((m) => {
      const authorId = (m?.author?.id as string | undefined) || undefined;
      const speaker = myId && authorId && myId === authorId ? 0 : 1;
      const date = typeof m?.timestamp === 'number' ? new Date(m.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
      // We do not track isTyping/isWriting in message entries; typing is separate in RoomsStore
      return {
        text: String(m?.content || ''),
        speaker,
        date,
        isTyping: false,
        isWriting: false,
        isSent: true,
        isRead: !!m?.edited ? true : true,
      } as Bubble;
    });
    return {
      id: (r as any).id,
      participants: Array.isArray((r as any).users) ? (r as any).users.map((u: any) => ({ name: u?.name || 'User', avatar: (u?.name || '?')[0] || '?' , isOnline: false })) : [],
      avatar,
      name: label,
      type: (r as any).type === 'user' ? 'user' : 'room',
      messages: bubbles,
      active: messagesStore.getActiveRoomId() === r.id,
      mostRecent: true,
    } as Conversation;
  });
});

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

// Track pending timeouts to avoid updates after unmount
let hoverTimeoutId: number | undefined;
let expendedTimeoutId: number | undefined;

// Cleanup on component destroy
onBeforeUnmount(() => {
  if (hoverTimeoutId) clearTimeout(hoverTimeoutId);
  if (expendedTimeoutId) clearTimeout(expendedTimeoutId);
});

// === Lifecycle wiring ===
onMounted(async () => {
  try { await roomsStore.getRooms(); } catch {}
  // Auto-select the first room if none active
  const first = (roomsStore.rooms || [])[0];
  if (first) {
    try { await roomsStore.joinRoom(first.id); } catch {}
    messagesStore.setActiveRoom(first.id);
    try { await messagesStore.loadRoomHistory(first.id, 0, 50); } catch {}
  }
});

// Search bar: call REST search and merge with FriendsStore to expose presence and relation flags
watch(searchQuery, async (q) => {
  const s = String(q || '').trim();
  if (!s) { users.value = []; return; }
  const list = await userStore.searchUsers(s, 20);
  // Build quick lookup sets from FriendsStore
  const acceptedSet = new Set((friendsStore.friends || []).map(i => i.userId));
  const pendingInSet = new Set((friendsStore.pendingIncoming || []).map(i => i.userId));
  const pendingOutSet = new Set((friendsStore.pendingOutgoing || []).map(i => i.userId));

  users.value = list.map(u => {
    const id = u.id;
    const name = u.name;
    const avatar = (name || '?').trim().charAt(0).toUpperCase() || '?';
    const isFriend = acceptedSet.has(id);
    const outgoing = pendingOutSet.has(id);
    const incoming = pendingInSet.has(id);
    const pendingInvitation = outgoing || incoming;
    const isOnline = friendsStore.presence?.[id]?.status === 'online';
    // Opportunistically fetch presence for accepted friends that are missing
    if (isFriend && !friendsStore.presence?.[id]) {
      friendsStore.ensurePresence(id).catch(() => undefined);
    }
    return { id, name, avatar, isOnline, pendingInvitation, isFriend, incoming, outgoing };
  });
  console.log("users", users.value);
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
