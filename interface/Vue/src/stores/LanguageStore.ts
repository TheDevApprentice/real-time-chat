import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AppLanguage = 'fr' | 'en'

/**
 * LanguageStore – gère la langue de l’application (fr / en) et la persiste
 * dans localStorage. Une fois branché à un système d’i18n, il suffira de
 * déclencher la mise à jour de la locale dans le watch.
 */
export const useLanguageStore = defineStore('language', () => {
  const STORAGE_KEY = 'app-language'

  const lang = ref<AppLanguage>('fr')

  // Restaure la langue précédemment choisie
  const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null
  if (saved === 'fr' || saved === 'en') {
    lang.value = saved
  }

  /** Change la langue */
  function setLanguage(l: AppLanguage) {
    lang.value = l
  }

  /** Bascule fr ↔ en */
  function toggleLanguage() {
    lang.value = lang.value === 'fr' ? 'en' : 'fr'
  }

  // Persiste et, dans le futur, pourra déclencher i18n.global.locale = lang
  watch(lang, (newVal) => {
    localStorage.setItem(STORAGE_KEY, newVal)
    // Exemple futur : i18n.global.locale = newVal
  }, { immediate: true })

  return { lang, setLanguage, toggleLanguage }
})
