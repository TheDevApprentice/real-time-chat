<template>
  <div class="chat-header-preview">
    <Avatar :avatar="avatar" />
    <span class="chat-header-name">{{ name }}</span>
    <button
      class="chat-header-close"
      aria-label="Fermer"
      disabled
      v-if="active"
      @click="onClose"
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
import Avatar from "./Avatar.vue";

defineProps<{
  avatar?: string;
  name?: string;
  onClose?: () => void;
  onOpen?: () => void;
  active?: boolean;
  nbUnreadMessage?: number;
}>();

defineEmits<{ close: [] }>();
</script>

<style scoped>
.chat-header-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.18rem 0.35rem 0.18rem 0.12rem;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.163);
  border-radius: 1.1rem;
  box-shadow: 1px 1px 12px 1px rgba(68, 102, 214, 0.71);
  transition: background 0.25s box-shadow 0.25s;
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
.chat-header-name {
  font-weight: 600;
  color: var(--page-text-color);
  font-size: 1.02em;
  letter-spacing: 0.05em;
  flex: 1;
  text-shadow: 0 1px 2px rgba(10, 161, 255, 0.496);
  transition: color 0.25s;
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
.chat-header-close svg {
  display: block;
}
</style>
