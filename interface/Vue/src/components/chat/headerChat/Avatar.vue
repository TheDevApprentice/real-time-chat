<template>
  <div class="chat-header-container">
    <div class="chat-header-avatar">
      <span>{{ avatar }}</span>
    </div>
    <span class="chat-header-name">{{ name }}</span>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  avatar?: string;
  name?: string;
}>();
</script>

<style scoped>
.chat-header-container {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.chat-header-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid rgba(68, 151, 214, 0.371);
  
  background: linear-gradient(135deg, #4466d6 60%, #5b7fff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35em;
  font-weight: 700;
  box-shadow: 1px 1px 8px 3px rgba(68, 102, 214, 0.893);
  transition: background 0.25s, box-shadow 0.25s, color 0.25s;
  margin-right: 0.3rem;
  z-index: 20;
}
.chat-header-name {
  font-weight: 600;
  color: var(--page-text-color);
  font-size: 1.02em;
  letter-spacing: 0.05em;
  flex: 1;
  text-shadow: 0 1px 2px rgba(10, 161, 255, 0.496);
  transition: color 0.25s;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0px);
  }
}
.chat-header-avatar:hover {
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #4b71ed 60%, #93a7ee 100%);
  animation: float 2s ease-in-out infinite;
}
</style>
