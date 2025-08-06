<template>
  <div class="relative w-screen h-screen min-w-0 min-h-0">
    <router-view />
    <!-- <PwaStatus /> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDeviceStore } from './stores/DeviceStore';
// import PwaStatus from './components/PwaStatus.vue'

const device = useDeviceStore();

onMounted(() => {
  console.log('DeviceStore.deviceType:', device.deviceType);
  console.log('DeviceStore.isMobile:', device.isMobile);
  console.log('DeviceStore.isTablet:', device.isTablet);
  console.log('DeviceStore.isDesktop:', device.isDesktop);
  console.log('DeviceStore.isTV:', device.isTV);
  console.log('DeviceStore.screenWidth:', device.screenWidth);
  console.log('DeviceStore.screenHeight:', device.screenHeight);
  console.log('DeviceStore.orientation:', device.orientation);
  console.log('DeviceStore.pixelRatio:', device.pixelRatio);
  console.log('DeviceStore.isTouchDevice:', device.isTouchDevice);
  console.log('DeviceStore.userAgent:', device.userAgent);
});
</script>

<style scoped>

</style>