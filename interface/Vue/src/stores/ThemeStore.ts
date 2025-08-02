import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

/**
 * ThemeStore – gère le thème de l'application (light / dark) et le persiste
 * dans localStorage.  
 * Un attribut `data-theme` est appliqué sur <html> pour faciliter le CSS.
 */
export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'app-theme';

  // État
  const theme = ref<Theme>('dark');

  // Restaure la préférence sauvegardée
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') {
    theme.value = saved;
  }

  // Actions
  function setTheme(t: Theme) {
    theme.value = t;
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  // Effet secondaire : persiste et applique sur le DOM
  watch(theme, (newVal) => {
    localStorage.setItem(STORAGE_KEY, newVal);
    document.documentElement.setAttribute('data-theme', newVal);
  }, { immediate: true });

  return { theme, setTheme, toggleTheme };
});
