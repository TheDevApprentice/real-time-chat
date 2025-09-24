<template>
  <button
    class="ctrl-btn"
    :class="[extraClass, { active }]"
    :aria-label="ariaLabel"
    @click="$emit('click')"
  >
    <span class="icon" v-html="iconSvg"></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  extraClass?: string; // Additional classes like 'hangup'
  ariaLabel?: string;
  iconSvg: string; // Raw SVG markup
}>();
defineEmits<{ (e: 'click'): void }>();
</script>

<style scoped>
.icon :deep(svg) {
  display: block;
}
</style>
