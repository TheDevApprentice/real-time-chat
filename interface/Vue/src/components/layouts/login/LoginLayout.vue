<template>
  <Suspense>
    <template #default>
      <div
        class="transition-all border border-yellow-500 h-screen w-screen"
      >
        <MainLayout>
          <template #content>
            <div
              class="grid grid-cols-1 md:grid-cols-2 transition-all border border-yellow-500 h-screen w-full"
            >
              <!-- Header: visible md+ -->
              <div
                class="flex flex-col col-span-1 relative items-center justify-center border border-red-500 h-screen"
              >
                <div
                  class="relative hidden md:flex flex-col items-center justify-center "
                >
                  <slot name="header"></slot>
                </div>
                <div class="relative flex flex-col">
                  <slot name="card"></slot>
                </div>
              </div>

              <div
                class="col-span-1 relative hidden md:flex md:flex-col border border-green-500 top-[13%] h-screen "
              >
                <slot name="preview-chat"></slot>
              </div>
            </div>
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
