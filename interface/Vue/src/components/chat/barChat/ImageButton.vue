<template>
  <button
    type="button"
    class="image-btn"
    aria-label="Envoyer une image"
    @click="$emit('click-image')"
    :disabled="disabled"
  >
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect
        x="3"
        y="5"
        width="16"
        height="12"
        rx="2.5"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" />
      <path
        d="M4 15L9 10L13.5 14L16 11L18 13"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const emit = defineEmits(['click-image'])
</script>

<style scoped>
.image-btn {
  margin-top: 0.6rem;
  margin-right: 0.1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #77aaff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.09);
  border: none;
  transition: background 0.16s, color 0.13s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.8;
}
.image-btn svg {
  display: block;
}
</style>
