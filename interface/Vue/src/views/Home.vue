<template>
  <HomeLayout
    ref="HomeLayoutChild"
    :sidebarExpended="sidebarExpended"
    @updateSideBarExpended="updateSideBarExpended"
  >
    <template #sidebar>
      <HomeSideBar
        :rooms="rooms"
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
import { ref, defineAsyncComponent, computed } from "vue";
import type { Conversation } from "@components/home/chatZone/SideBarConversations.vue";
import type { Room } from "@components/home/layout/HomeSideBar.vue";
import type { Bubble } from "@components/home/chat/view/ChatBubble.vue";
import HomeLayout from "@components/layouts/home/HomeLayout.vue";

const HomeSideBar = defineAsyncComponent(
  () => import("../components/home/layout/HomeSideBar.vue")
);
const ChatZone = defineAsyncComponent(
  () => import("../components/home/layout/HomeChatZone.vue")
);
const UpperChatZone = defineAsyncComponent(
  () => import("../components/home/layout/HomeUpperChatZone.vue")
);

const sidebarHovered = ref(false);
const sidebarExpended = ref(true);
const searchQuery = ref("");
const users = [
  { name: "Bot Hugo", avatar: "🤖" },
  { name: "Bot Lidya", avatar: "🧛" },
  { name: "Bot Christine", avatar: "🤡" },
];

const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  return users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function updateSearchQuery(searchQueryChanged: string) {
  console.log("Login Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}

const mockMessages: Bubble[] = [
  {
    text: "Hello ! 😀",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "How are you ?",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Fine thx ! 😁",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Where do you want to go this we ? 😄",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "I want to go to the beach ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Yes let's go  ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Ciao !",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: true,
  },
  {
    text: "Ciao !",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: true,
    isRead: false,
  },
];

// Simulation de rooms pour la sidebar (à remplacer par tes vraies données)
const rooms: Room[] = [
  { id: 1, name: "Famille", avatar: "👪", active: false },
  { id: 2, name: "Mes Canards", avatar: "🦆", active: false },
];

const mockConversations: Conversation[] = [
  {
    id: 1,
    participants: [{ name: "Bot Lidya", avatar: "🧛", isOnline: true }],
    avatar: "👪",
    name: "Famille",
    type: "room",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  {
    id: 2,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🦆",
    name: "Mes Canards",
    type: "room",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 3,
    participants: [{ name: "Bot Lidya", avatar: "🧛", isOnline: true }],
    avatar: "🧛",
    name: "Bot Lidya",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  {
    id: 4,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 5,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 6,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 7,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 8,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 9,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  {
    id: 10,
    participants: [{ name: "Mélanie", avatar: "🤖", isOnline: false }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  // Ajoute d'autres mocks si besoin
];

const HomeLayoutChild = ref();
function askLogout() {
  HomeLayoutChild.value.askLogout();
}

function openAddFriendModal() {
  HomeLayoutChild.value.openAddFriendModal();
}

function openCreateRoomModal() {
  HomeLayoutChild.value.openCreateRoomModal();
}

function updateSideBarHover(value: boolean) {
  setTimeout(() => {
    sidebarHovered.value = value;
  }, 150);
}

function updateSideBarExpended(value: boolean) {
  setTimeout(() => {
    sidebarExpended.value = value;
  }, 150);
}
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
