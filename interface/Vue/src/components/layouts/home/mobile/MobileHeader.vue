<template>
  <!-- Header mobile amélioré -->
  <div
    v-if="authStore.isAuthenticated"
    class="relative flex items-center justify-between w-full px-2 py-1 rounded-t-2xl shadow-lg bg-gradient-to-r from-[var(--background)]/80 via-[var(--background-secondary)]/60 to-[var(--background)]/80 border-b border-[var(--color-text)]/10 md:hidden backdrop-blur-lg"
    style="backdrop-filter: blur(16px)"
  >
    <div class="flex items-center gap-3">
      <div class="relative">
        <Avatar
          avatar="🤖"
          :name="currentUser"
          :isOnline="true"
          :show-badge="true"
        />
      </div>
    </div>
    <div class="w-full z-10 md:flex lg:flex">
      <div class="header-actions">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@stores/AuthStore";
import Avatar from "@ui/avatars/Avatar.vue";
import ThemeSwitcher from "@ui/ThemeSwitcher.vue";
import LanguageSwitcher from "@ui/LanguageSwitcher.vue";

const authStore = useAuthStore();
const currentUser = authStore.user;
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-self: flex-end;
  align-self: flex-start;
  gap: 0.7rem;
  z-index: 50;
  position: fixed;
  padding: 1.3rem 2.2rem 0.5rem 0;
  top: -1.1rem;
  right: -1.4rem;
}
</style>
