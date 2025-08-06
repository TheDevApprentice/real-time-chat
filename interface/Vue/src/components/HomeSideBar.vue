<template>
  <Suspense>
    <template #default>
      <div class="relative h-screen hidden md:flex lg:flex transition-all">
        <nav
          class="sidebar-glass flex flex-col h-screen w-23 hover:w-53 transition-all duration-300 ease-in-out group relative border-r border-custom"
          @mouseenter="updateSideBarHover(true)"
          @mouseleave="updateSideBarHover(false)"
        >
          <div class="flex mt-2">
            <div class="mt-6 ml-4">
              <LargeAvatar avatar="🤖" name="Bot Hugo" :isOnline="true"/>
            </div>
            <span
              class="sidebar-room-label mt-4.5 ml-2 group-hover:opacity-100 opacity-0"
              style="
                transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
              "
              >Hugo</span
            >
          </div>
          <!-- Divider -->
          <div class="sidebar-divider my-2"></div>
          <div class="scroll-bar overflow-y-auto">
            <!-- Rooms header + add -->
            <div class="flex items-center justify-between px-2 py-2">
              <span
                class="sidebar-section"
                style="
                  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
                "
                >Rooms</span
              >
              <button
                class="sidebar-btn-add opacity-0 group-hover:opacity-100 flex items-center justify-center"
                style="
                  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
                "
                title="Créer une room"
                @click="openCreateRoomModal"
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
            <div class="flex mt-2 px-2">
              <div class="flex flex-col gap-2">
                <UserConversationItem
                  :displayFullContent="sidebarHovered"
                  :displayDate="false"
                  v-for="conv in mockConversations.filter(
                    (conv) => conv.type === 'room' && conv.mostRecent === true
                  )"
                  :key="conv.id"
                  :participants="conv.participants"
                  :avatar="conv.avatar"
                  :type="conv.type"
                  :name="conv.name"
                  :messages="conv.messages"
                  :active="conv.active"
                />
              </div>
            </div>
            <div class="sidebar-divider my-2"></div>
            <!-- Amis header + add -->
            <div class="flex items-center justify-between px-2 py-2">
              <span
                class="sidebar-section"
                style="
                  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
                "
                >Amis</span
              >
              <button
                class="sidebar-btn-add opacity-0 group-hover:opacity-100 flex items-center justify-center"
                style="
                  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
                "
                title="Ajouter un ami"
                @click="openAddFriendModal"
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
                  v-for="conv in mockConversations.filter(
                    (conv) => conv.type === 'user' && conv.mostRecent === true
                  )"
                  :key="conv.id"
                  :participants="conv.participants"
                  :messages="conv.messages"
                  :avatar="conv.avatar"
                  :type="conv.type"
                  :name="conv.name"
                  :active="conv.active"
                />
              </div>
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
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../components/LoadingOverlay.vue";
import { defineAsyncComponent } from "vue";
import type { Conversation } from "../components/SideBarConversations.vue";

const LargeAvatar = defineAsyncComponent(
  () => import("../components/LargeAvatar.vue")
);
const UserConversationItem = defineAsyncComponent(
  () => import("../components/chat/UserConversationItem.vue")
);


defineProps<{
  rooms: Room[];
  mockConversations: Conversation[];
  showInfoModal: boolean;
  sidebarHovered: boolean;
  addFriendModalisOpen: boolean;
  createRoomModalisOpen: boolean;
  askLogout: () => void;
  openAddFriendModal: () => void;
  openInfoModal: () => void;
  logout: () => void;
  closeInfoModal: () => void;
  closeAddFriendModal: () => void;
  openCreateRoomModal: () => void;
  closeCreateRoomModal: () => void;
  updateSideBarHover: (value: boolean) => void;
}>();

export type Room = {
  id: number;
  name: string;
  avatar: string;
  active: boolean;
};
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
  width: 100%;
  min-width: 100%;
  transition: color 0.5s;
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
