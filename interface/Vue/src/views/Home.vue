<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <!-- Ici on va faire le header spécialement pour la vue mobile qui doit afficher à gauche l'avatar de l'user avec le nom et à droite le bouton pour changer le theme -->

          <div class="w-full h-full">
            <div class="min-w-0 w-full h-full flex transition-all">
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
                :updateSideBarHover="updateSideBarHover"
              />
              <div
                class="min-h-0 min-w-0 w-full h-full flex gap-1 bg-white/10 rounded-xl shadow-lg animate-fade-in"
              >
                <!-- Zone bouton d'actions et de recherche cette zone se superpose avec le parent : PageTemplate qui laisse en haut à droite des bouton qui permettent de faire la gestion rapide du theme et de la lanque
                 il faut donc que cette zone soit libre -->
                <UpperChatZone
                  :sidebarHovered="sidebarHovered"
                  :searchQuery="searchQuery"
                  :users="users"
                  :filteredUsers="filteredUsers"
                  :updateSearchQuery="updateSearchQuery"
                  @add-friend="openAddFriendModal"
                  @create-room="openCreateRoomModal"
                />
                <ChatZone
                  :conversations="mockConversations"
                  :openConversations="openConversations"
                />
              </div>
            </div>
          </div>

          <!-- Barre mobile pour actions principales (visible uniquement sur mobile) -->
          <div
            class="absolute bottom-0 left-0 right-0 w-full flex justify-around items-center z-40 py-2 px-3 bg-[var(--background)]/80 backdrop-blur-md border-t border-[var(--color-text)]/10  transition-all"
            style="box-shadow: 0 -2px 12px 0 rgba(0, 0, 0, 0.09)"
          >
            <!-- Conversations (sidebar) -->
            <button
              class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
              @click="sidebarHovered = !sidebarHovered"
              title="Conversations"
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="2.5"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="2.5"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="3"
                  y="16"
                  width="18"
                  height="2.5"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
              <span class="text-xs mt-0.5">Convs</span>
            </button>
            <!-- Ajouter un ami -->
            <button
              class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
              @click="openAddFriendModal()"
              title="Ajouter un ami"
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M12 8v8M8 12h8"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span class="text-xs mt-0.5">Ami</span>
            </button>
            <!-- Créer une room -->
            <button
              class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
              @click="openCreateRoomModal()"
              title="Créer une room"
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <rect
                  x="5"
                  y="8"
                  width="14"
                  height="8"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M12 12v3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span class="text-xs mt-0.5">Room</span>
            </button>
            <!-- Paramètres -->
            <button
              class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
              @click="openInfoModal()"
              title="Paramètres"
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span class="text-xs mt-0.5">Param</span>
            </button>
            <!-- Déconnexion -->
            <button
              class="flex flex-col items-center text-red-500 focus:outline-none"
              @click="askLogout()"
              title="Déconnexion"
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <path
                  d="M15 12H3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M19 7v10M19 12l-4-4m4 4l-4 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span class="text-xs mt-0.5">Quitter</span>
            </button>
          </div>
          <!-- Fin barre mobile -->
          <InfoModal
            v-if="showInfoModal"
            headerTitle="Déconnexion"
            message="Êtes-vous sûr de vouloir vous déconnecter ?"
            type="warning"
            @onok="logout"
            @close="closeInfoModal"
          />
          <AddFriendModal
            v-if="addFriendModalisOpen"
            headerTitle="Ajouter un ami"
            @close="closeAddFriendModal"
          />
          <CreateRoomModal
            v-if="createRoomModalisOpen"
            headerTitle="Créer une room"
            @close="closeCreateRoomModal"
          />
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
const InfoModal = defineAsyncComponent(
  () => import("../components/InfoModal.vue")
);
const AddFriendModal = defineAsyncComponent(
  () => import("../components/AddFriendModal.vue")
);
const CreateRoomModal = defineAsyncComponent(
  () => import("../components/CreateRoomModal.vue")
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
    participants: [{ name: "Bot Lidya", avatar: "🧛" }],
    avatar: "👪",
    name: "Famille",
    type: "room",
    messages: mockMessages,
    active: true,
    mostRecent: true,
  },
  {
    id: 2,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🦆",
    name: "Mes Canards",
    type: "room",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 3,
    participants: [{ name: "Bot Lidya", avatar: "🧛" }],
    avatar: "🧛",
    name: "Bot Lidya",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  {
    id: 4,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 5,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 6,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 7,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 8,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: false,
  },
  {
    id: 9,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  {
    id: 10,
    participants: [{ name: "Mélanie", avatar: "🤖" }],
    avatar: "🤖",
    name: "Bot Mélanie",
    type: "user",
    messages: mockMessages,
    active: false,
    mostRecent: true,
  },
  // Ajoute d'autres mocks si besoin
];
// MOCK pour la démo : à remplacer par ta logique d'ouverture réelle
const openConversations = computed(() =>
  mockConversations.filter((conv) => conv.active)
);

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
function updateSideBarHover(value: boolean) {
  setTimeout(() => {
    sidebarHovered.value = value;
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
