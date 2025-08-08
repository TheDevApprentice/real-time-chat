<template>
  <Modal>
    <template #header>
      <span>Créer une room</span>
    </template>
    <template #content>
      <div class="create-room-modal-content">
        <div class="emoji-selector-label">Avatar&nbsp;:</div>
        <div class="emoji-selector">
          <button
            v-for="emoji in emojis"
            :key="emoji"
            :class="['emoji-btn', selectedEmoji === emoji ? 'selected' : '']"
            @click="selectEmoji(emoji)"
            type="button"
            :aria-label="'Choisir ' + emoji"
          >
            {{ emoji }}
          </button>
        </div>
        <div class="room-name-field">
          <label for="room-name" class="room-name-label">Nom de la room&nbsp;:</label>
          <input
            id="room-name"
            class="room-name-input"
            type="text"
            v-model="roomName"
            maxlength="32"
            placeholder="Nom de la room..."
            autocomplete="off"
          />
        </div>
        <div class="modal-actions">
          <button class="modal-btn" @click="handleCreate" :disabled="!roomName.trim()">Créer</button>
          <button class="modal-btn cancel" @click="handleClose">Annuler</button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { defineAsyncComponent } from "vue";
const Modal = defineAsyncComponent(() => import("@reusable/Modal.vue"));

const emit = defineEmits(['close', 'create']);
const emojis = [
  '🤖', '🦄', '🐱', '🐶', '🦊', '🐼', '🐸', '🐵', '🐙', '🦁',
  '🐯', '🐮', '🐷', '🐰', '🐻', '🐨', '🐔', '🐧', '🦉', '🐲',
  '😺', '👾', '🧙', '🧑‍🚀', '🧑‍🎤', '🧑‍💻', '🧑‍🏫', '🧑‍🎨', '🎩', '🌈'
];
const selectedEmoji = ref(emojis[0]);
const roomName = ref('');

function selectEmoji(emoji: string) {
  selectedEmoji.value = emoji;
}
function handleCreate() {
  if (roomName.value.trim()) {
    emit('create', { name: roomName.value.trim(), avatar: selectedEmoji.value });
    handleClose();
  }
}
function handleClose() {
  emit('close');
}
</script>

<style scoped>
.create-room-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
  min-height: 180px;
  padding-top: 0.5rem;
}
.emoji-selector-label {
  font-size: 1.05em;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--modal-message-color);
}
.emoji-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  justify-content: center;
  margin-bottom: 1.2rem;
  max-width: 320px;
}
.emoji-btn {
  font-size: 1.45em;
  background: none;
  border: 2px solid transparent;
  border-radius: 0.7em;
  padding: 0.18em 0.38em;
  cursor: pointer;
  transition: border 0.14s, background 0.13s;
}
.emoji-btn.selected {
  border: 2px solid #4466d6;
  background: #e6edff;
}
.room-name-field {
  width: 100%;
  margin-bottom: 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.room-name-label {
  font-size: 1em;
  color: var(--modal-message-color);
  font-weight: 500;
  margin-bottom: 0.25rem;
  margin-left: 0.1rem;
}
.room-name-input {
  width: 100%;
  padding: 0.5em 0.9em;
  border-radius: 0.7em;
  border: 1.5px solid #b7c6e6;
  font-size: 1.09em;
  color: var(--color-text);
  background: var(--color-background);
  outline: none;
  transition: border 0.13s;
}
.room-name-input:focus {
  border: 1.5px solid #4466d6;
}
.modal-actions {
  display: flex;
  gap: 0.9em;
  margin-top: 0.5em;
}
.modal-btn {
  position: relative;
  overflow: hidden;
  background-size: 200% 100%;
  background: var(--modal-message-btn-background-color);
  color: var(--modal-message-btn-text-color);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 #23233a33;
  transition: background-position 0.4s ease, box-shadow 0.3s ease, transform 0.2s ease;
}
.modal-btn.cancel {
  background: #eaeaea;
  color: #7c7c7c;
}
.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
