<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <!-- Version mobile/tablette : CardTemplate seul -->
          <div class="block md:hidden w-full justify-center items-center">
            <AuthCard
              :mode="mode.value"
              :tabs="[
                { id: 'login', text: 'Connexion' },
                { id: 'register', text: 'Créer mon compte' },
              ]"
              @update:mode="updateMode($event)"
              @submit="
                onSubmit(
                  authInformation.username,
                  authInformation.password,
                  authInformation.confirm,
                  authInformation.error
                )
              "
            />
          </div>
          <!-- Version desktop : tout le layout -->
          <div class="hidden md:block">
            <SearchBar :modelValue="searchQuery" @update:modelValue="updateSearchQuery($event)" placeholder="Rechercher" >
              <template v-if="searchQuery && filteredUsers.length > 0" #results>
                <SearchBarUserCard
                  v-for="user in filteredUsers"
                  :key="user.name"
                  :avatar="user.avatar"
                  :name="user.name"
                />
              </template>
              <template v-if="searchQuery && filteredUsers.length === 0" #no-result>
                <SearchBarUserCard :noresult="true" />
              </template>
            </SearchBar>
            <div class="auth-header-text improved-auth-header">
              <h1 class="auth-title gradient-title-v3">
                <span class="title-rt">{{ typedRealTime }}</span>
                <span class="title-chat-glow">
                  {{ typedChat
                  }}<span v-if="showCursor" class="typewriter-cursor">|</span>
                  <span class="glow-anim"></span>
                </span>
              </h1>
              <p class="auth-subtitle subtitle-fadein">
                Rejoignez la conversation en direct
              </p>
            </div>
            <div class="auth-wrapper flex-col md:flex-row">
              <div class="auth-bg-container">
                <span class="auth-bg-circle circle-1"></span>
                <span class="auth-bg-circle circle-2"></span>
              </div>

              <div class="flex flex-col">
                <div v-if="showChat" class="demo-large-avatars md:flex">
                  <LargeAvatar avatar="🤖" name="Bot Hugo" :mode="mode.value" />
                  <LargeAvatar
                    avatar="🧛"
                    name="Bot Lidya"
                    :mode="mode.value"
                  />
                  <LargeAvatar
                    avatar=""
                    name="Bot Christine"
                    :mode="mode.value"
                  />
                  <LargeAvatar
                    avatar=""
                    name="Bot Frédéric"
                    :mode="mode.value"
                  />
                  <LargeAvatar
                    avatar="🕵"
                    name="Bot Mistery"
                    :mode="mode.value"
                  />
                </div>
                <div v-if="showChat" class="demo-avatars md:flex">
                  <ChatHeader avatar="🤖" name="Bot Hugo" :active="true" />
                  <ChatHeader avatar="🧛" name="Bot Lidya" :active="true" />
                  <ChatHeader avatar="🤡" name="Bot Christine" :active="true" />
                  <ChatHeader avatar="🐺" name="Bot Frédéric" :active="true" />
                  <ChatHeader avatar="🕵" name="Bot Mistery" :active="true" />
                </div>
                <div v-if="showChat" class="demo-chat-items md:flex">
                  <UserConversationItem
                    :participants="[
                      { name: 'Bot Hugo', avatar: '🤖' },
                    ]"
                    title="Bot Hugo"
                    :lastMessage="{ text: 'Hello ! 😀', author: 'Bot Hugo', date: new Date().toISOString(), isMine: false, unread: true }"
                  />
                  <UserConversationItem
                    :participants="[
                      { name: 'Bot Lidya', avatar: '🧛' },
                    ]"
                    title="Bot Lidya"
                    :lastMessage="{ text: 'Hello ! 😀', author: 'Bot Lidya', date: (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString(); })(), isMine: false, unread: true }"
                  />
                </div>
              </div>
              <AuthCard
                :mode="mode.value"
                :tabs="[
                  { id: 'login', text: 'Connexion' },
                  { id: 'register', text: 'Créer mon compte' },
                ]"
                @update:mode="updateMode($event)"
                @submit="
                  onSubmit(
                    authInformation.username,
                    authInformation.password,
                    authInformation.confirm,
                    authInformation.error
                  )
                "
              />
              <div v-if="showChat" class="chat-preview hidden md:flex">
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
import { ref, onMounted, watch, nextTick, reactive, computed } from "vue";
import { defineAsyncComponent } from "vue";
import type { Bubble } from "../components/chat/bubbleChat/ChatBubble.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";

const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const searchQuery = ref("");
const typedChat = ref("");
const showCursor = ref(false);
const showChat = ref(false);

const users = [
  { name: "Bot Hugo", avatar: "🤖" },
  { name: "Bot Lidya", avatar: "🧛" },
  { name: "Bot Christine", avatar: "🤡" },
];

const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  return users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
watch(typedChat, (val) => {
  showCursor.value = val.length < chatFull.length;
});

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
const LargeAvatar = defineAsyncComponent(
  () => import("../components/LargeAvatar.vue")
);
const AuthCard = defineAsyncComponent(
  () => import("../components/auth/AuthCard.vue")
);
const UserConversationItem = defineAsyncComponent(
  () => import("../components/chat/UserConversationItem.vue")
);
const SearchBar = defineAsyncComponent(
  () => import("../components/SearchBar.vue")
);
const SearchBarUserCard = defineAsyncComponent(
  () => import("../components/SearchBarUserCard.vue")
);
const mode = reactive({ value: "login" });
const authInformation = reactive({
  username: "",
  email: "",
  password: "",
  confirm: "",
  error: "",
});

function updateMode(modeChanged: string) {
  console.log("Login Page mode changed : ", modeChanged);
  mode.value = modeChanged;
}
function updateSearchQuery(searchQueryChanged: string) {
  console.log("Login Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}
const chatBubbles = reactive<Bubble[]>([]);
const messages = [
  { text: "Hello ! 😀", speaker: 0, date: new Date().toLocaleDateString()},
  { text: "How are you ?", speaker: 1, date: new Date().toLocaleDateString()},
  { text: "Fine thx ! 😁", speaker: 0, date: new Date().toLocaleDateString()},
  { text: "Where do you want to go this we ? 😄", speaker: 1, date: new Date().toLocaleDateString()},
  { text: "I want to go to the beach ! 😃", speaker: 0, date: new Date().toLocaleDateString()},
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

function onSubmit(
  usernameReceived: string,
  passwordReceived: string,
  confirmReceived: string,
  errorReceived: string
) {
  authInformation.username = usernameReceived;
  authInformation.password = passwordReceived;
  authInformation.confirm = confirmReceived;
  authInformation.error = errorReceived;
  console.log("Auth information Login Page received : ", authInformation);
  if (mode.value === "register") {
    if (!usernameReceived || !passwordReceived || !confirmReceived) {
      authInformation.error = "Veuillez remplir tous les champs.";
      return;
    }
    if (passwordReceived !== confirmReceived) {
      authInformation.error = "Les mots de passe ne correspondent pas.";
      return;
    }
    // TODO: call register API/socket
  } else {
    if (!usernameReceived || !passwordReceived) {
      authInformation.error =
        "Veuillez entrer votre nom d'utilisateur et mot de passe.";
      return;
    }
    // TODO: call login API/socket
  }
}
</script>

<style scoped>
.auth-header-text {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-bottom: 1rem;
}

.auth-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--page-accent-color);
  margin: 0;
}

.auth-subtitle {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0.3rem 0 0;
}

.auth-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.auth-bg-container {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  z-index: 0;
}

.auth-bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.2;
  filter: blur(12px);
  animation: float 12s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  background: var(--page-btn-gradient-hover);
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -80px;
  left: -80px;
  background: var(--page-secondary-color);
}

/* floating animation for background shapes */
@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(20px) scale(1.1);
  }
}

.demo-large-avatars {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 1rem;
  position: absolute;
  top: -35%;
  left: -520px;
  animation: fade-in 0.9s ease-in-out;
}
.demo-avatars {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
  position: absolute;
  top: -15%;
  left: -520px;
  animation: fade-in 0.9s ease-in-out;
}
.demo-chat-items {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
  position: absolute;
  top: 70%;
  left: -520px;
  animation: fade-in 0.9s ease-in-out;
}

.chat-preview {
  position: absolute;
  top: -25%;
  right: -480px;
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

  animation: fade-in 0.9s ease-in-out;
}

@keyframes fade-in {
  from {
    position: absolute;
    top: 0.5%;
    right: -400px;
    opacity: 0;
  }
  to {
    position: absolute;
    top: 0.5%;
    right: -400px;
    opacity: 1;
  }
}

.improved-auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  margin-top: 1.4rem;
}
.gradient-title-v3 {
  font-family: "JetBrains Mono", "Fira Sans", "Segoe UI", Arial, sans-serif;
  font-size: 3.1rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
  position: relative;
  margin-bottom: 0.2em;
  line-height: 1.06;
  text-align: center;
  gap: 0.22em;
}
.title-rt {
  color: var(--page-accent-color, #b8d8ff);
  font-weight: 600;
  letter-spacing: -0.01em;
  font-size: 0.99em;
  filter: drop-shadow(0 2px 12px #4466d622);

  font-family: "JetBrains Mono", "Fira Sans", "Segoe UI", Arial, sans-serif;
  font-size: 3.1rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  justify-content: center;
  margin-bottom: 0.1em;
  line-height: 1.06;
  text-align: center;
}
.title-rt {
  color: var(--page-accent-color, #b8d8ff);
  font-weight: 600;
  letter-spacing: -0.01em;
  font-size: 0.95em;
  filter: drop-shadow(0 2px 12px #4466d622);
}
.title-chat-glow {
  position: relative;
  font-family: inherit;
  font-weight: 900;
  background: linear-gradient(90deg, #ffb86c 20%, #ff6bcb 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  filter: drop-shadow(0 0 18px #ffb86c88) brightness(1.07);
  padding: 0 0.12em;
  font-size: 1.14em;
  line-height: 1.1;
}
.title-chat-glow .glow-anim {
  position: absolute;
  left: 0;
  right: 0;
  height: 45%;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(ellipse at center, #ffb86c66 0%, #ff6bcb22 100%);
  filter: blur(10px);
  opacity: 0.7;
  animation: chatGlowAnim 2.5s infinite alternate;
}
@keyframes chatGlowAnim {
  0% {
    opacity: 0.7;
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    filter: blur(18px);
  }
}
.typewriter-cursor {
  display: inline-block;
  width: 0.7ch;
  color: #ffb86c;
  font-weight: 700;
  font-size: 1.13em;
  animation: blink 0.9s steps(1) infinite;
  margin-left: 0.02em;
  filter: drop-shadow(0 0 6px #ffb86cbb);
}
@keyframes blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.title-main {
  background: linear-gradient(
    90deg,
    var(--page-accent-color, #4466d6) 50%,
    #5b7fff 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  filter: drop-shadow(0 2px 16px #4466d655);
}
.title-chat-glow {
  position: relative;
  margin-left: 0rem;
  font-family: inherit;
  font-weight: 900;
  background: linear-gradient(90deg, #ffb86c 20%, #ff6bcb 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  filter: drop-shadow(0 0 18px #ffb86c88) brightness(1.07);
  padding: 0 0.12em;
}
.title-chat-glow .glow-anim {
  position: absolute;
  left: 0;
  right: 0;
  top: 60%;
  height: 45%;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(ellipse at center, #ffb86c66 0%, #ff6bcb22 100%);
  filter: blur(10px);
  opacity: 0.7;
  animation: chatGlowAnim 2.5s infinite alternate;
}
@keyframes chatGlowAnim {
  0% {
    opacity: 0.7;
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    filter: blur(18px);
  }
}
.subtitle-fadein {
  font-size: 1.13rem;
  color: var(--subtitle-color, #b3b3c8);
  margin-top: 0.5em;
  font-weight: 500;
  letter-spacing: 0.01em;
  animation: subtitleFadeIn 1.3s cubic-bezier(0.4, 1.6, 0.4, 1) both;
}
@keyframes subtitleFadeIn {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
</style>
