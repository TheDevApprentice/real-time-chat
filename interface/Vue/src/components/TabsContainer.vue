<template>
  <Suspense>
    <template #default>
      <div class="auth-tabs-container">
        <div class="auth-tabs">
          <button v-for="tab in tabs"
            :class="['auth-tab', mode === tab.id ? 'active' : '']"
            @click="updateMode(tab.id)"
          >
            {{ tab.text }}
          </button>
        </div>
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "../components/LoadingOverlay.vue";

interface Tabs {
  id: string;
  text: string;
}
defineProps<{
  mode: "login" | "register";
  tabs: Tabs[];
}>();

const emit = defineEmits<{
  (e: "update:mode", mode: "login" | "register"): void;
}>();

function updateMode(mode: "login" | "register") {
  emit("update:mode", mode);
}
</script>

<style scoped>

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
  width: 100%;
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
</style>
