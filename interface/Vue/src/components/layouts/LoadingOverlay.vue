<template>
  <div class="loading-overlay">
    <div class="loader-container">
      <CircleLoader />
    </div>
    <div v-if="currentStage !== undefined && totalStages !== undefined" class="stage-info">
      <div class="stage-row">
        <span class="stage-dot"></span>
        <span class="stage-label">
          Étape <span class="stage-current">{{ currentStage.toString() }}</span
          ><span class="stage-sep"> / </span
          ><span class="stage-total">{{ totalStages.toString() }}</span
          ><span>
            :
            <span class="stage-desc">
              <!-- Animation typewriter sur le texte d'étape -->
              <span v-if="stageLabel">
                <span
                  v-for="(char, idx) in stageLabel"
                  :key="idx"
                  class="fadein-char"
                  :style="`--char-idx:${idx}`"
                  >{{ char }}</span
                >
              </span>
              <span v-else>{{ stageLabel }}</span>
            </span></span
          >
        </span>
        <!-- Ici j'aimerais rajouter une ligne avec une animation en boucle afin de dymaniser l'interface -->
      </div>
      <span class="loading-bar"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import CircleLoader from '../ui/loaders/CircleLoader.vue'

defineProps<{
  totalStages?: number
  currentStage?: number
  stageLabel?: string
}>()
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(
    --loading-spinner-background-overlay-color
  ); /* Faire une variable pour un background avec moins d'opacité pour cette page */
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  -webkit-backdrop-filter: blur(2px) saturate(100%);
  backdrop-filter: blur(5px) saturate(100%);
}
.loader-container {
  display: flex;
  gap: 16px;
  margin-bottom: 18px;
}

.stage-info {
  margin-top: 8px;
  font-size: 1.13em;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  font-family: 'JetBrains Mono', 'Fira Mono', 'Consolas', monospace;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  animation: fadeIn 0.5s;
  -webkit-backdrop-filter: blur(2px) saturate(100%);
  backdrop-filter: blur(2px) saturate(100%);
  background: var(
    --loading-spinner-background-stage-info-color
  ); /* Faire une variable pour un background pour cette élément de cette page qui en mode clair doit être sombre et en mode sombre doit être clair */
  padding: 1em;
  border-radius: 25px 25px 25px 25px;
  border-style: var(--loading-spinner-stage-info-border-style);
  border-color: var(
    --loading-spinner-stage-info-border-color
  ); /* Faire une variable pour un border color pour cette élément de cette page qui en mode clair doit être sombre et en mode sombre doit être clair */

  border-width: 0.5px;
  box-shadow: 0 2px 12px 0 var(--loading-spinner-stage-info-box-shadow-color); /* Faire une variable pour un box-shadow pour cette élément de cette page qui en mode clair doit être sombre et en mode sombre doit être clair */
  transition: box-shadow 0.22s;
}
stage-info-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
}
.stage-label {
  background: var(--loading-spinner-background-stage-info-label-color);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px var(--loading-spinner-stage-info-text-stroke-color);
  background-clip: text;
  text-shadow: 0 2px 10px var(--loading-spinner-stage-info-text-shadow-color);
  display: inline;
}

.stage-info .stage-label {
  padding: 0;
  border-radius: 0;
  position: static;
  display: inline;
}

.stage-info .stage-label > * {
  position: static;
  z-index: auto;
}

.stage-dot {
  grid-area: dot;
  width: 0.85em;
  height: 0.85em;
  border-radius: 50%;
  background: var(--loading-spinner-background-stage-dot);
  margin-right: 0.35em;
  box-shadow: var(--loading-spinner-stage-dot-box-shadow-color);
  animation: stageDotPulse 1.2s infinite alternate;
}

@keyframes stageDotPulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.18);
    opacity: 1;
  }
}

.stage-current {
  font-weight: 800;
}

.stage-total {
  /* opacity: 0.82; */
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.dot {
  opacity: 0.14;
  animation: dotFade 1.1s infinite;
  font-weight: bold;
  font-size: 1.25em;
  transition: opacity 0.18s;
}
.dot:nth-child(2) {
  animation-delay: 0s;
}
.dot:nth-child(3) {
  animation-delay: 0.22s;
}
.dot:nth-child(4) {
  animation-delay: 0.44s;
}
@keyframes dotFade {
  0% {
    opacity: 0.14;
  }
  15% {
    opacity: 1;
  }
  40% {
    opacity: 1;
  }
  60% {
    opacity: 0.14;
  }
  100% {
    opacity: 0.14;
  }
}

.loading-bar {
  width: 80%;
  height: 0.1rem;
  background: var(--loading-spinner-background-stage-info-label-color);
  background-size: 200% 100%;
  border-radius: 25px;
  animation: loadingBarAnim 1.9s ease-in-out infinite;
}
.stage-desc{
  
}
.fadein-char{
    
}
.stage-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
}

@keyframes loadingBarAnim {
  0% {
    background-position: 0% 0;
    opacity: 1;
  }
  50% {
    background-position: 100% 0;
    opacity: 0.7;
  }
  100% {
    background-position: 0% 0;
    opacity: 1;
  }
}
</style>
