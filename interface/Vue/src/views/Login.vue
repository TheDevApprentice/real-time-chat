<template>
  <Suspense>
    <template #default>
      <PageTemplate>
        <template #content>
          <!-- Version mobile/tablette : CardTemplate seul -->
          <div class="block md:hidden w-full flex justify-center items-center min-h-screen">
            <CardTemplate>
              <!-- Header/avatar stylisé -->
              <div class="flex justify-center">
                <div
                  class="avatar-glass rounded-full shadow-lg flex items-center justify-center border-2 border-[var(--page-accent-color)]"
                  style="
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.16);
                    backdrop-filter: blur(8px);
                  "
                >
                  <svg
                    width="32"
                    height="32"
                    fill="none"
                    stroke="var(--page-accent-color, #4466d6)"
                    stroke-width="2.2"
                    viewBox="0 0 48 48"
                  >
                    <circle cx="24" cy="18" r="10" />
                    <ellipse cx="24" cy="36" rx="16" ry="8" />
                  </svg>
                </div>
              </div>
              <div class="auth-tabs-container">
                <div class="auth-tabs">
                  <button
                    :class="['auth-tab', mode === 'login' ? 'active' : '']"
                    @click="mode = 'login'"
                  >
                    Connexion
                  </button>
                  <button
                    :class="['auth-tab', mode === 'register' ? 'active' : '']"
                    @click="mode = 'register'"
                  >
                    Créer un compte
                  </button>
                </div>
              </div>
              <form @submit.prevent="onSubmit" class="auth-form">
                <div class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                      </svg>
                    </span>
                    <input
                      id="username"
                      v-model="username"
                      type="text"
                      required
                      :placeholder="
                        mode === 'login'
                          ? 'Nom d\'utilisateur'
                          : 'Choisissez un nom d\'utilisateur'
                      "
                      class="auth-input"
                    />
                  </div>
                </div>
                <div class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="password"
                      v-model="password"
                      type="password"
                      required
                      placeholder="Mot de passe"
                      class="auth-input"
                    />
                  </div>
                </div>
                <div v-if="mode === 'register'" class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="confirm"
                      v-model="confirm"
                      type="password"
                      required
                      placeholder="Confirmer le mot de passe"
                      class="auth-input"
                    />
                  </div>
                </div>
                <button type="submit" class="auth-btn">
                  {{ mode === "login" ? "Se connecter" : "Créer un compte" }}
                </button>
                <p v-if="error" class="auth-error">{{ error }}</p>
              </form>
            </CardTemplate>
          </div>
          <!-- Version desktop : tout le layout -->
          <div class="hidden md:block">
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
              <div v-if="showChat" class="demo-avatars md:flex">
                <ChatHeader avatar="🤖" name="Bot Hugo" :active="true" />
                <ChatHeader avatar="🧛" name="Bot Lidya" :active="true" />
                <ChatHeader avatar="🤡" name="Bot Christine" :active="true" />
                <ChatHeader avatar="🐺" name="Bot Frédéric" :active="true" />
              </div>
              <CardTemplate>
              <!-- Header/avatar stylisé -->
              <div class="flex justify-center">
                <div
                  class="avatar-glass rounded-full shadow-lg flex items-center justify-center border-2 border-[var(--page-accent-color)]"
                  style="
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.16);
                    backdrop-filter: blur(8px);
                  "
                >
                  <svg
                    width="32"
                    height="32"
                    fill="none"
                    stroke="var(--page-accent-color, #4466d6)"
                    stroke-width="2.2"
                    viewBox="0 0 48 48"
                  >
                    <circle cx="24" cy="18" r="10" />
                    <ellipse cx="24" cy="36" rx="16" ry="8" />
                  </svg>
                </div>
              </div>
              <div class="auth-tabs-container">
                <div class="auth-tabs">
                  <button
                    :class="['auth-tab', mode === 'login' ? 'active' : '']"
                    @click="mode = 'login'"
                  >
                    Connexion
                  </button>
                  <button
                    :class="['auth-tab', mode === 'register' ? 'active' : '']"
                    @click="mode = 'register'"
                  >
                    Créer un compte
                  </button>
                </div>
              </div>
              <form @submit.prevent="onSubmit" class="auth-form">
                <div class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                      </svg>
                    </span>
                    <input
                      id="username"
                      v-model="username"
                      type="text"
                      required
                      :placeholder="
                        mode === 'login'
                          ? 'Nom d\'utilisateur'
                          : 'Choisissez un nom d\'utilisateur'
                      "
                      class="auth-input"
                    />
                  </div>
                </div>
                <div class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="password"
                      v-model="password"
                      type="password"
                      required
                      placeholder="Mot de passe"
                      class="auth-input"
                    />
                  </div>
                </div>
                <div v-if="mode === 'register'" class="auth-field">
                  <div class="input-group">
                    <span class="auth-icon">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="confirm"
                      v-model="confirm"
                      type="password"
                      required
                      placeholder="Confirmer le mot de passe"
                      class="auth-input"
                    />
                  </div>
                </div>
                <button type="submit" class="auth-btn">
                  {{ mode === "login" ? "Se connecter" : "Créer un compte" }}
                </button>
                <p v-if="error" class="auth-error">{{ error }}</p>
              </form>
            </CardTemplate>
            <div v-if="showChat" class="chat-preview hidden md:flex">
              <!-- Chat header with avatar, name and close button -->
              <ChatHeader avatar="🤖" name="Bot Mélanie" :active="true" />
              <ChatBubble
                v-for="(bubble, idx) in chatBubbles"
                :key="idx"
                :speaker="bubble.speaker"
                :text="bubble.text"
                :isTyping="bubble.isTyping"
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
import { ref, onMounted, watch, nextTick } from "vue";
import { defineAsyncComponent } from "vue";
import type { Bubble } from "../components/chat/bubbleChat/ChatBubble.vue";
import Avatar from "../components/chat/headerChat/Avatar.vue";

const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const typedChat = ref("");
const showCursor = ref(false);
const showChat = ref(false);

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
const CardTemplate = defineAsyncComponent(
  () => import("../components/ui/CardTemplate.vue")
);

import LoadingOverlay from "../components/LoadingOverlay.vue";

const mode = ref<"login" | "register">("login");
const username = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const error = ref("");

const chatBubbles = ref<Bubble[]>([]);
const messages = [
  { text: "Hello ! 😀", speaker: 0 },
  { text: "How are you ?", speaker: 1 },
  { text: "Fine thx ! 😁", speaker: 0 },
  { text: "Where do you want to go this we ? 😄", speaker: 1 },
  { text: "I want to go to the beach ! 😃", speaker: 0 },
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

  for (let i = 0; i < messages.length + 1; i++) {
    const msg = messages[i];
    if (msg.speaker === 0) {
      const bubble: Bubble = {
        speaker: msg.speaker,
        text: "",
        isTyping: true,
        isWriting: false,
      };
      chatBubbles.value.push(bubble);
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
        isTyping: false,
        isWriting: true,
      };
      chatBubbles.value.push(bubble);
      await nextTick();
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

function onSubmit() {
  error.value = "";
  if (mode.value === "register") {
    if (!username.value || !email.value || !password.value || !confirm.value) {
      error.value = "Veuillez remplir tous les champs.";
      return;
    }
    if (password.value !== confirm.value) {
      error.value = "Les mots de passe ne correspondent pas.";
      return;
    }
    // TODO: call register API/socket
  } else {
    if (!username.value || !password.value) {
      error.value = "Veuillez entrer votre nom d'utilisateur et mot de passe.";
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

/* chat bubble decorations */
.auth-bg-chat {
  position: absolute;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.15);
  /* filter: blur(4px); */
  /* mix-blend-mode: overlay; */
  animation: float 8s ease-in-out infinite;
  z-index: 0;
}
.auth-bg-chat.chat-1 {
  width: 100px;
  height: 60px;
  top: 40%;
  left: 90%;
}
.auth-bg-chat.chat-1::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 20px;
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.1) transparent;
}
.auth-bg-chat.chat-2 {
  width: 80px;
  height: 50px;
  bottom: 30%;
  right: 50%;
}
.auth-bg-chat.chat-2::after {
  content: "";
  position: absolute;
  top: -8px;
  right: 15px;
  border-width: 0 8px 8px;
  border-style: solid;
  border-color: transparent transparent rgba(255, 255, 255, 0.1);
}

.avatar-glass {
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.13);
}

.auth-tabs-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.auth-tabs {
  display: flex;
  position: relative;
  gap: 1rem;
}

.auth-tab {
  flex: 1 1 0;
  padding: 0.7em 0;
  font-weight: 600;
  color: var(--color-text);
  border: none;
  border-bottom: 2.5px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  font-size: 1.08em;
  position: relative;
  outline: none;
}

.auth-tab.active {
  color: var(--color-text);
  border-bottom: 2.5px solid var(--page-accent-color, #4466d6);
}

.auth-tab-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 2.5px;
  background: var(--page-btn-gradient, #4466d6);
  border-radius: 2px;
  transition: left 0.25s cubic-bezier(0.4, 1.3, 0.4, 1);
  z-index: 2;
}

.auth-form {
  background: transparent;
  box-shadow: none;
  border-radius: 1.5rem;
  padding: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  align-items: center;
}

.auth-field {
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 1.1rem;
  padding: 0.1em 0.8em 0.1em 0.3em;
  box-shadow: 0 1.5px 8px 0 rgba(68, 102, 214, 0.07);
  transition: border 0.22s, box-shadow 0.22s, background 0.22s;
  margin-bottom: 0.1em;
  min-height: 2.7em;
  width: 100%;
  position: relative;
}

.auth-field:focus-within {
  border-color: var(--input-focus-border, #4466d6);
  background: var(--input-focus-bg);
  box-shadow: 0 0 0 2.5px var(--input-focus-shadow, #c7d6fc),
    0 2px 12px 0 rgba(68, 102, 214, 0.07);
  z-index: 2;
}

.input-group {
  display: flex;
  align-items: center;
  width: 100%;
}

.auth-icon {
  margin-right: 0.5em;
  color: var(--page-accent-color, #4466d6);
  display: flex;
  align-items: center;
}

.auth-input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 1.08em;
  color: var(--page-text-color);
  padding: 0.6em 0.2em;
  font-family: inherit;
}

.auth-btn {
  background: var(--page-btn-gradient);
  color: var(--btn-color-text, #fff);
  border: none;
  font-weight: 700;
  font-size: 1.13em;
  border-radius: 1.1rem;
  box-shadow: 0 2px 12px 0 var(--page-btn-shadow);
  padding: 0.95em 0;
  margin-top: 0.3em;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
  width: 100%;
  letter-spacing: 0.01em;
  outline: none;
}

.auth-btn:hover,
.auth-btn:focus {
  background: var(--page-btn-gradient-hover);
  box-shadow: 0 4px 16px 0 var(--page-btn-shadow-hover);
  transform: translateY(-2px) scale(1.025);
}

.auth-btn:active {
  filter: brightness(0.97);
  transform: scale(0.99);
}

.auth-error {
  color: var(--error-color, #e23c3c);
  background: var(--input-focus-bg);
  border: 1px solid var(--input-focus-border);
  border-radius: 7px;
  padding: 0.5em 0.9em;
  font-size: 1em;
  width: 100%;
  text-align: center;
  margin-top: 0.2em;
}

@media (max-width: 600px) {
  .auth-card {
    min-height: 100vh;
    padding: 0.7rem 0.2rem 0.7rem 0.2rem;
    border-radius: 1.2rem;
  }
  .auth-form {
    min-width: 0;
    padding: 0;
    border-radius: 1.2rem;
  }
}

/* Animation d'apparition de la carte */
@keyframes card-fade-slide-in {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
.card-fade-slide-enter-active {
  animation: card-fade-slide-in 0.7s cubic-bezier(0.4, 1.3, 0.4, 1);
}
.card-fade-slide-leave-active {
  opacity: 0;
  transition: opacity 0.2s;
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

/* Chat bubble alignment */
.auth-bg-chat.chat-left {
  right: 8%;
  left: auto;
  background: rgba(255, 255, 255, 0.15);
}
.auth-bg-chat.chat-left::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 20px;
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.15) transparent;
}
.auth-bg-chat.chat-right {
  right: 8%;
  left: auto;
  background: rgba(68, 102, 214, 0.3);
}
.auth-bg-chat.chat-right::after {
  content: "";
  position: absolute;
  bottom: -8px;
  right: 20px;
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.15) transparent;
}

.demo-avatars {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
  position: absolute;
  left: -520px;

  animation: fade-in 0.9s ease-in-out;
}

/* Chat preview container */
.chat-preview {
  position: absolute;
  right: -400px;
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
