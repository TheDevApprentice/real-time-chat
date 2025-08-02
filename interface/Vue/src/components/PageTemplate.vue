<template>
  <Suspense>
    <template #default>
      <div class="page-template">
        <div class="page-template-header">
          <div class="header-actions">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
        <div class="">
          <slot name="content" />
        </div>
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
const ThemeSwitcher = defineAsyncComponent(() => import('./ThemeSwitcher.vue'));
const LanguageSwitcher = defineAsyncComponent(() => import('./LanguageSwitcher.vue'));
const LoadingOverlay = defineAsyncComponent(() => import('./LoadingOverlay.vue'));
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
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--color-background);
  /* background-image: url("../assets/3431856.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat; */
}
</style>
