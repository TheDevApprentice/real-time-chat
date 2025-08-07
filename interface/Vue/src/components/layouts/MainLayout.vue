<template>
  <Suspense>
    <template #default>
      <div class="bg-[var(--color-background)] min-w-0">
        <!-- background circles -->
        <div class="absolute -top-32 -left-32 w-[140%] h-[140%] z-0">
          <span class="bg-circle circle-1"></span>
          <span class="bg-circle circle-2"></span>
        </div>
        <div class="w-full z-10 hidden md:flex lg:flex">
          <div class="header-actions">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
        <slot name="content" />
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
const ThemeSwitcher = defineAsyncComponent(
  () => import("../ui/ThemeSwitcher.vue")
);
const LanguageSwitcher = defineAsyncComponent(
  () => import("../ui/LanguageSwitcher.vue")
);
const LoadingOverlay = defineAsyncComponent(
  () => import("../layouts/LoadingOverlay.vue")
);
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-self: flex-end;
  align-self: flex-start;
  gap: 0.7rem;
  z-index: 50;
  position: fixed;
  padding: 1.3rem 2.2rem 0.5rem 0;
  top: 0;
  right: 0;
}
.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.2;
  filter: blur(12px);
  animation: float 12s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  background: var(--page-btn-gradient-hover);
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -80px;
  left: -80px;
  background: var(--page-secondary-color);
}
</style>
