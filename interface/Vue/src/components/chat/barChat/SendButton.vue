<template>
  <button
    type="button"
    class="send-btn send-btn-redesign"
    aria-label="Envoyer"
    @click="$emit('click-send')"
    :disabled="disabled"
  >
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M2 11L20 2L11 20L10 13L2 11Z" fill="currentColor" />
    </svg>
  </button>
</template>
<script setup lang="ts">
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits(['click-send'])
</script>
<style scoped>
.send-btn.send-btn-redesign {
  margin-left: 0.15rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px 0 rgba(68, 102, 214, 0.18);
  border: none;
  transition: background 0.18s, transform 0.13s;
  cursor: not-allowed;
  opacity: 0.75;
}
.send-btn-redesign svg {
  display: block;
}
</style>
