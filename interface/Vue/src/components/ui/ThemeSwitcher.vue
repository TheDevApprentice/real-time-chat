<script setup lang="ts">
// import { useAuthStore } from '../stores/AuthStore';
// import { watch } from 'vue'
import { useThemeStore } from '@/stores/ThemeStore';

// Access the global theme store
const themeStore = useThemeStore()
// const authStore = useAuthStore()

// Applique automatiquement le thème stocké dans les préférences utilisateur
// watch(
//   () => authStore.preferences,
//   (prefs) => {
//     if (!prefs) return;
//     let prefTheme;
//     if (Array.isArray(prefs)) {
//       prefTheme = prefs.length ? prefs[0]?.theme : undefined;
//     } else {
//       prefTheme = prefs.theme;
//     }
//     if (prefTheme === 'light' || prefTheme === 'dark') {
//       themeStore.setTheme(prefTheme);
//     }
//   },
//   { immediate: true, deep: true }
// )

function toggleTheme() {
  themeStore.toggleTheme()
}
</script>

<template>
  <button class="theme-toggle" @click="toggleTheme" :aria-label="themeStore.theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'">
    <!-- Moon icon for dark theme, Sun icon for light theme -->
    <svg v-if="themeStore.theme === 'light'" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M5.6 5.6l1.4 1.4" />
      <path d="M16.9 16.9l1.4 1.4" />
      <path d="M5.6 18.4l1.4-1.4" />
      <path d="M16.9 7.1l1.4-1.4" />
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.25s, box-shadow 0.25s;
}
.theme-toggle:hover {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
}

/* Animate icon on hover */
.theme-toggle:hover svg {
  transform: rotate(25deg) scale(1.15);
}
.theme-toggle svg {
  width: 20px;
  height: 20px;
  fill: var(--color-text);
  transition: transform 0.35s ease;
}
</style>
