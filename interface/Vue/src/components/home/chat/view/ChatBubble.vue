<template>
  <div
    :class="[
      'chat-bubble',
      speaker === 0 ? 'left bubble-enter-left' : 'right bubble-enter-right',
      'relative',
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
      <div class="flex flex-row gap-3 w-full">
        <span
          v-if="isTyping === false && isWriting === false"
          class="chat-bubble-date"
          >{{ formattedDate }}</span
        >
        <!-- Icônes envoyé/lu -->
        <span
          v-if="isTyping === false && isWriting === false && speaker === 0"
          class="bubble-status-icons"
        >
          <!-- Icône envoyé/message -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 22 22"
            fill="none"
            :class="[
              props.isSent ? 'text-sky-200' : 'text-gray-400',
              'inline-block',
              'align-middle',
            ]"
            style="vertical-align: middle; margin-right: 2px"
          >
            <path d="M2 11L20 2L11 20L10 13L2 11Z" fill="currentColor" />
          </svg>
          <!-- Icône œil/lu -->
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            :class="[
              props.isRead ? 'text-sky-300' : 'text-gray-400',
              'inline-block',
              'align-middle',
            ]"
            style="vertical-align: middle"
          >
            <path
              d="M1.5 12C3.5 7.5 8 4.5 12 4.5C16 4.5 20.5 7.5 22.5 12C20.5 16.5 16 19.5 12 19.5C8 19.5 3.5 16.5 1.5 12Z"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </span>
      </div>
    </span>
  </div>
</template>

<style scoped>
.bubble-status-icons {
  position: absolute;
  right: 0.45rem;
  bottom: 0.4rem;
  display: flex;
  gap: 2px;
  align-items: center;
  z-index: 2;
}
</style>

<script setup lang="ts">
import { computed, defineProps } from "vue";

// simulate chat conversation with typewriter effect
export interface Bubble {
  speaker: number;
  text: string;
  date: string;
  isTyping: boolean;
  isWriting: boolean;
  isSent: boolean;
  isRead: boolean;
}

const props = defineProps<{
  speaker: number;
  text: string;
  date: string;
  isTyping: boolean;
  isWriting: boolean;
  isSent: boolean;
  isRead: boolean;
  animationDelay?: string;
}>();

const formattedDate = computed(() => {
  const d = new Date(props.date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) {
    return time;
  } else {
    const date = d.toLocaleDateString([], {
      day: "numeric",
      month: "numeric",
      year: "2-digit",
    });
    return `${date}, ${time}`;
  }
});
</script>

<style scoped>
.chat-bubble {
  padding: 0.6rem 0.8rem;
  margin-top: 0.1rem;
  margin-bottom: 0.1rem;
  border-radius: 0.8rem;
  max-width: 100%;
  min-width: 10rem;
  margin-bottom: 0.5rem;
  width: min-content;
  font-size: 0.9rem;
  line-height: 1.2;
  position: relative;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.08);
  animation: bubble-pop 0.45s cubic-bezier(0.4, 1.6, 0.4, 1) both;
  word-break: break-word;
}
.chat-bubble-date {
  display: flex;
  flex-direction: row;
  padding-right: 0.5rem;
  font-size: 0.8rem;
  color: #8ea6d6;
}
.chat-bubble.left {
  background: linear-gradient(90deg, #8b44d6c1 65%, #d65bff9d 100%);
  align-self: flex-start;
}
.chat-bubble.right {
  background: linear-gradient(90deg, #4466d6b8 65%, #5ba8ff9d 100%);
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
  border-top-color: #8b44d6c1;
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
  border-top-color: #5ba8ff9d;
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
