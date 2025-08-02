<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goToParams() {
  router.push('/parametres')
}
</script>
<template>
  <button class="top-btn" @click="goToParams" title="Paramètres">
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.14,12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5,0,0,0,.12-.65l-1.92-3.32a.5.5,0,0,0-.61-.22l-2.39,1a7.03,7.03,0,0,0-1.62-.94l-.36-2.53A.5.5,0,0,0,14,2h-4a.5.5,0,0,0-.5.42l-.36,2.53a7.03,7.03,0,0,0-1.62.94l-2.39-1a.5.5,0,0,0-.61.22l-1.92,3.32a.5.5,0,0,0,.12.65l2.03,1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03,1.58a.5.5,0,0,0-.12.65l1.92,3.32a.5.5,0,0,0,.61.22l2.39-1c.5.36,1.04.67,1.62.94l.36,2.53A.5.5,0,0,0,10,22h4a.5.5,0,0,0,.5-.42l.36-2.53a7.03,7.03,0,0,0,1.62-.94l2.39,1a.5.5,0,0,0,.61-.22l1.92-3.32a.5.5,0,0,0-.12-.65ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
      />
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

/* Animate icon on hover */
.top-btn:hover svg {
  transform: rotate(25deg) scale(1.15);
}
.top-btn svg {
  width: 20px;
  height: 20px;
  fill: var(--color-text);
  transition: transform 0.35s ease;
}
</style>
