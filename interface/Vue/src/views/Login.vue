<template>
  <PageTemplate>
    <template #content>
      <div class="auth-card">
        <!-- Header/avatar stylisé -->
        <div class="flex justify-center -mt-8 mb-3">
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
    </template>
  </PageTemplate>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PageTemplate from "../components/PageTemplate.vue";

const mode = ref<"login" | "register">("login");
const username = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const error = ref("");

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
.auth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 340px;
  min-height: 390px;
  background: rgba(255, 255, 255, 0.6);
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
  background: none;
  color: var(--color-text-secondary);
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
  background: none;
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
  background: rgba(255, 255, 255, 0.75);
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
  border-color: var(--page-accent-color, #4466d6);
  background: rgba(240, 245, 255, 0.95);
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
  background: linear-gradient(90deg, #4466d6 0%, #a14a8a 100%);
  color: var(--btn-color-text, #fff);
  border: none;
  font-weight: 700;
  font-size: 1.13em;
  border-radius: 1.1rem;
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.1);
  padding: 0.95em 0;
  margin-top: 0.3em;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
  width: 100%;
  letter-spacing: 0.01em;
  outline: none;
}

.auth-btn:hover,
.auth-btn:focus {
  background: linear-gradient(90deg, #3c5ac4 0%, #b14b8a 100%);
  box-shadow: 0 4px 16px 0 rgba(68, 102, 214, 0.16);
  transform: translateY(-2px) scale(1.025);
}

.auth-btn:active {
  filter: brightness(0.97);
  transform: scale(0.99);
}

.auth-error {
  color: var(--error-color, #e23c3c);
  background: #fff5f5;
  border: 1px solid #ffd4d4;
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
</style>
