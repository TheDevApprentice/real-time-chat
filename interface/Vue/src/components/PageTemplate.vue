<template>
  <div class="container">
    <ThemeSwitcher />
    <LanguageSwitcher />
    <ParamButton />
  </div>
  <div class="page-template-bg">
    <div class="min-h-screen flex items-center justify-center">
      <div
        class="w-full max-w-md p-6 rounded-2xl shadow-xl bg-[var(--page-bg-card)]"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ThemeSwitcher from "./ThemeSwitcher.vue";
import ParamButton from "./ParamButton.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
// No logic needed for this template
</script>

<style scoped>
.page-template-bg {
  background: var(--color-background);
  transition: background 0.3s;
}
.container {
  display: flex;
  position: fixed;
  top: calc(2% - 0px);
  gap: 10px;
  left: calc(92% - 20px);
}
</style>
