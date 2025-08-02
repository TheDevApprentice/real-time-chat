<template>
  <input
    type="text"
    class="chat-input"
    :placeholder="placeholder"
    :value="modelValue"
    @input="onInput"
    :disabled="disabled"
  />
</template>
<script setup lang="ts">
defineProps<{
  modelValue: string | undefined
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits(['update:modelValue'])

function onInput(e: Event) {
  const target = e.target as HTMLInputElement | null
  if (target) emit('update:modelValue', target.value)
}

</script>
<style scoped>
.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eee;
  font-size: 1.03em;
  padding: 0.7em 0.2em;
  border-radius: 1.1rem;
  box-shadow: none;
  transition: background 0.18s;
}
.chat-input:focus {
  background: rgba(255, 255, 255, 0.12);
}
.chat-input::placeholder {
  color: #bbb;
  opacity: 1;
  font-style: italic;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.09);
}
</style>
