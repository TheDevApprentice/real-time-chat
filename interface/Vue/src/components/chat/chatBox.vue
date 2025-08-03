<template>
  <PageTemplate>
    <template #content>
      <div class="chat-box">
        <!-- Chat header with avatar, name and close button -->
        <ChatHeader avatar="🤖" name="Bot Mélanie" />
        <ChatBubble
          v-for="(bubble, idx) in chatBubbles"
          :key="idx"
          :speaker="bubble.speaker"
          :text="bubble.text"
          :date="bubble.date"
          :isTyping="bubble.isTyping"
          :animationDelay="`${idx * 0.22}s`"
        />
        <BarChat />
      </div>
    </template>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PageTemplate from "../PageTemplate.vue";
import ChatBubble, { type Bubble } from "./bubbleChat/ChatBubble.vue";
import BarChat from "./barChat/BarChat.vue";
import ChatHeader from "./headerChat/ChatHeader.vue";

const chatBubbles = ref<Bubble[]>([]);
</script>

<style scoped>
/* Chat preview container */
.chat-box {
  position: absolute;
  top: 0.5%;
  right: -350px;
  width: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  border-radius: 1rem;
  border: 1px solid rgba(68, 102, 214, 0.1);
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.13);
  padding: 1rem;
  overflow: hidden;
  z-index: 1;
}
</style>
