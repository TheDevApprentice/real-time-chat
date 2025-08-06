<template>
    <div
      class="relative h-full w-full flex flex-col gap-4 rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in transition-all"
    >
      <ChatHeader :chat="props.chat" />
      <div class="scroll-bar flex flex-col flex-1 px-1 mx-0.5 overflow-y-auto min-h-0">
        <ChatBubble
          v-for="(bubble, bidx) in chatBubbles"
          :key="bidx"
          v-bind="bubble"
          :animationDelay="`${bidx * 0.22}s`"
        />
      </div>
      <BarChat />
    </div>
  </template>
  
  <script setup lang="ts">
  import { nextTick, onMounted, ref, defineAsyncComponent } from "vue";
  import type { Bubble } from "../chat/bubbleChat/ChatBubble.vue";
import type { Conversation } from "../SideBarConversations.vue";
  
  const ChatBubble = defineAsyncComponent(
    () => import("../chat/bubbleChat/ChatBubble.vue")
  );
  const BarChat = defineAsyncComponent(
    () => import("../chat/barChat/BarChat.vue")
  );
  const ChatHeader = defineAsyncComponent(
    () => import("../chat/headerChat/ChatHeader.vue")
  );
  
  const props = defineProps<{
    chat: Conversation;
  }>();
  const realTimeFull = "Real‑Time";
  const chatFull = "Chat";
  const typedRealTime = ref("");
  const typedChat = ref("");
  const showCursor = ref(false);
  const showChat = ref(false);
  const chatBubbles = ref<Bubble[]>([]);
  const typeMessage = async (text: string, bubble: Bubble) => {
    bubble.text = "";
    for (const char of text) {
      bubble.text += char;
      await nextTick();
      await new Promise((r) => setTimeout(r, 70));
    }
  };
  const updateBubbleStatus = async (bubble: Bubble) => {
    bubble.isSent = true;
    bubble.isRead = true;
    await nextTick();
    await new Promise((r) => setTimeout(r, 120));
    await nextTick();
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
  
    for (let i = 0; i < props.chat.messages.length; i++) {
      const msg = props.chat.messages[i];
      if (msg.speaker === 0) {
        const bubble: Bubble = {
          speaker: msg.speaker,
          text: "",
          date: msg.date,
          isTyping: true,
          isWriting: false,
          isSent: false,
          isRead: false,
        };
        chatBubbles.value.push(bubble);
        await nextTick();
        await new Promise((res) => setTimeout(res, 1000));
        bubble.isTyping = false;
        bubble.isWriting = true;
        await nextTick();
        await typeMessage(msg.text, bubble).then(() => {
          bubble.isWriting = false;
          updateBubbleStatus(bubble);
        });
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
          isSent: false,
          isRead: false,
        };
        chatBubbles.value.push(bubble);
        await nextTick();
        bubble.isWriting = true;
        await typeMessage(msg.text, bubble).then(() => {
          bubble.isWriting = false;
          updateBubbleStatus(bubble);
        });
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