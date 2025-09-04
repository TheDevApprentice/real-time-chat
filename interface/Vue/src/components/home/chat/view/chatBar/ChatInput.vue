<template>
  <textarea
    ref="textareaRef"
    class="chat-input resize-none w-full min-h-[2.5rem] max-h-36 overflow-auto"
    :placeholder="placeholder"
    :value="modelValue"
    @input="onInput"
    :disabled="disabled"
    rows="1"
  />
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
const props = defineProps<{
  modelValue: string | undefined
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits(['update:modelValue'])
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement | null
  if (target) {
    emit('update:modelValue', target.value)
    resize()
  }
}

watch(() => props.modelValue, async () => {
  await nextTick()
  resize()
})
</script>
<style scoped>
.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #eee;
  font-size: 1.03em;
  padding: 0.5em 1em;
  border-radius: 1rem;
  margin-left: 0.2rem;
  box-shadow: none;
  transition: background 0.18s;
  resize: none;
  min-height: 2.5rem;
  max-height: 9rem;
  line-height: 1.5;
  scrollbar-width: none;
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
