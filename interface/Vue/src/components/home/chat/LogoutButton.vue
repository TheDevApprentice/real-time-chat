<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/AuthStore'
const router = useRouter()
const authStore = useAuthStore()
async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>
<template>
  <button class="top-btn" @click="logout" title="Déconnexion">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="16" height="20" rx="3"/>
      <path d="M16 12H8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <path d="M12.5 8.5L16 12L12.5 15.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</template>
<style scoped>
.top-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.25s,
    box-shadow 0.25s;
}
.top-btn:hover {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
}
.top-btn:hover svg {
  transform: rotate(-20deg) scale(1.13);
}
.top-btn svg {
  width: 20px;
  height: 20px;
  fill: var(--color-text);
  transition: transform 0.35s ease;
}
</style>
