<template>
  <!-- Header mobile amélioré -->
  <div
    v-if="authStore.isAuthenticated"
    class="relative flex items-center justify-between w-full px-2 py-1 rounded-t-2xl shadow-lg bg-gradient-to-r from-[var(--background)]/80 via-[var(--background-secondary)]/60 to-[var(--background)]/80 border-b border-[var(--color-text)]/10 md:hidden backdrop-blur-lg"
    style="backdrop-filter: blur(16px)"
  >
    <div class="flex items-center gap-3">
      <div class="relative">
        <Avatar avatar="🤖" name="Hugo" :isOnline="true" />
      </div>
    </div>
    <button
      class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--background-secondary)]/60 hover:bg-[var(--background-secondary)]/90 shadow transition-all duration-200 ring-1 ring-[var(--color-primary)]"
      aria-label="Changer le thème"
    >
      <ThemeSwitcher class="text-xl" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "../../../../stores/AuthStore";
import Avatar from "../../../ui/avatars/Avatar.vue";
import ThemeSwitcher from "../../../ui/ThemeSwitcher.vue";

const authStore = useAuthStore();
</script>
