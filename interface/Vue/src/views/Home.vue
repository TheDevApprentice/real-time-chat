<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <div class="relative w-full h-full overflow-hidden">
            <div class="auth-bg-container">
              <span class="auth-bg-circle circle-1"></span>
              <span class="auth-bg-circle circle-2"></span>
            </div>
            <div class="relative z-10 flex w-[100vw] h-[100vh]">
              <!-- Primary Sidebar -->
              <nav
                class="group relative flex-shrink-0 border transition-all duration-300 ease-in-out w-16 hover:w-56"
              >
                <div class="w-full h-full flex items-start">
                  <div class="flex flex-row items-center mt-8">
                    <LargeAvatar avatar="🤖" name="Bot Hugo" />
                    <h1 class="text-2xl font-bold ml-2">Hugo</h1>
                  </div>
                </div>
              </nav>
              <!-- Zone de chat -->
              <section class="flex-1">
                <div
                  class="flex flex-col gap-4 mt-[4.5rem] rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in"
                >
                  <ChatHeader avatar="🤖" name="Bot Mélanie" :active="true" />
                  <ChatBubble
                    v-for="(bubble, idx) in chatBubbles"
                    :key="idx"
                    :speaker="bubble.speaker"
                    :text="bubble.text"
                    :date="bubble.date"
                    :isTyping="bubble.isTyping"
                    :isWriting="bubble.isWriting"
                    :animationDelay="`${idx * 0.22}s`"
                  />
                  <BarChat />
                </div>
              </section>
            </div>
          </div>
        </template>
      </PageTemplate>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../components/LoadingOverlay.vue";
import LargeAvatar from "../components/LargeAvatar.vue";
import { reactive, nextTick, onMounted, ref, defineAsyncComponent } from "vue";
import type { Bubble } from "../components/chat/bubbleChat/ChatBubble.vue";
import { useAuthStore } from "../stores/AuthStore";

const ChatBubble = defineAsyncComponent(
  () => import("../components/chat/bubbleChat/ChatBubble.vue")
);
const BarChat = defineAsyncComponent(
  () => import("../components/chat/barChat/BarChat.vue")
);
const ChatHeader = defineAsyncComponent(
  () => import("../components/chat/headerChat/ChatHeader.vue")
);
const PageTemplate = defineAsyncComponent(
  () => import("../components/PageTemplate.vue")
);
const authStore = useAuthStore();
const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const typedChat = ref("");
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
];

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
        isTyping: true,
        isWriting: false,
      };
      chatBubbles.push(bubble);
      await nextTick();
      bubble.isTyping = false;
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
</script>

<style scoped></style>
