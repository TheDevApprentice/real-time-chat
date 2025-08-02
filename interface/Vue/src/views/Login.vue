<template>
  <PageTemplate>
    <template #content>
      <div class="auth-header-text">
        <h1 class="auth-title">Bienvenue sur Real-Time Chat</h1>
        <p class="auth-subtitle">Rejoignez la conversation en direct</p>
      </div>
      <div class="auth-wrapper">
        <div class="auth-bg-container">
          <span class="auth-bg-circle circle-1"></span>
          <span class="auth-bg-circle circle-2"></span>
        </div>
        <div class="auth-card">
          <!-- Header/avatar stylisé -->
          <div class="flex justify-center -mt-4 mb-3">
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
        </div>
        <div class="chat-preview">
          <!-- Chat header with avatar, name and close button -->
          <div class="chat-header-preview">
            <div class="chat-header-avatar">
              <span>🤖</span>
            </div>
            <span class="chat-header-name">Bot Mélanie</span>
            <button class="chat-header-close" aria-label="Fermer" disabled>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div
            v-for="(bubble, idx) in chatBubbles"
            :key="idx"
            :class="[
              'chat-bubble',
              bubble.speaker === 0
                ? 'left bubble-enter-left'
                : 'right bubble-enter-right',
            ]"
            :style="{ animationDelay: `${idx * 0.22}s` }"
          >
            <span v-if="bubble.isTyping" class="typing-dots">
              <span class="dot">.</span><span class="dot">.</span
              ><span class="dot">.</span>
            </span>
            <span v-else>
              <span
                class="typewriter"
                :style="{ '--typewriter-chars': bubble.text.length }"
              >
                {{ bubble.text }}
              </span>
            </span>
          </div>
          <div class="chat-bar-image-row">
            <button type="button" class="image-btn" aria-label="Envoyer une image" disabled>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="5" width="16" height="12" rx="2.5" stroke="currentColor" stroke-width="1.7" />
                <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" />
                <path d="M4 15L9 10L13.5 14L16 11L18 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="chat-bar chat-bar-redesign">
              <input
                type="text"
                class="chat-input"
                placeholder="Message"
                disabled
              />
              <button type="submit" class="send-btn send-btn-redesign" aria-label="Envoyer" disabled>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M2 11L20 2L11 20L10 13L2 11Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </template>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import PageTemplate from "../components/PageTemplate.vue";

const mode = ref<"login" | "register">("login");
const username = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const error = ref("");

// simulate chat conversation with typewriter effect
interface Bubble {
  speaker: number;
  text: string;
  isTyping?: boolean;
  isWriting?: boolean;
}
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
onMounted(async () => {
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

/* elevate card above background shapes */
.auth-card {
  position: relative;
  z-index: 1;
  width: 360px;
}

.auth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--page-bg-card);
  border-radius: 2.5rem;
  box-shadow: 0 0 32px 0 rgba(68, 102, 214, 0.1),
    0 1.5px 8px 0 rgba(178, 190, 231, 0.08);
  backdrop-filter: blur(16px);
  border: 1.5px solid rgba(68, 102, 214, 0.1);
  padding: 2.5rem 1.5rem 2rem 1.5rem;
  animation: card-fade-slide-in 0.7s cubic-bezier(0.4, 1.3, 0.4, 1) both;
  position: relative;
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

/* Chat preview container */
.chat-preview {
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
.chat-bar {
  display: flex;
  gap: 0.8rem;
}
.chat-bar.text {
  flex: 1;
  border-radius: 0.8rem;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.13);
  padding: 0.1rem 0.2rem;
  margin: 0.1rem;
}
.chat-bar.btn {
  width: 48px;
}
.send-btn {
  background: var(--page-accent-color, #4466d644);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background 0.2s;
  cursor: pointer;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.13);
}
.send-btn:hover {
  background: #2b3e7a;
}
.send-btn svg {
  display: block;
}
.chat-bubble {
  padding: 0.6rem 0.8rem;
  margin: 0.1rem 0.1rem;
  border-radius: 0.8rem;
  max-width: 100%;
  width: min-content;
  font-size: 0.9rem;
  line-height: 1.2;
  position: relative;
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

.chat-bubble.left {
  background: rgba(115, 84, 139, 0.363);
  align-self: flex-start;
}
.chat-bubble.right {
  background: rgba(68, 102, 214, 0.3);
  color: #fff;
  align-self: flex-end;
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

.typewriter-cursor {
  display: inline-block;
  width: 1ch;
  color: var(--page-accent-color, #90caf9);
  animation: blink-cursor 0.7s steps(1) infinite;
  font-weight: 700;
  font-size: 1.08em;
  vertical-align: baseline;
}

@keyframes blink-cursor {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
.chat-bar.chat-bar-redesign {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.08);
  border-radius: 1.2rem;
  padding: 0.22rem 0.36rem 0.22rem 0.8rem;
  box-shadow: 0 2px 8px 0 rgba(68,102,214,0.10);
  margin-top: 0.7rem;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eee;
  font-size: 1.03em;
  padding: 0.7em 0.2em;
  border-radius: 1.1rem;
  box-shadow: none;
  transition: background 0.18s;
}
.chat-input:focus {
  background: rgba(255,255,255,0.12);
}
.chat-input::placeholder {
  color: #bbb;
  opacity: 1;
  font-style: italic;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.09);
}

.send-btn.send-btn-redesign {
  margin-left: 0.15rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px 0 rgba(68, 102, 214, 0.18);
  border: none;
  transition: background 0.18s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.75;
}
.send-btn-redesign svg {
  display: block;
}

.chat-header-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.18rem 0.35rem 0.18rem 0.12rem;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.163);
  border-radius: 1.1rem;
  box-shadow: 1px 1px 12px 0 rgba(68, 102, 214, 0.566);
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
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.13);
  margin-right: 0.3rem;
}
.chat-header-name {
  font-weight: 600;
  color: #f4f4f4;
  font-size: 1.08em;
  letter-spacing: 0.01em;
  flex: 1;
  text-shadow: 0 1px 2px rgba(0,0,0,0.09);
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

.chat-bar-image-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
}

.image-btn {
  margin-top: 0.6rem;
  margin-right: 0.1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  color: #77aaff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px 0 rgba(68,102,214,0.09);
  border: none;
  transition: background 0.16s, color 0.13s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.8;
}
.image-btn svg {
  display: block;
}

</style>
