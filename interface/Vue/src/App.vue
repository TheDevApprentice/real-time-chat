<template>
  <div class="w-[100vw] h-[100vh] items-center justify-center flex">
    <router-view />
    <PwaStatus />
  </div>
</template>

<script setup lang="ts">
import PwaStatus from './components/PwaStatus.vue'
</script>

<style scoped>

</style>