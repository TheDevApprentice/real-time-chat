<template>
  <div class="page-template-header">
    <div class="header-actions">
      <ThemeSwitcher />
      <LanguageSwitcher />
    </div>
  </div>
  <div class="page-template">
    <slot name="content" />
  </div>
</template>

<script setup lang="ts">
import ThemeSwitcher from "./ThemeSwitcher.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
// No logic needed for this template
</script>

<style scoped>
.page-template-header {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 1.3rem 2.2rem 0.5rem 0;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
}
.header-actions {
  display: flex;
  gap: 0.7rem;
}
.page-template {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--color-background);
}
</style>
