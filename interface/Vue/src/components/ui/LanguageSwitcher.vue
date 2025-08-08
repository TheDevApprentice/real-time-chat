<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLanguageStore } from '@/stores/LanguageStore'
// import { useAuthStore } from '../stores/AuthStore'

// Store Pinia
const languageStore = useLanguageStore()
// const authStore = useAuthStore()

// Applique automatiquement le thème stocké dans les préférences utilisateur
// watch(
//   () => authStore.preferences,
//   (prefs) => {
//     if (!prefs) return;
//     let prefLang;
//     if (Array.isArray(prefs)) {
//       prefLang = prefs.length ? prefs[0]?.language : undefined;
//     } else {
//       prefLang = prefs.language;
//     }
//     if (prefLang === 'fr' || prefLang === 'en') {
//       languageStore.setLanguage(prefLang);
//     }
//   },
//   { immediate: true, deep: true }
// )

const fallback = ref<'fr' | 'en'>('fr')

const currentLang = computed<"fr" | "en">({
  get: () => (languageStore ? languageStore.lang : fallback.value) as 'fr' | 'en',
  set: (val) => {
    if (languageStore && languageStore.setLanguage) {
      languageStore.setLanguage(val)
    } else {
      fallback.value = val as 'fr' | 'en'
    }
  }
})

function toggleLanguage() {
  currentLang.value = currentLang.value === 'fr' ? 'en' : 'fr'
}
</script>

<template>
  <button
    class="lang-toggle"
    @click="toggleLanguage"
    :aria-label="currentLang === 'fr' ? 'Switch to English' : 'Passer en français'"
  >
    <!-- Affiche un flag ou abréviation selon la langue courante -->
    <span v-if="currentLang === 'fr'">🇫🇷</span>
    <span v-else>🇬🇧</span>
  </button>
</template>

<style scoped>
.lang-toggle {
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

.lang-toggle:hover {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
}

.lang-toggle:hover span {
  transform: scale(1.15) rotate(8deg);
}

.lang-toggle span {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: var(--color-text);
  font-size: 18px;
  transition: transform 0.35s ease;
}
</style>
