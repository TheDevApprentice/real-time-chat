<template>
  <div class="signal-hud">
    <span class="sig-badge">PC: {{ pcState }}</span>
    <span class="sig-badge">ICE: {{ iceState }}</span>
    <span class="sig-badge">Type: {{ type }}</span>
    <span class="sig-badge">user: {{ user }}</span>
    <span class="sig-badge" v-if="status === 'ringing'">Ringing…</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  pcState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  status: 'idle' | 'ringing' | 'accepted' | 'ended';
  type: 'voice' | 'video';
  user: string;
}>();
</script>

<style scoped>
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
  background: rgba(108,71,255,0.22);
  border: 1px solid rgba(108,71,255,0.35);
  padding: 2px 8px;
  border-radius: 999px;
}
</style>
