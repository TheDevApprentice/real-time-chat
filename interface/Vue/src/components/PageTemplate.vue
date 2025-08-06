<template>
  <Suspense>
    <template #default>
      <div class="page-template min-w-0 ">
        <div class="page-template-header hidden md:flex lg:flex">

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
import { computed, defineAsyncComponent, ref } from "vue";
import { useAuthStore } from "../stores/AuthStore";
import Avatar from "./chat/headerChat/Avatar.vue";
const ThemeSwitcher = defineAsyncComponent(() => import("./ThemeSwitcher.vue"));
const LanguageSwitcher = defineAsyncComponent(
  () => import("./LanguageSwitcher.vue")
);
const LoadingOverlay = defineAsyncComponent(
  () => import("./LoadingOverlay.vue")
);

const authStore = useAuthStore();
</script>

<style scoped>
.page-template {
  background: var(--color-background);
}
.page-template-header {
  width: 100%;
  z-index: 10;
}
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
</style>
