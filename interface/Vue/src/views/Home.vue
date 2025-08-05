<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <div class="w-[100vw] h-[100vh]">
            <div class="z-10 flex">
              <!-- Primary Sidebar -->
              <nav
                class="sidebar-glass flex flex-col h-screen w-23 hover:w-66 transition-all duration-300 ease-in-out group relative border-r border-custom"
                @mouseenter="sidebarHovered = true"
                @mouseleave="sidebarHovered = false"
              >
                <div class="flex mt-2">
                  <div class="mt-6 ml-4">
                    <LargeAvatar avatar="🤖" name="Bot Hugo" />
                  </div>
                  <span
                    class="sidebar-room-label mt-4.5 ml-2 group-hover:opacity-100 opacity-0 transition-opacity"
                    >Hugo</span
                  >
                </div>
                <!-- Divider -->
                <div class="sidebar-divider my-2"></div>
                <!-- Rooms header + add -->
                <div class="flex items-center justify-between px-2 py-2">
                  <span class="sidebar-section transition-opacity">Rooms</span>
                  <button
                    class="sidebar-btn-add opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Ajouter une room"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle
                        cx="10"
                        cy="10"
                        r="10"
                        fill="currentColor"
                        opacity="0.15"
                      />
                      <path
                        d="M10 5v10M5 10h10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <!-- Liste des rooms -->
                <ul class="flex flex-col gap-2 mt-2 px-2">
                  <li
                    v-for="room in rooms"
                    :key="room.id"
                    :class="[
                      'sidebar-room',
                      room.active ? 'sidebar-room-active' : '',
                    ]"
                  >
                    <div class="flex mt-2 py-1">
                      <div class="mt-3">
                        <LargeAvatar :avatar="room.avatar" :name="room.name" />
                      </div>
                      <span
                        class="sidebar-room-label mt-2 ml-2 group-hover:opacity-100 opacity-0 transition-opacity"
                        >{{ room.name }}</span
                      >
                    </div>
                  </li>
                </ul>
                <div class="sidebar-divider my-2"></div>
                <!-- Amis header + add -->
                <div class="flex items-center justify-between px-2 py-2">
                  <span class="sidebar-section transition-opacity">Amis</span>
                  <button
                    class="sidebar-btn-add opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Ajouter une room"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle
                        cx="10"
                        cy="10"
                        r="10"
                        fill="currentColor"
                        opacity="0.15"
                      />
                      <path
                        d="M10 5v10M5 10h10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <div class="flex mt-2 px-2">
                  <div class="flex flex-col gap-2">
                    <UserConversationItem
                      :displayFullContent="sidebarHovered"
                      :displayDate="false"
                      v-for="conv in mockConversations"
                      :key="conv.id"
                      :participants="conv.participants"
                      :title="conv.title"
                      :lastMessage="conv.lastMessage"
                      :active="conv.active"
                    />
                  </div>
                </div>
                <div class="flex-1"></div>
                <!-- Paramètres / déconnexion -->
                <div class="flex flex-row gap-2 justify-end pb-3">
                  <button
                    class="sidebar-btn-action px-1 mr-0.2 ml-1"
                    title="Paramètres"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                  <button
                    class="sidebar-btn-action sidebar-btn-logout px-1 mr-1 ml-0.2"
                    title="Déconnexion"
                    @click="askLogout"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-6-3h12m0 0l-3-3m3 3l-3 3"
                        stroke="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </nav>
              <div class="w-full min-h-0 min-w-0 h-full grid grid-cols-1 grid-rows-1 gap-2 bg-white/10 rounded-xl shadow-lg animate-fade-in">
                <!-- Zone bouton d'actions et de recherche cette zone se superpose avec le parent : PageTemplate qui laisse en haut à droite des bouton qui permettent de faire la gestion rapide du theme et de la lanque
                 il faut donc que cette zone soit libre -->
                <section class="flex flex-row">
                  <div class="search-bar">
                    <SearchBar
                      v-if="authStore.isAuthenticated"
                      :modelValue="searchQuery"
                      @update:modelValue="updateSearchQuery($event)"
                      placeholder="Rechercher"
                    >
                      <template
                        v-if="searchQuery && filteredUsers.length > 0"
                        #results
                      >
                        <SearchBarUserCard
                          v-for="user in filteredUsers"
                          :key="user.name"
                          :avatar="user.avatar"
                          :name="user.name"
                        />
                      </template>
                      <template
                        v-if="searchQuery && filteredUsers.length === 0"
                        #no-result
                      >
                        <SearchBarUserCard :noresult="true" />
                      </template>
                    </SearchBar>
                  </div>
                  <div class="flex absolute left-120 top-5">
                    <input type="number" placeholder="nb of row" v-model="nbOpenChats"  min="1" max="4"/>
                  </div>
                </section>
                <!-- Zone de chat qui doit laisser un espace en haut pour le bouton d'actions et de recherche -->
                <section class="flex mt-[4.4rem] h-[calc(100vh-5.05rem)]">
                  <div
                    class="min-h-0 min-w-0 h-full w-full grid grid-cols-[310px_minmax(400px,_1fr)_0px] grid-rows-1 gap-2 mx-1 bg-white/10 rounded-xl shadow-lg animate-fade-in "
                  >
                    <div class="col-span-1 row-span-1">
                      <UserConversationItem
                        :displayFullContent="true"
                        :displayDate="true"
                        v-for="conv in mockConversations"
                        :key="conv.id"
                        :participants="conv.participants"
                        :title="conv.title"
                        :lastMessage="conv.lastMessage"
                        :active="conv.active"
                      />
                    </div>
                    <div class="col-span-1 row-span-1">
                      <ChatGrid :openedChats="openedChats" />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
          <InfoModal
            v-if="showInfoModal"
            headerTitle="Déconnexion"
            message="Êtes-vous sûr de vouloir vous déconnecter ?"
            type="warning"
            @onok="logout"
            @close="closeInfoModal"
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

const LargeAvatar = defineAsyncComponent(
  () => import("../components/LargeAvatar.vue")
);
const UserConversationItem = defineAsyncComponent(
  () => import("../components/chat/UserConversationItem.vue")
);
const InfoModal = defineAsyncComponent(
  () => import("../components/InfoModal.vue")
);
const ChatGrid = defineAsyncComponent(
  () => import("../components/home/chatGrid.vue")
);
const PageTemplate = defineAsyncComponent(
  () => import("../components/PageTemplate.vue")
);
const SearchBar = defineAsyncComponent(
  () => import("../components/SearchBar.vue")
);
const SearchBarUserCard = defineAsyncComponent(
  () => import("../components/SearchBarUserCard.vue")
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
const rooms = [
  { id: 1, name: "Famille", avatar: "👪", active: false },
  { id: 2, name: "Mes Canards", avatar: "🦆", active: false },
];

// MOCK pour la démo : à remplacer par ta logique d'ouverture réelle
const nbOpenChats = ref(4); // Change ce nombre pour tester 1, 2, 3 ou 4 chats
const openedChats = computed(() => [
  { id: 1, name: "Hugo", avatar: "🤖", messages: messages },
  { id: 2, name: "Mélanie", avatar: "🤖", messages: messages },
  { id: 3, name: "Alpha", avatar: "🤖", messages: messages },
  { id: 4, name: "Lidya", avatar: "🧛", messages: messages },
].slice(0, nbOpenChats.value)); // Simule l'ouverture de 1 à 4 chats

const mockConversations = [
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
/* button {
  color: #090909;
  padding: 0.7em 1.7em;
  font-size: 18px;
  border-radius: 0.5em;
  background: #e8e8e8;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
  box-shadow: 6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff;
}

button:hover {
  border: 1px solid white;
}

button:active {
  box-shadow: 4px 4px 12px #c5c5c5, -4px -4px 12px #ffffff;
} */
</style>
