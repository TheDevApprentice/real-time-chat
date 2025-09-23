<template>
    <div
      class="relative h-full w-full flex flex-col gap-4 rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in transition-all"
    >
      <ChatHeader :chat="props.chat" @closeConv="closeConv" />
      <div class="scroll-bar flex flex-col flex-1 px-1 mx-0.5 overflow-y-auto min-h-0">
        <ChatBubble
          v-for="(bubble, bidx) in renderedBubbles"
          :key="`${bubble.messageId ?? bidx}:${bubble.text}`"
          v-bind="bubble"
          :animationDelay="`${bidx * 0.22}s`"
          @request-edit="onRequestEdit"
          @request-delete="onRequestDelete"
        />
      </div>
      <BarChat
        v-model="inputValue"
        :inputPlaceholder="editingMessageId != null ? 'Modifier le message…' : 'Écrire un message…'"
        @click-send="handleSend"
      />
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, ref, defineAsyncComponent, onBeforeUnmount, computed } from "vue";
  import { useMessagesStore } from "@/stores/MessagesStore";
  import { useAuthStore } from "@/stores/AuthStore";
  
  import type { Conversation } from "@home/chatZone/SideBarConversations.vue";
  import type { Bubble } from "@home/chat/view/ChatBubble.vue";
  
  const ChatBubble = defineAsyncComponent(
    () => import("@home/chat/view/ChatBubble.vue")
  );
  const BarChat = defineAsyncComponent(
    () => import("@home/chat/view/chatBar/BarChat.vue")
  );
  const ChatHeader = defineAsyncComponent(
    () => import("@home/chat/view/ChatHeader.vue")
  );
  
  const props = defineProps<{
    chat: Conversation;
  }>();
  const emit = defineEmits(['close-conversation']);
  const messagesStore = useMessagesStore();
  const authStore = useAuthStore();
  
  const realTimeFull = "Real‑Time";
  const chatFull = "Chat";
  const typedRealTime = ref("");
  const typedChat = ref("");
  const showCursor = ref(false);
  const inputValue = ref<string>("");
  const editingMessageId = ref<number | null>(null);
  // Cancellable sleep helper to track timeouts for proper cleanup
  const timeoutIds: number[] = [];
  function sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const id = window.setTimeout(() => resolve(), ms);
      timeoutIds.push(id);
    });
  }

  async function onRequestEdit(payload: { id?: number | string; text: string }) {
    try {
      const mid = Number(payload?.id);
      if (!Number.isFinite(mid)) return;
      inputValue.value = String(payload?.text || '');
      editingMessageId.value = mid;
    } catch {}
  }
  async function onRequestDelete(payload: { id?: number | string }) {
    try {
      const rid = roomId.value;
      if (!rid) return;
      const mid = Number(payload?.id);
      if (!Number.isFinite(mid)) return;
      const ok = window.confirm('Supprimer ce message ?');
      if (!ok) return;
      await messagesStore.messageDelete(rid, mid);
    } catch {}
  }

  // Legacy demo helpers removed; real rendering uses store messages
  
  async function AnimTypeTitle() {
    // Typewriter pour "Real‑Time"
    for (let i = 0; i <= realTimeFull.length; i++) {
      typedRealTime.value = realTimeFull.slice(0, i);
      await sleep(60);
    }
    await sleep(200);
    // Typewriter pour "Chat"
    for (let i = 0; i <= chatFull.length; i++) {
      typedChat.value = chatFull.slice(0, i);
      await sleep(90);
    }
    showCursor.value = false;
  }

  // Real-time rendering of messages from MessagesStore
  const roomId = computed(() => String(((props.chat as any)?.id) || ''));
  const storeRoom = computed(() => (messagesStore.byRoom[roomId.value] || { items: [] } as any));
  const renderedBubbles = computed<Bubble[]>(() => {
    const myId = authStore.userId;
    const myName = authStore.user;
    const items = (storeRoom.value.items || []) as any[];
    return items.map((m: any) => {
      const authorId = (m?.author?.id as string | undefined) || undefined;
      const authorName = (m?.author?.name as string | undefined) || undefined;
      const mineById = !!(myId && authorId && myId === authorId);
      const mineByName = !!(myName && authorName && myName === authorName);
      const speaker = (mineById || mineByName) ? 0 : 1;
      const date = typeof m?.timestamp === 'number' ? new Date(m.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
      const deleted = !!m?.deleted;
      return {
        text: deleted ? '[deleted]' : String(m?.content || ''),
        speaker,
        date,
        isTyping: false,
        isWriting: false,
        isSent: deleted ? false : typeof m?.deliveredAt === 'number',
        isRead: deleted ? false : typeof m?.readAt === 'number',
        messageId: m?.id,
      } as Bubble;
    });
  });

  onMounted(async () => {
    await AnimTypeTitle();
    await sleep(100);
    // Load initial history for this room if not already loaded
    try {
      if (roomId.value) {
        messagesStore.setActiveRoom(roomId.value);
        await messagesStore.loadRoomHistory(roomId.value, 0, 50);
      }
    } catch {}
  });

  // Handler relayed from ChatHeader to parent components
  function closeConv(conv: Conversation) {
    console.log("chat view closeConv :", conv);
    console.log("chat view props.chat :", props.chat);
    emit('close-conversation', conv || props.chat);
  }

  async function handleSend() {
    try {
      const content = String(inputValue.value || '').trim();
      if (!content) return;
      const rid = String(((props.chat as any)?.id) || '');
      if (!rid) return;
      if (editingMessageId.value != null) {
        await messagesStore.messageEdit(rid, Number(editingMessageId.value), content);
        editingMessageId.value = null;
        inputValue.value = '';
        return;
      }
      await messagesStore.sendMessageToRoom(rid, content);
      inputValue.value = '';
    } catch {}
  }

  // Cleanup all pending timers on component destroy
  onBeforeUnmount(() => {
    for (const id of timeoutIds) clearTimeout(id);
    try { messagesStore.setActiveRoom(null); } catch {}
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