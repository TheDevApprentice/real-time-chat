<template>
  <div class="chat-bar-image-row">
    <ImageButton />
    <div class="chat-bar chat-bar-redesign">
      <ChatInput />
      <SendButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageButton from './ImageButton.vue';
import ChatInput from './ChatInput.vue';
import SendButton from './SendButton.vue';
</script>

<style scoped>
.chat-bar-image-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
}

.chat-bar.chat-bar-redesign {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 1.2rem;
  padding: 0.22rem 0.36rem 0.22rem 0.8rem;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.1);
}
</style>
