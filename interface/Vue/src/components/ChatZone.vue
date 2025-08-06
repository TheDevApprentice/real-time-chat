<template>
  <Suspense>
    <template #default>
      <!-- Zone de chat qui doit laisser un espace en haut pour le bouton d'actions et de recherche -->
      <section
        class="flex relative min-w-0 w-full h-[calc(100vh-6.5rem)] md:mt-[4.4rem] md:h-[calc(100vh-5.05rem)]"
      >
        <div
          class="min-w-0 w-full relative grid grid-rows-1 bg-white/10 rounded-xl shadow-lg animate-fade-in"
          :class="{
            'grid-cols-[100%_minmax(400px,_1fr)_0px]':
              sidebarExpanded && conversations.filter((c) => c.active).length === 0,
            'grid-cols-[310px_minmax(400px,_1fr)_0px]':
              sidebarExpanded && conversations.filter((c) => c.active).length > 0,
            'grid-cols-[0px_minmax(400px,_1fr)_0px] md:grid-cols-[90px_minmax(400px,_1fr)_0px]': !sidebarExpanded,
          }"
          style="
            transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          "
        >
          <div class="col-span-1 row-span-1 w-full h-full relative">
            <button
              v-if="conversations.filter((c) => c.active).length > 0"
              class="sidebar-toggle-btn absolute -right-6.5 top-20 z-40"
              :aria-label="
                sidebarExpanded
                  ? 'Réduire la barre latérale'
                  : 'Déplier la barre latérale'
              "
              @click="toggleSidebar"
              type="button"
            >
              <svg
                v-if="sidebarExpanded"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg
                v-else
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <div
              class="col-span-1 row-span-1 w-full h-full relative "
              :class="{
                'relative top-0': sidebarExpanded,
                'absolute mt-[-2rem] ml-4': !sidebarExpanded,
              }"
            >
              <SideBarConversations
                :sidebarExpanded="sidebarExpanded"
                :conversations="conversations"
              />
            </div>
          </div>
          <div class="col-span-1 row-span-1 w-full h-full relative">
            <ChatGrid :conversations="conversations" />
          </div>
        </div>
      </section>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../components/LoadingOverlay.vue";
import { defineAsyncComponent, ref } from "vue";
import type { Conversation } from "../components/SideBarConversations.vue";

const SideBarConversations = defineAsyncComponent(
  () => import("../components/SideBarConversations.vue")
);
const ChatGrid = defineAsyncComponent(
  () => import("../components/home/chatGrid.vue")
);

defineProps<{
  conversations: Conversation[];
}>();

const sidebarExpanded = ref(true);

function toggleSidebar() {
  setTimeout(() => {
    sidebarExpanded.value = !sidebarExpanded.value;
  }, 400);
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
.sidebar-toggle-btn {
  background: var(--background-btn, #6c47ff);
  color: #fff;
  border-radius: 50%;
  width: 2.1rem;
  height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 2px 8px rgba(108, 71, 255, 0.08);
  transition: background 0.18s, box-shadow 0.18s;
  transform: translateY(-50%);
}
.sidebar-toggle-btn:hover {
  background: #825fff;
  box-shadow: 0 4px 16px rgba(108, 71, 255, 0.13);
}
</style>
