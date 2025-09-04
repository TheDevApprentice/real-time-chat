 import { defineStore } from 'pinia';
import { ref, computed, onMounted, onUnmounted } from 'vue';

function detectDeviceType({ ua, width, height, touch }: { ua: string; width: number; height: number; touch: boolean }) {
  ua = ua.toLowerCase();
  // TV detection
  if (/smart-tv|smarttv|googletv|appletv|hbbtv|netcast|viera|nettv|roku|dtv|sonydtv|inettvbrowser|tv|apple ?tv|firetv|bravia/.test(ua)) {
    return 'tv';
  }
  // Tablet detection
  if (/ipad|tablet|playbook|silk|kindle|nexus 7|nexus 9|nexus 10|sm-t|gt-p|tab|xoom|sch-i800|lenovo tab/.test(ua)) {
    return 'tablet';
  }
  // Mobile detection (phone)
  if (/mobi|iphone|android(?!.*tablet)|phone|ipod|blackberry|bb10|mini|windows\sce|palm/i.test(ua)) {
    return 'mobile';
  }
  // Heuristic: large touch screens are tablets
  if (touch && Math.min(width, height) >= 600 && Math.max(width, height) <= 1280) {
    return 'tablet';
  }
  // Heuristic: small touch screens are phones
  if (touch && Math.max(width, height) < 800) {
    return 'mobile';
  }
  // Desktop
  return 'desktop';
}

export const useDeviceStore = defineStore('DeviceStore', () => {
  const screenWidth = ref(window.innerWidth);
  const screenHeight = ref(window.innerHeight);
  const orientation = ref(window.screen.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'));
  const pixelRatio = ref(window.devicePixelRatio || 1);
  const isTouchDevice = ref(('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  const userAgent = ref(navigator.userAgent);

  const deviceType = computed(() =>
    detectDeviceType({
      ua: userAgent.value,
      width: screenWidth.value,
      height: screenHeight.value,
      touch: isTouchDevice.value,
    })
  );

  const isMobile = computed(() => deviceType.value === 'mobile');
  const isTablet = computed(() => deviceType.value === 'tablet');
  const isDesktop = computed(() => deviceType.value === 'desktop');
  const isTV = computed(() => deviceType.value === 'tv');

  function update() {
    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;
    orientation.value = window.screen.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    pixelRatio.value = window.devicePixelRatio || 1;
    isTouchDevice.value = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    userAgent.value = navigator.userAgent;
  }

  onMounted(() => {
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    update();
  });
  onUnmounted(() => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
  });

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isTV,
    screenWidth,
    screenHeight,
    orientation,
    pixelRatio,
    isTouchDevice,
    userAgent,
    update,
  };
});