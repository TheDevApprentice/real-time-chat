<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <div class="w-[100vw] h-[100vh]">
            <div class="z-10 flex">
              <!-- Primary Sidebar -->
              <nav
                class="flex-col h-[calc(100vh-0rem)] group flex-shrink-0 border transition-all duration-300 ease-in-out w-16 hover:w-56"
              >
                <div class="w-full flex flex-row gap-2 mt-8">
                  <LargeAvatar avatar="🤖" name="Bot Hugo" />
                  <h1
                    class="text-2xl font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Hugo
                  </h1>
                </div>
                <div class="h-2 bg-gray-200 mt-2 mb-2 h-[1px]"></div>
                <!-- Espacement divider -->
                <div class="w-full flex flex-row gap-2 mt-8">
                  <h1 class="mx-2">Rooms</h1>
                  <button
                    class="bg-gray-200 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    +
                  </button>
                </div>

                <div class="w-full flex flex-row gap-2 mt-8">
                  <LargeAvatar avatar="🤖" name="Bot Hugo" />
                  <h1
                    class="text-2xl font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Hugo
                  </h1>
                </div>
                <div class="w-full flex flex-row gap-2 mt-8">
                  <LargeAvatar avatar="🤖" name="Bot Hugo" />
                  <h1
                    class="text-2xl font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Hugo
                  </h1>
                </div>
              </nav>
              <!-- Zone de chat -->
              <section class="flex-1">
                <div
                  class="flex h-full w-full flex-col gap-4 mt-[4.5rem] rounded-xl bg-white/10 shadow-lg p-4 animate-fade-in"
                >
                  <ChatHeader avatar="🤖" name="Bot Mélanie" :active="true" />
                  <div
                    class="scroll-bar flex flex-col h-[calc(80vh-6rem)] overflow-y-auto scroll-w-0 scroll-h-0"
                  >
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
                  </div>
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
  {
    text: "Yes let's go  ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 0,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
    speaker: 1,
    date: new Date().toLocaleDateString(),
  },
  {
    text: "Awesome ! 😃",
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
        isTyping: false,
        isWriting: false,
      };
      chatBubbles.push(bubble);
      await nextTick();
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

<style scoped>
.scroll-bar {
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.scroll-bar::-webkit-scrollbar {
  display: none;
}
</style>
