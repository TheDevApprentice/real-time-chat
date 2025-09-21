<template>
  <div class="relative w-screen h-screen min-w-0 min-h-0">
    <router-view />
    <!-- <PwaStatus /> -->
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted } from 'vue';
import { useDeviceStore } from '@stores/DeviceStore';
import { useAuthStore } from '@stores/AuthStore';

// import PwaStatus from './components/PwaStatus.vue'

const device = useDeviceStore();
const authStore = useAuthStore();

onBeforeMount(async () => {
});

onMounted(async () => {
  await authStore.tryAutoAuth().then(() => {
    console.log('App/authStore.isAuthenticated:', authStore.isAuthenticated);
    console.log('App/authStore.user:', authStore.user);
  });

  console.log('App/DeviceStore.deviceType:', device.deviceType);
  console.log('App/DeviceStore.isMobile:', device.isMobile);
  console.log('App/DeviceStore.isTablet:', device.isTablet);
  console.log('App/DeviceStore.isDesktop:', device.isDesktop);
  console.log('App/DeviceStore.isTV:', device.isTV);
  console.log('App/DeviceStore.screenWidth:', device.screenWidth);
  console.log('App/DeviceStore.screenHeight:', device.screenHeight);
  console.log('App/DeviceStore.orientation:', device.orientation);
  console.log('App/DeviceStore.pixelRatio:', device.pixelRatio);
  console.log('App/DeviceStore.isTouchDevice:', device.isTouchDevice);
  console.log('App/DeviceStore.userAgent:', device.userAgent);

});
</script>

<style scoped>

</style>