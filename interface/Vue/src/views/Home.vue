<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <div class="w-[100vw] h-[100vh]">
            <div class="z-10 flex">
              <!-- Primary Sidebar -->
              <HomeSideBar
                :rooms="rooms"
                :mockConversations="mockConversations"
                :showInfoModal="showInfoModal"
                :sidebarHovered="sidebarHovered"
                :addFriendModalisOpen="addFriendModalisOpen"
                :createRoomModalisOpen="createRoomModalisOpen"
                :askLogout="askLogout"
                :openAddFriendModal="openAddFriendModal"
                :openInfoModal="openInfoModal"
                :logout="logout"
                :closeInfoModal="closeInfoModal"
                :closeAddFriendModal="closeAddFriendModal"
                :openCreateRoomModal="openCreateRoomModal"
                :closeCreateRoomModal="closeCreateRoomModal"
              />
              <div
                class="w-full min-h-0 min-w-0 h-full grid grid-cols-1 grid-rows-1 gap-2 bg-white/10 rounded-xl shadow-lg animate-fade-in"
              >
                <!-- Zone bouton d'actions et de recherche cette zone se superpose avec le parent : PageTemplate qui laisse en haut à droite des bouton qui permettent de faire la gestion rapide du theme et de la lanque
                 il faut donc que cette zone soit libre -->
                <UpperChatZone
                  :nbOpenChats="nbOpenChats"
                  :searchQuery="searchQuery"
                  :users="users"
                  :filteredUsers="filteredUsers"
                  :updateSearchQuery="updateSearchQuery"
                  :updateNbOpenChats="updateNbOpenChats"
                />
                <ChatZone
                  :mockConversations="mockConversations"
                  :openedChats="openedChats"
                  :nbOpenChats="nbOpenChats"
                />
              </div>
            </div>
          </div>
        </template>
      </PageTemplate>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../components/LoadingOverlay.vue";
import { ref, defineAsyncComponent, computed } from "vue";
import type { Bubble } from "../components/chat/bubbleChat/ChatBubble.vue";
import { useAuthStore } from "../stores/AuthStore";
import type { Conversation } from "../components/SideBarConversations.vue";
import type { Room } from "../components/HomeSideBar.vue";

const HomeSideBar = defineAsyncComponent(
  () => import("../components/HomeSideBar.vue")
);
const ChatZone = defineAsyncComponent(
  () => import("../components/ChatZone.vue")
);
const PageTemplate = defineAsyncComponent(
  () => import("../components/PageTemplate.vue")
);
const UpperChatZone = defineAsyncComponent(
  () => import("../components/UpperChatZone.vue")
);

const sidebarHovered = ref(false);
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

const addFriendModalisOpen = ref(false);
const createRoomModalisOpen = ref(false);
const authStore = useAuthStore();
const showInfoModal = ref(false);
const messages: Bubble[] = [
  {
    text: "Hello ! 😀",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "How are you ?",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Fine thx ! 😁",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Where do you want to go this we ? 😄",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "I want to go to the beach ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Yes let's go  ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
    isTyping: false,
    isWriting: false,
    isSent: false,
    isRead: false,
  },
];

// Simulation de rooms pour la sidebar (à remplacer par tes vraies données)
const rooms: Room[] = [
  { id: 1, name: "Famille", avatar: "👪", active: false },
  { id: 2, name: "Mes Canards", avatar: "🦆", active: false },
];

// MOCK pour la démo : à remplacer par ta logique d'ouverture réelle
const nbOpenChats = ref<number>(4); // Change ce nombre pour tester 1, 2, 3 ou 4 chats
const openedChats = computed(() =>
  [
    { id: 1, name: "Hugo", avatar: "🤖", messages: messages },
    { id: 2, name: "Mélanie", avatar: "🤖", messages: messages },
    { id: 3, name: "Alpha", avatar: "🤖", messages: messages },
    { id: 4, name: "Lidya", avatar: "🧛", messages: messages },
  ].slice(0, nbOpenChats.value)
); // Simule l'ouverture de 1 à 4 chats

const mockConversations: Conversation[] = [
  {
    id: 1,
    participants: [{ name: "Bot Lidya", avatar: "🧛" }],
    title: "Bot Lidya",
    lastMessage: {
      text: "Hello ! 😀",
      author: "Bot Lidya",
      date: new Date().toISOString(),
      isMine: false,
      unread: true,
    },
    active: false,
  },
  {
    id: 2,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    title: "Bot Mélanie",
    lastMessage: {
      text: "À tout de suite !",
      author: "Moi",
      date: new Date(Date.now() - 3600 * 1000).toISOString(),
      isMine: true,
      unread: false,
    },
    active: false,
  },
  // Ajoute d'autres mocks si besoin
];

function updateNbOpenChats(value: number) {
  nbOpenChats.value = value;
}
function askLogout() {
  openInfoModal();
}

function openInfoModal() {
  showInfoModal.value = true;
}

function logout() {
  authStore.logout();
  closeInfoModal();
}

function closeInfoModal() {
  showInfoModal.value = false;
}

function openAddFriendModal() {
  addFriendModalisOpen.value = true;
}

function closeAddFriendModal() {
  addFriendModalisOpen.value = false;
}

function openCreateRoomModal() {
  createRoomModalisOpen.value = true;
}

function closeCreateRoomModal() {
  createRoomModalisOpen.value = false;
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
