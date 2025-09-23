<template>
  <Suspense>
    <template #default>
      <div class="flex flex-col w-full relative h-full">
        <!-- Global enveloppe of side bar conversations-->
        <!-- <div
          class="flex flex-row items-center px-2 py-2 relative min-h-[44px] min-w-0"
        >
          <button
            v-if="sidebarExpanded"
            class="searchbar-toggle-btn mr-0.5 flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#312f4e] transition"
            :aria-label="
              'Rechercher une conversation'
            "
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle
                cx="10"
                cy="10"
                r="8.5"
                stroke="#4466d6"
                stroke-width="2"
              />
              <line
                x1="16"
                y1="16"
                x2="21"
                y2="21"
                stroke="#4466d6"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <transition name="expand-searchbar">
            <div
              class="relative flex-1 flex items-center mr-2"
            >
              <input
                v-model="roomsStore.searchQuery"
                type="text"
                class="sidebar-searchbar-input pl-5 pr-4 py-2 w-full bg-[#23223a]/80 rounded-xl outline-none text-[15px] text-white placeholder:text-gray-400 shadow-sm border border-[#363657] focus:border-[#6c47ff] transition"
                placeholder="Rechercher..."
                autofocus
              />
            </div>
          </transition>
        </div> -->
        <div class="flex flex-col relative scroll-bar overflow-y-auto">
          <!-- List of conversations filtrées par searchQuery -->
          <div
            v-for="conv in roomsStore.filteredConversations"
            :key="conv.id"
            class="cursor-pointer rounded-md hover:bg-white/5"
            @click="roomsStore.openConversation(conv)"
          >
            <UserConversationItem
              :displayFullContent="sidebarExpanded"
              :displayDate="false"
              :sidebarExpanded="sidebarExpanded"
              :participants="conv.participants"
              :name="conv.name"
              :avatar="conv.avatar"
              :type="conv.type"
              :messages="conv.messages"
              :active="conv.active"
            />
          </div>
          <div
            v-if="roomsStore.filteredConversations.length === 0 && roomsStore.searchQuery"
            class="text-center text-xs text-gray-400 py-4"
          >
            Aucune conversation trouvée.
          </div>
        </div>
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "@layouts/LoadingOverlay.vue";
import { defineAsyncComponent } from "vue";
import { ref, onBeforeUnmount } from "vue";
import type { Bubble } from "@home/chat/view/ChatBubble.vue";
import { useRoomsStore } from "@/stores/RoomsStore";

export type ConversationType = "user" | "room";

export type Conversation = {
  id: number;
  participants: { id: string; name: string; avatar: string, isOnline: boolean }[];
  name: string;
  avatar: string;
  type: ConversationType;
  messages: Bubble[];
  active: boolean;
  mostRecent: boolean;
};

const roomsStore = useRoomsStore();
defineEmits(['create-conversation']);
const UserConversationItem = defineAsyncComponent(
  () => import("../UserConversationItem.vue")
);

defineProps<{
  sidebarExpanded: boolean;
}>();

// Track and clear pending focus timeout on destroy
let focusTimeoutId: number | null = null;
onBeforeUnmount(() => {
  if (focusTimeoutId !== null) clearTimeout(focusTimeoutId);
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
