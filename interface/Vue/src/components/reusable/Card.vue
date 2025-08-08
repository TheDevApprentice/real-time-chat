<template>
  <div class="auth-card">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Pas de logique JS ici, composant purement visuel
</script>

<style scoped>
/* elevate card above background shapes */
.auth-card {
  z-index: 1;
  height: 100%;
  min-height: 450px;
  width: 360px;
}

.auth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--page-bg-card);
  border-radius: 2.5rem;
  box-shadow: 0 0 32px 0 rgba(68, 102, 214, 0.1),
    0 1.5px 8px 0 rgba(178, 190, 231, 0.08);
  backdrop-filter: blur(16px);
  border: 1.5px solid rgba(68, 102, 214, 0.1);
  padding: 2.5rem 1.5rem 2rem 1.5rem;
  animation: card-fade-slide-in 0.7s cubic-bezier(0.4, 1.3, 0.4, 1) both;
}
</style>
