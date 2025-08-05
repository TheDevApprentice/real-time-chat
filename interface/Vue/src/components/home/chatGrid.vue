<template>
  <div :class="gridClasses" class="max-h-screen h-full w-full gap-2">
    <div
      v-for="(chat, index) in props.openedChats"
      :key="chat.id"
      :class="getChatItemClasses(index)"
    >
      <div class="h-full w-full">
        <ChatView :chat="chat" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import type { Bubble } from "../chat/bubbleChat/ChatBubble.vue";

const ChatView = defineAsyncComponent(
  () => import("./chatView.vue")
);

const props = defineProps<{
  openedChats: {
    id: number;
    name: string;
    avatar: string;
    messages: Bubble[];
  }[];
}>();

const gridType = computed(() => {
  if (props.openedChats.length === 1) {
    return {
      cols: 1,
      rows: 1,
    };
  } else if (props.openedChats.length === 2) {
    return {
      cols: 2,
      rows: 1,
    };
  } else if (props.openedChats.length === 3) {
    return {
      cols: 2,
      rows: 2,
    };
  } else if (props.openedChats.length === 4) {
    return {
      cols: 2,
      rows: 2,
    };
  }
  return {
    cols: Math.min(props.openedChats.length, 3),
    rows: Math.ceil(props.openedChats.length / 3),
  };
});

const gridClasses = computed(() => {
  return `grid grid-cols-${gridType.value.cols} grid-rows-${gridType.value.rows}`;
});

// Fonction pour déterminer les classes de chaque chat selon sa position
const getChatItemClasses = (index: number) => {
  const totalChats = props.openedChats.length;
  
  if (totalChats === 1) {
    // 1 chat : prend tout l'espace
    return 'col-span-1 row-span-1';
  } 
  else if (totalChats === 2) {
    // 2 chats : côte à côte
    return 'col-span-1 row-span-1';
  } 
  else if (totalChats === 3) {
    // 3 chats : 1 grand à gauche, 2 petits empilés à droite
    if (index === 0) {
      // Premier chat : prend 2 rangées à gauche
      return 'col-span-1 row-span-2';
    } else {
      // Deuxième et troisième chat : 1 rangée chacun à droite
      return 'col-span-1 row-span-1';
    }
  } 
  else if (totalChats === 4) {
    // 4 chats : grille 2x2 classique
    return 'col-span-1 row-span-1';
  }
  
  // Cas par défaut pour plus de 4 chats
  return 'col-span-1 row-span-1';
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