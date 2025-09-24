<template>
  <div class="signal-hud">
    <span class="sig-badge">PC: {{ pcState }}</span>
    <span class="sig-badge">ICE: {{ iceState }}</span>
    <span class="sig-badge" v-if="status === 'ringing'">Ringing…</span>
    <span class="sig-badge" v-if="showPreviewBadge">Prévisualisation</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  pcState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  status: 'idle' | 'ringing' | 'accepted' | 'ended';
  previewReady: boolean;
  localReady: boolean;
  type: 'voice' | 'video';
}>();

const showPreviewBadge = computed(() => props.type === 'video' && props.previewReady && !props.localReady);
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
