<template>
  <div class="incoming-card">
    <div class="incoming-title">Appel entrant</div>
    <div class="incoming-caller">
      <div class="avatar-circle sm pulse">{{ caller.initials }}</div>
      <div class="who">
        <div class="name">{{ caller.name }}</div>
        <div class="kind">{{ kind }}</div>
      </div>
    </div>
    <div class="incoming-actions">
      <button class="action-btn accept" @click="$emit('accept')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.57 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.09a2 2 0 0 1 2.11-.45c.85.26 1.73.45 2.63.57A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span>Accepter</span>
      </button>
      <button class="action-btn decline" @click="$emit('decline')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 13c2.5-2 5.3-3 8-3s5.5 1 8 3l-2 4c-1.7-1.4-3.7-2.2-6-2.2S7.7 15.6 6 17L4 13z"/>
        </svg>
        <span>Refuser</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ caller: { name: string; initials: string }, kind: string }>();
</script>


<style scoped>
.call-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(
      1200px 600px at 20% -10%,
      rgba(123, 97, 255, 0.18) 0%,
      rgba(123, 97, 255, 0) 50%
    ),
    radial-gradient(
      1600px 700px at 110% -40%,
      rgba(0, 194, 255, 0.18) 0%,
      rgba(0, 194, 255, 0) 55%
    ),
    rgba(17, 24, 39, 0.95);
  display: flex;
  flex-direction: column;
  z-index: 9999;
}

.call-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.tiles {
  width: min(1200px, 100%);
  height: min(70vh, 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 12px;
}

@media (max-width: 768px) {
  .tiles {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.tile {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(93, 140, 255, 0.25);
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.video-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #e5e7eb;
}
.video-placeholder.muted {
  filter: grayscale(0.1);
}

.avatar-circle {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  box-shadow: 0 8px 22px rgba(68, 102, 214, 0.35);
}
.avatar-circle.sm {
  width: 72px;
  height: 72px;
}
.avatar-circle.pulse {
  animation: callerPulse 1.8s ease-in-out infinite;
}
@keyframes callerPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(68, 102, 214, 0.35);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(68, 102, 214, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(68, 102, 214, 0);
  }
}
.name {
  margin-top: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.badge {
  margin-top: 0.35rem;
  font-size: 12px;
  color: #c8d1ff;
  background: rgba(108, 71, 255, 0.22);
  border: 1px solid rgba(108, 71, 255, 0.35);
  padding: 2px 8px;
  border-radius: 999px;
}

/* Incoming card (glass) */
.incoming-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.incoming-title {
  color: #eaf0ff;
  font-weight: 600;
  opacity: 0.95;
}
.incoming-caller {
  display: flex;
  align-items: center;
  gap: 12px;
}
.incoming-caller .who {
  display: flex;
  flex-direction: column;
}
.incoming-caller .who .name {
  margin: 0;
  font-size: 1.05rem;
}
.incoming-caller .who .kind {
  color: #c9d4ff;
  font-size: 0.95rem;
  opacity: 0.9;
}
.incoming-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
  background: rgba(255, 255, 255, 0.1);
}
.action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.action-btn:active {
  transform: scale(0.98);
}
.action-btn svg {
  display: block;
}
.action-btn.accept {
  background: #19c37d;
}
.action-btn.decline {
  background: #ef4444;
}

.controls {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: rgba(17, 24, 39, 0.55);
  border: 1px solid rgba(93, 140, 255, 0.25);
  border-radius: 999px;
  padding: 8px 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.ctrl-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, transform 0.08s, color 0.18s;
}
.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
.ctrl-btn:active {
  transform: scale(0.96);
}
.ctrl-btn.active {
  color: #7fa6ff;
}

.ctrl-btn.hangup {
  background: #ef4444;
  color: white;
  border-color: rgba(0, 0, 0, 0.08);
}
.ctrl-btn.hangup:hover {
  background: #f05252;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Signaling HUD */
.signal-hud {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 10;
}
.sig-badge {
  font-size: 12px;
  color: #dbe2ff;
  background: rgba(108, 71, 255, 0.22);
  border: 1px solid rgba(108, 71, 255, 0.35);
  padding: 2px 8px;
  border-radius: 999px;
}
</style>
