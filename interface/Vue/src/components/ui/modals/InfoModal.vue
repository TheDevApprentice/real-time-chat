<template>
  <Modal>
    <template #header>
      <span>{{ headerTitle }}</span>
    </template>
    <template #content>
      <div class="modal-icon" :class="type">
        <span v-if="type === 'info'">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#2196f3" />
            <text
              x="50%"
              y="56%"
              text-anchor="middle"
              fill="#fff"
              font-size="22"
              font-family="Arial"
              dy=".3em"
            >
              i
            </text>
          </svg>
        </span>
        <span v-else-if="type === 'warning'">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#ffb300" />
            <text
              x="50%"
              y="56%"
              text-anchor="middle"
              fill="#fff"
              font-size="22"
              font-family="Arial"
              dy=".3em"
            >
              !
            </text>
          </svg>
        </span>
        <span v-else-if="type === 'delete'">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#e94090" />
            <text
              x="50%"
              y="56%"
              text-anchor="middle"
              fill="#fff"
              font-size="20"
              font-family="Arial"
              dy=".3em"
            >
              ✖
            </text>
          </svg>
        </span>
        <span v-else-if="type === 'error'">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#e53935" />
            <text
              x="50%"
              y="56%"
              text-anchor="middle"
              fill="#fff"
              font-size="20"
              font-family="Arial"
              dy=".3em"
            >
              ✖
            </text>
          </svg>
        </span>
        <span v-else>
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#90caf9" />
            <text
              x="50%"
              y="56%"
              text-anchor="middle"
              fill="#fff"
              font-size="22"
              font-family="Arial"
              dy=".3em"
            >
              ?
            </text>
          </svg>
        </span>
      </div>
      <div class="modal-message">{{ message }}</div>
      <button class="modal-btn" @click="handleOk">OK</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const Modal = defineAsyncComponent(() => import("../../reusable/Modal.vue"));
export type InfoModalType = 'info' | 'warning' | 'delete' | 'default' | 'error'
const props = defineProps<{
  headerTitle: string
  message: string
  type?: InfoModalType
  onOk?: () => void
}>()
const emit = defineEmits(['close'])
const type = props.type || 'default'
function handleOk() {
  if (props.onOk) props.onOk()
  emit('close')
}
</script>

<style scoped>
.modal-icon {
  background: var(--modal-card-background-color);
  padding: 0.5rem;
  border-radius: 50%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation:
    popIcon 0.4s cubic-bezier(0.2, 1.5, 0.5, 1) both,
    pulse 3s ease-in-out 1s infinite;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.modal-icon.info svg circle {
  fill: var(--modal-info-icon-color);
}
.modal-icon.warning svg circle {
  fill: var(--modal-warning-icon-color);
}
.modal-icon.delete svg circle {
  fill: var(--modal-delete-icon-color);
}
.modal-icon.default svg circle {
  fill: var(--modal-default-icon-color);
}
.modal-icon.error svg circle {
  fill: var(--modal-error-icon-color);
}
.modal-message {
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: var(--modal-message-color);
  font-size: 1.13em;
  text-align: center;
  margin-bottom: 22px;
  letter-spacing: 0.01em;
  max-width: 340px;
}
.modal-icon.error {
  animation: shake 0.18s 1;
}
.modal-message.error {
  color: var(--modal-message-error-color);
  text-shadow: 0 1px 6px var(--modal-message-text-shadow-color);
}
@keyframes shake {
  0% {
    transform: translateX(0);
  }
  30% {
    transform: translateX(-6px);
  }
  60% {
    transform: translateX(6px);
  }
  100% {
    transform: translateX(0);
  }
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
  transition:
    background-position 0.4s ease,
    box-shadow 0.3s ease,
    transform 0.2s ease;
}
.modal-btn:hover {
  background: var(--modal-message-btn-background-hover-color);
  box-shadow: 0 0 12px 0 #b03a7a44;
  transform: scale(1.045);
  background-position: right center;
}
.modal-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
}

@keyframes popIcon {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-btn:focus {
  outline: 2px solid var(--focus-color, #5a67d8);
  outline-offset: 2px;
}

.modal-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition:
    transform 0.5s ease,
    opacity 1s ease;
  opacity: 0;
}
.modal-btn:hover::after {
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  transition: 0s;
}

.modal-card:hover {
  transform: translateY(-5px) scale(1.02);
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}
</style>
