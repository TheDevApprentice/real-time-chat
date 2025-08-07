<template>
  <Suspense>
    <template #default>
      <div
        class="md:mt-[3rem] px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start transition-all"
      >
        <MainLayout>
          <template #content>
            <!-- Header: visible md+ -->
            <div class="hidden md:flex flex-col items-center col-span-2">
              <slot name="header"></slot>
            </div>
            <div
              class="relative w-full max-w-7xl flex-col md:flex md:translate-x-[55%]"
            >
              <slot name="card"></slot>
            </div>
            <slot name="preview-chat"></slot>
          </template>
        </MainLayout>
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "@layouts/LoadingOverlay.vue";
import MainLayout from "@layouts/MainLayout.vue";
</script>
