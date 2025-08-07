<template>
  <Suspense>
    <template #default>
      <CardTemplate>
        <!-- Header/avatar stylisé -->
        <LargeAvatar :mode="mode" :isOnline="false" />
        <TabsContainer
          :mode="mode"
          @update:mode="updateMode($event)"
          :tabs="tabs"
        />
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
                v-model="authInformation.username"
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
                v-model="authInformation.password"
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
                v-model="authInformation.confirm"
                type="password"
                required
                placeholder="Confirmer le mot de passe"
                class="auth-input"
              />
            </div>
          </div>
          <button type="submit" class="auth-btn">
            {{ mode === "login" ? "Se connecter" : "Créer mon compte" }}
          </button>
          <p v-if="authInformation.error" class="auth-error">{{ authInformation.error }}</p>
        </form>
      </CardTemplate>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../layouts/LoadingOverlay.vue";
import type { Tabs } from "../reusable/TabsContainer.vue";
import { defineAsyncComponent } from "vue";

const CardTemplate = defineAsyncComponent(
  () => import("../reusable/Card.vue")
);
const LargeAvatar = defineAsyncComponent(
  () => import("../ui/avatars/LargeAvatar.vue")
);
const TabsContainer = defineAsyncComponent(
  () => import("../reusable/TabsContainer.vue")
);

const props = defineProps<{
  mode: string;
  tabs: Tabs[];
  authInformation: { username?: string, password?: string, confirm?: string, error?: string };
  onSubmit: () => void;
}>();

const emit = defineEmits<{
  (e: "update:mode", mode: string): void;
  (e: "submit"): void;
}>();

function updateMode(mode: string) {
  console.log("Auth Card mode changed : ", mode);
  console.log("Auth Card tab changed : ", props.tabs.find(tab => tab.id === mode)?.id);
  emit("update:mode", mode);
}

function onSubmit() {
  emit("submit");
}
</script>

<style scoped>

.auth-form {
  background: transparent;
  box-shadow: none;
  border-radius: 1.5rem;
  padding: 0;
  min-width: 0;
  height: 100%;
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
</style>
