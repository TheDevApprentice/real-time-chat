import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type FontSizeOption = 'small' | 'normal' | 'large'
export type DensityOption = 'compact' | 'standard' | 'spacious'

interface SavedPrefs {
  fontSize: FontSizeOption
  density: DensityOption
  highContrast: boolean
  reducedMotion: boolean
}

const STORAGE_KEY = 'app-display-prefs'

/**
 * DisplayStore – préférences d'affichage (accessibilité, densité, etc.)
 */
export const useDisplayStore = defineStore('display', () => {
  // ---- state
  const fontSize = ref<FontSizeOption>('normal')
  const density = ref<DensityOption>('standard')
  const highContrast = ref(false)
  const reducedMotion = ref(false)

  // ---- persistence helpers
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const json = JSON.parse(raw) as Partial<SavedPrefs>
        if (json.fontSize) fontSize.value = json.fontSize
        if (json.density) density.value = json.density
        if (typeof json.highContrast === 'boolean') highContrast.value = json.highContrast
        if (typeof json.reducedMotion === 'boolean') reducedMotion.value = json.reducedMotion
      }
    } catch {
      /* ignore parse errors */
    }
  }
  function saveToStorage() {
    const data: SavedPrefs = {
      fontSize: fontSize.value,
      density: density.value,
      highContrast: highContrast.value,
      reducedMotion: reducedMotion.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // ---- side-effects helpers
  function applyFontSize(fs: FontSizeOption) {
    const scale = fs === 'small' ? 0.9 : fs === 'large' ? 1.1 : 1
    document.documentElement.style.setProperty('--user-font-scale', String(scale))
  }
  function applyDensity(d: DensityOption) {
    const scale = d === 'compact' ? 0.9 : d === 'spacious' ? 1.15 : 1
    document.documentElement.style.setProperty('--user-density-scale', String(scale))
  }
  function applyHighContrast(val: boolean) {
    const el = document.documentElement;
    if (val) el.setAttribute('data-contrast', 'high');
    else el.removeAttribute('data-contrast');
  }
  function applyReducedMotion(val: boolean) {
    document.documentElement.setAttribute('data-motion', val ? 'reduced' : 'normal');
  }

  // ---- watchers
  watch(fontSize, (v) => {
    applyFontSize(v)
    saveToStorage()
  }, { immediate: true })

  watch(density, (v) => {
    applyDensity(v)
    saveToStorage()
  }, { immediate: true })

  watch(highContrast, (v) => {
    applyHighContrast(v)
    saveToStorage()
  }, { immediate: true })

  watch(reducedMotion, (v) => {
    applyReducedMotion(v)
    saveToStorage()
  }, { immediate: true })

  // ---- init
  loadFromStorage()

  // ---- expose
  return {
    fontSize,
    density,
    highContrast,
    reducedMotion,
  }
})
