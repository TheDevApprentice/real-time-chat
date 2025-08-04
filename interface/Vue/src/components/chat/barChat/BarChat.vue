<template>
  <div class="chat-bar-image-row">
    <ImageButton @click-image="$emit('click-image')" />
    <div class="chat-bar chat-bar-redesign">
      <ChatInput
        :modelValue="inputValueProxy"
        :placeholder="inputPlaceholder"
        @keydown.enter="emit('click-send')"
      />
      <SendButton @click-send="$emit('click-send')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ImageButton from './ImageButton.vue';
import ChatInput from './ChatInput.vue';
import SendButton from './SendButton.vue';

const props = defineProps<{
  modelValue?: string,
  inputPlaceholder?: string,
  inputDisabled?: boolean,
  sendDisabled?: boolean,
  imageDisabled?: boolean
}>()
const emit = defineEmits(['update:modelValue', 'click-image', 'click-send'])

const inputValueProxy = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
</script>

<style scoped>
.chat-bar-image-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
  width: 100%;
}

.chat-bar.chat-bar-redesign {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 1.2rem;
  padding: 0.22rem 0.36rem 0.22rem 0rem;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.1);
}
</style>
