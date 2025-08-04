<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <div class="w-[100vw] h-[100vh]">
            <div class="z-10 flex">
              <!-- Primary Sidebar -->
              <nav
                class="sidebar-glass flex flex-col h-screen w-27 hover:w-56 transition-all duration-300 ease-in-out group relative border-r border-custom"
              >
                <!-- Avatar principal -->
                <div class="flex mt-6 items-center gap-3 px-3 py-2">
                  <LargeAvatar avatar="🤖" name="Bot Hugo" />
                  <span
                    class="sidebar-title group-hover:opacity-100 opacity-0 transition-opacity font-bold text-lg"
                    >Hugo</span
                  >
                </div>
                <!-- Divider -->
                <div class="sidebar-divider my-2"></div>
                <!-- Rooms header + add -->
                <div class="flex items-center justify-between px-2 py-2">
                  <span
                    class="sidebar-section transition-opacity"
                    >Rooms</span
                  >
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
                  <div class="flex mt-3">
                    <LargeAvatar :avatar="room.avatar" :name="room.name" />
                    <span
                      class="sidebar-room-label group-hover:opacity-100 opacity-0 transition-opacity"
                      >{{ room.name }}</span
                    >
                  </div>
       
                  </li>
                </ul>
                <div class="flex-1"></div>
                <!-- Paramètres / déconnexion -->
                <div class="flex flex-row gap-2 justify-end pb-3">
                  <button class="sidebar-btn-action px-1 mr-0.2 ml-1" title="Paramètres">
                    <span>⚙️</span>
                  </button>
                  <button class="sidebar-btn-action px-1 mr-1 ml-0.2" title="Déconnexion">
                    <span>🚪</span>
                  </button>
                </div>
              </nav>
              <!-- Zone de chat -->
              <section class="flex-1">
                <div
                  class="flex h-full w-full flex-col gap-4 mt-[4.5rem] rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in"
                >
                  <ChatHeader avatar="🤖" name="Bot Mélanie" :active="true" />
                  <div
                    class="scroll-bar flex flex-col h-[calc(80vh-6rem)] overflow-y-auto scroll-w-0 scroll-h-0"
                  >
                    <ChatBubble
                      v-for="(bubble, idx) in chatBubbles"
                      :key="idx"
                      :speaker="bubble.speaker"
                      :text="bubble.text"
                      :date="bubble.date"
                      :isTyping="bubble.isTyping"
                      :isWriting="bubble.isWriting"
                      :animationDelay="`${idx * 0.22}s`"
                    />
                  </div>
                  <BarChat />
                </div>
              </section>
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
import LargeAvatar from "../components/LargeAvatar.vue";
import { reactive, nextTick, onMounted, ref, defineAsyncComponent } from "vue";
import type { Bubble } from "../components/chat/bubbleChat/ChatBubble.vue";
import { useAuthStore } from "../stores/AuthStore";

const ChatBubble = defineAsyncComponent(
  () => import("../components/chat/bubbleChat/ChatBubble.vue")
);
const BarChat = defineAsyncComponent(
  () => import("../components/chat/barChat/BarChat.vue")
);
const ChatHeader = defineAsyncComponent(
  () => import("../components/chat/headerChat/ChatHeader.vue")
);
const PageTemplate = defineAsyncComponent(
  () => import("../components/PageTemplate.vue")
);
const authStore = useAuthStore();
const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const typedChat = ref("");
const showCursor = ref(false);
const showChat = ref(false);
const chatBubbles = reactive<Bubble[]>([]);
const messages = [
  { text: "Hello ! 😀", speaker: 0, date: new Date().toLocaleDateString() },
  { text: "How are you ?", speaker: 1, date: new Date().toLocaleDateString() },
  { text: "Fine thx ! 😁", speaker: 0, date: new Date().toLocaleDateString() },
  {
    text: "Where do you want to go this we ? 😄",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "I want to go to the beach ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Yes let's go  ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
];

// Simulation de rooms pour la sidebar (à remplacer par tes vraies données)
const rooms = [
  { id: 1, name: "Hugo", avatar: "🤖", active: true },
  { id: 2, name: "Mélanie", avatar: "🤖", active: false },
  { id: 3, name: "Bot Alpha", avatar: "🤖", active: false },
];

const typeMessage = async (text: string, bubble: Bubble) => {
  bubble.text = "";
  for (const char of text) {
    bubble.text += char;
    await nextTick();
    await new Promise((r) => setTimeout(r, 70));
  }
};

async function AnimTypeTitle() {
  // Typewriter pour "Real‑Time"
  for (let i = 0; i <= realTimeFull.length; i++) {
    typedRealTime.value = realTimeFull.slice(0, i);
    await new Promise((res) => setTimeout(res, 60));
  }
  await new Promise((res) => setTimeout(res, 200));
  // Typewriter pour "Chat"
  for (let i = 0; i <= chatFull.length; i++) {
    typedChat.value = chatFull.slice(0, i);
    await new Promise((res) => setTimeout(res, 90));
  }
  showCursor.value = false;
}

async function AnimChat() {
  showChat.value = true;
  await new Promise((res) => setTimeout(res, 200));

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.speaker === 0) {
      const bubble: Bubble = {
        speaker: msg.speaker,
        text: "",
        date: msg.date,
        isTyping: true,
        isWriting: false,
      };
      chatBubbles.push(bubble);
      await nextTick();
      await new Promise((res) => setTimeout(res, 1000));
      bubble.isTyping = false;
      bubble.isWriting = true;
      await nextTick();
      await typeMessage(msg.text, bubble);
      bubble.isWriting = false;
      await nextTick();
      await new Promise((res) => setTimeout(res, 120));
      await nextTick();
    } else {
      const bubble: Bubble = {
        speaker: msg.speaker,
        text: "",
        date: msg.date,
        isTyping: false,
        isWriting: false,
      };
      chatBubbles.push(bubble);
      await nextTick();
      bubble.isWriting = true;
      await typeMessage(msg.text, bubble);
      bubble.isWriting = false;
      await nextTick();
      await new Promise((res) => setTimeout(res, 120));
      await nextTick();
    }
  }
}

onMounted(async () => {
  await AnimTypeTitle();
  await new Promise((res) => setTimeout(res, 200));
  await AnimChat();
  await new Promise((res) => setTimeout(res, 200));
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
  background: rgba(30, 34, 44, 0.72);
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
  color: #fff;
  letter-spacing: 0.02em;
}
.sidebar-section {
  margin-left: 0.7rem;
  color: #dbeafe;
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
}
.sidebar-room {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: #dbeafe;
}
.sidebar-room:hover,
.sidebar-room-active {
  background: rgba(108, 71, 255, 0.11);
  color: #fff;
}
.sidebar-room-label {
  font-weight: 500;
  color: #dbeafe;
  transition: color 0.2s;
}
.sidebar-btn-action {
  background: transparent;
  color: #b5b8c9;
  border-radius: 8px;
  width: 100%;
  padding: 0.5rem;
  transition: background 0.2s, color 0.2s;
  font-size: 1.3rem;
}
.sidebar-btn-action:hover {
  background: rgba(108, 71, 255, 0.13);
  color: #fff;
}
</style>
