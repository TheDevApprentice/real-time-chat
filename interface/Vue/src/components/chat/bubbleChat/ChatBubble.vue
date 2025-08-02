<template>
  <div
    :class="[
      'chat-bubble',
      speaker === 0 ? 'left bubble-enter-left' : 'right bubble-enter-right',
    ]"
    :style="{ animationDelay: `${animationDelay}` }"
  >
    <span v-if="isTyping" class="typing-dots">
      <span class="dot">.</span><span class="dot">.</span
      ><span class="dot">.</span>
    </span>
    <span v-else>
      <span class="typewriter" :style="{ '--typewriter-chars': text.length }">
        {{ text }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";

defineProps<{
  speaker: number;
  text: string;
  isTyping?: boolean;
  animationDelay?: string;
}>();
</script>

<style scoped>
.chat-bubble {
  padding: 0.6rem 0.8rem;
  margin: 0.1rem 0.1rem;
  border-radius: 0.8rem;
  max-width: 100%;
  width: min-content;
  font-size: 0.9rem;
  line-height: 1.2;
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.08);
  animation: bubble-pop 0.45s cubic-bezier(0.4, 1.6, 0.4, 1) both;
  word-break: break-word;
}
.chat-bubble.left {
  background: rgba(115, 84, 139, 0.363);
  align-self: flex-start;
}
.chat-bubble.right {
  background: linear-gradient(90deg, #4466d6 60%, #5b7fff 100%);
  color: #fff;
  align-self: flex-end;
}
.chat-bubble.left::after {
  content: "";
  position: absolute;
  left: 16px;
  bottom: -8px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-top-color: rgba(115, 84, 139, 0.363);
  border-bottom: 0;
  border-right: 0;
  margin-left: -4px;
}
.chat-bubble.right::after {
  content: "";
  position: absolute;
  right: 16px;
  bottom: -8px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-top-color: rgba(68, 102, 214, 0.3);
  border-bottom: 0;
  border-left: 0;
  margin-right: -4px;
}
.typing-dots {
  display: inline-block;
  min-width: 1.5em;
  letter-spacing: 0.1em;
}
.dot {
  display: inline-block;
  opacity: 0.7;
  font-weight: 900;
  font-size: 1.1em;
  transform: translateY(0);
  animation: dot-bounce 1.2s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes dot-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-7px);
    opacity: 1;
  }
  40% {
    transform: translateY(0);
    opacity: 0.7;
  }
}
.typewriter {
  display: inline-block;
  white-space: pre;
  overflow: hidden;
  border-right: none;
  --typewriter-chars: 20;
  width: 0;
  animation: typewriter 1.2s steps(var(--typewriter-chars)) 1 forwards;
}
@keyframes typewriter {
  to {
    width: calc(var(--typewriter-chars) * 1ch);
  }
}
@keyframes bubble-pop {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
