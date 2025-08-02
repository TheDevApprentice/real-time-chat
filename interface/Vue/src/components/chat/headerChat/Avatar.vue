<template>
  <div class="chat-header-avatar">
    <span>{{ avatar }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  avatar?: string;
}>();
</script>

<style scoped>
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
  color: #fff;
  font-weight: 700;
  box-shadow: 1px 1px 8px 3px rgba(68, 102, 214, 0.893);
  margin-right: 0.3rem;
  z-index: 20;
}
</style>
