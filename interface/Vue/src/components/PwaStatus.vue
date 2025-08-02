<template>
  <transition name="fade">
    <div v-if="show" class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-4 py-2 rounded-xl shadow-xl bg-[var(--page-accent-color,#4466d6)] text-white font-semibold flex items-center gap-3 animate-bounce-in">
      <span v-if="offline">Vous êtes hors ligne.</span>
      <span v-else-if="needRefresh">
        Nouvelle version disponible.
        <button @click="updateServiceWorker" class="ml-3 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/40 font-bold">Mettre à jour</button>
      </span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const offline = ref(!navigator.onLine);
const needRefresh = ref(false);
const show = ref(false);

const { updateServiceWorker } = useRegisterSW({
  onOfflineReady() {
    offline.value = false;
    show.value = false;
  },
  onNeedRefresh() {
    needRefresh.value = true;
    show.value = true;
  },
});

onMounted(() => {
  window.addEventListener('offline', () => {
    offline.value = true;
    show.value = true;
  });
  window.addEventListener('online', () => {
    offline.value = false;
    show.value = false;
  });
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.animate-bounce-in {
  animation: bounce-in 0.7s;
}
@keyframes bounce-in {
  0% { transform: scale(0.9) translateY(40px); opacity: 0; }
  60% { transform: scale(1.03) translateY(-6px); opacity: 1; }
  100% { transform: scale(1) translateY(0); }
}
</style>
