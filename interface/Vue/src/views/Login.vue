<template>
  <LoginLayout>
      <template #header>
        <!-- Header: visible md+ -->
        <div class="hidden md:flex flex-col items-center col-span-2">
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
      </template>
      <template #card>
        <LoginCard
          :mode="mode.value"
          :tabs="[
            { id: 'login', text: 'Connexion' },
            { id: 'register', text: 'Créer mon compte' },
          ]"
          :authInformation="authInformation"
          @update:mode="updateMode($event)"
          @submit="onSubmit"
        />
      </template>
      <template #preview-chat>
        <ChatPreview />
      </template>
  </LoginLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from "vue";
import { useAuthStore } from "@stores/AuthStore";
import { useRouter } from "vue-router";
import ChatPreview from "@components/login/ChatPreview.vue";
import LoginCard from "@components/login/LoginCard.vue";
import LoginLayout from "@components/layouts/login/LoginLayout.vue";

const realTimeFull = "Real‑Time";
const chatFull = "Chat";
const typedRealTime = ref("");
const typedChat = ref("");
const showCursor = ref(false);

watch(typedChat, (val) => {
  showCursor.value = val.length < chatFull.length;
});


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

onMounted(async () => {
  await AnimTypeTitle();
  await new Promise((res) => setTimeout(res, 200));
});

const authStore = useAuthStore();
const router = useRouter();

function onSubmit() {
  console.log("Auth information Login Page received : ", authInformation);
  if (mode.value === "register") {
    if (
      !authInformation.username ||
      !authInformation.password ||
      !authInformation.confirm
    ) {
      authInformation.error = "Veuillez remplir tous les champs.";
      return;
    }
    if (authInformation.password !== authInformation.confirm) {
      authInformation.error = "Les mots de passe ne correspondent pas.";
      return;
    }
    console.log(
      "Registering user : ",
      authInformation.username,
      authInformation.password,
      authInformation.confirm
    );
    authStore
      .register(
        authInformation.username,
        authInformation.password,
        authInformation.confirm
      )
      .then((success) => {
        if (!success) {
          authInformation.error =
            authStore.error || "Erreur lors de la création du compte";
        } else {
          authInformation.error =
            authStore.error || "Compte créé avec succès ! Connectez-vous.";
          mode.value = "login";
        }
      });
  } else {
    if (!authInformation.username || !authInformation.password) {
      authInformation.error =
        "Veuillez entrer votre nom d'utilisateur et mot de passe.";
      return;
    }
    authStore
      .login(authInformation.username, authInformation.password)
      .then((success) => {
        if (!success) {
          authInformation.error =
            authStore.error || "Erreur lors de la connexion";
        } else {
          authInformation.error = "";
          router.push("/home");
        }
      });
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
