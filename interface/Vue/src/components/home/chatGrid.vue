<template>
  <div :class="`grid grid-cols-1 md:grid-cols-${openedChats.length} `">
    <div
      v-for="(chat, idx) in openedChats"
      :key="chat.id"
      class="flex h-full w-full flex-col gap-4 mt-[4.5rem] mx-1 rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in"
    >
      <ChatHeader :avatar="chat.avatar" :name="chat.name" :active="true" />
      <div class="scroll-bar flex flex-col h-[calc(80vh-6rem)] overflow-y-auto">
        <ChatBubble
          v-for="(bubble, bidx) in chat.bubbles"
          :key="bidx"
          v-bind="bubble"
          :animationDelay="`${bidx * 0.22}s`"
        />
      </div>
      <BarChat />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  reactive,
  nextTick,
  onMounted,
  ref,
  defineAsyncComponent,
  computed,
} from "vue";
import type { Bubble } from "../chat/bubbleChat/ChatBubble.vue";
import { useAuthStore } from "../../stores/AuthStore";

const ChatBubble = defineAsyncComponent(
  () => import("../chat/bubbleChat/ChatBubble.vue")
);
const BarChat = defineAsyncComponent(
  () => import("../chat/barChat/BarChat.vue")
);
const ChatHeader = defineAsyncComponent(
  () => import("../chat/headerChat/ChatHeader.vue")
);

const authStore = useAuthStore();
const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const typedChat = ref("");
const showInfoModal = ref(false);
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
  { id: 1, name: "Famille", avatar: "👪", active: false },
  { id: 2, name: "Mes Canards", avatar: "🦆", active: false },
];

// MOCK pour la démo : à remplacer par ta logique d'ouverture réelle
const nbChatsOuverts = 1; // Change ce nombre pour tester 1, 2, 3 ou 4 chats
const openedChats = [
  { id: 1, name: "Hugo", avatar: "🤖", bubbles: chatBubbles },
  { id: 2, name: "Mélanie", avatar: "🤖", bubbles: chatBubbles },
  { id: 3, name: "Alpha", avatar: "🤖", bubbles: chatBubbles },
  { id: 4, name: "Lidya", avatar: "🧛", bubbles: chatBubbles },
].slice(0, nbChatsOuverts); // Simule l'ouverture de 1 à 4 chats

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
