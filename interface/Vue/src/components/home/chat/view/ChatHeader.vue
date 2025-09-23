<template>
  <div class="chat-header-preview px-2 mr-3">
    <Avatar
      :avatar="chat.avatar"
      :isOnline="isOneInConvIsOnline()"
      :showBadge="chat.type === 'user'"
    />
    <span class="chat-header-name">{{ chat.name }}</span>
    <!-- Call Voice button -->
    <button class="chat-header-call" aria-label="Appeler" @click="startCall()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20a1 1 0 01-1 1C10.85 21 3 13.15 3 3a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z"
          fill="currentColor"
        />
      </svg>
    </button>
    <!-- Call Video button -->
    <button class="chat-header-call" aria-label="Appel vidéo" @click="startVideoCall()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 7.5C3 6.12 4.12 5 5.5 5h7A2.5 2.5 0 0 1 15 7.5v1.8l3.3-2.2a1 1 0 0 1 1.7.83v7.14a1 1 0 0 1-1.7.83L15 13.7v1.8A2.5 2.5 0 0 1 12.5 18h-7A2.5 2.5 0 0 1 3 15.5v-8Z" fill="currentColor"/>
      </svg>
    </button>
    <button
      class="chat-header-close"
      aria-label="Fermer"
      v-if="chat.active"
      @click="closeConv()"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 5L15 15M15 5L5 15"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import Avatar from "@ui/avatars/Avatar.vue";
import { type Conversation } from "@home/chatZone/SideBarConversations.vue";

const props = defineProps<{
  chat: Conversation;
}>();

const emit = defineEmits<{
  closeConv: [Conversation];
  "click-call": [Conversation];
  "click-video-call": [Conversation];
}>();

function isOneInConvIsOnline() {
  let isOnline = false;
  if (props.chat.type === "user") {
    isOnline = props.chat.participants[1].isOnline;
  }
  for (const participant of props.chat.participants) {
    if (participant.isOnline) isOnline = true;
  }
  return isOnline;
}
async function closeConv() {
  console.log("chat header closeConv :", props.chat);
  emit("closeConv", props.chat);
}

function startCall() {
  emit("click-call", props.chat);
}

function startVideoCall() {
  emit("click-video-call", props.chat);
}
</script>

<style scoped>
.chat-header-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.18rem 0.35rem 0.18rem 0.12rem;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.163);
  border-radius: 1.1rem;
  box-shadow: 1px 1px 12px 1px rgba(68, 102, 214, 0.71);
  transition: background 0.25s, box-shadow 0.25s;
}
.chat-header-preview:hover {
  background: rgba(255, 255, 255, 0.263);
  box-shadow: 1px 1px 12px 3px rgba(77, 115, 242, 0.893);
}
.chat-header-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35em;
  font-weight: 700;
  box-shadow: 1px 1px 6px 1px rgba(68, 102, 214, 0.621);
  margin-right: 0.3rem;
  transition: background 0.25s;
}
.chat-header-avatar:hover {
  cursor: pointer;
}
.chat-header-name {
  font-weight: 600;
  color: var(--page-text-color);
  font-size: 1.02em;
  letter-spacing: 0.05em;
  flex: 1;
  text-shadow: 0 1px 2px rgba(10, 161, 255, 0.496);
  transition: color 0.25s;
}
.chat-header-name:hover {
  cursor: pointer;
}

.chat-header-close {
  background: transparent;
  border: none;
  color: #bbb;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, color 0.18s;
  cursor: not-allowed;
  opacity: 0.7;
  margin-left: 0.2rem;
}
.chat-header-call {
  background: transparent;
  border: none;
  color: var(--page-text-color);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, color 0.18s, transform 0.1s;
  margin-left: 0.2rem;
}
.chat-header-call:hover {
  color: #5b7fff;
  background: rgba(255, 255, 255, 0.15);
}
.chat-header-call:active {
  transform: scale(0.96);
}
.chat-header-close:hover {
  cursor: pointer;
  color: var(--page-text-color);
}
.chat-header-close svg {
  display: block;
}
</style>
