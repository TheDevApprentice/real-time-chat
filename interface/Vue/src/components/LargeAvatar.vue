<template>
  <Suspense>
    <template #default>
      <div
        v-if="mode !== undefined && mode !== 'login'"
        class="chat-header-avatar flex justify-center -mt-6 relative"
      >
        <div
          class="rounded-full shadow-lg flex items-center justify-center border-2 border-[var(--page-accent-color)] relative"
          style="
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(8px);"
        >
          <div>
            <svg
              width="32"
              height="32"
              fill="none"
              stroke="var(--page-accent-color, #4466d6)"
              stroke-width="2.2"
              viewBox="0 0 48 48"
            >
              <circle cx="24" cy="18" r="10" />
              <ellipse cx="24" cy="36" rx="16" ry="8" />
            </svg>
          </div>
          <!-- Badge en ligne -->
          <span
            class="absolute bottom-0 right-[-0.3rem] w-4 h-4 z-30 rounded-full border-2 border-[var(--background)] shadow"
            :class="{ 'bg-green-400': isOnline, 'bg-red-400': !isOnline }"
          ></span>
        </div>
      </div>
      <div v-else class="chat-header-avatar flex justify-center -mt-6 relative">
        <div
          class="rounded-full shadow-lg flex items-center justify-center border-2 border-[var(--page-accent-color)] relative"
          style="
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(8px);"
        >
          <div>
            <span
              style="font-size: 1.65rem"
              class="text-[var(--page-accent-color)]"
              >{{ avatar || name || '🤖' }} </span
            > 
          </div>
          <!-- Badge en ligne -->
          <span
            class="absolute bottom-0 right-[-0.3rem] w-4 h-4 z-30 rounded-full border-2 border-[var(--background)] shadow"
            :class="{ 'bg-green-400': isOnline, 'bg-red-400': !isOnline }"
          ></span>
        </div>
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";

const props = defineProps<{
  mode?: string | undefined;
  avatar?: string | undefined;
  name?: string | undefined;
  isOnline?: boolean;
}>();

const avatar = computed(() => {
  if (props.mode !== undefined) {
    return props.avatar || (props.name ? props.name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0,1).concat(props.name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(-1)).join('').toUpperCase() : '🤖');
  }
  else {
    return props.avatar;
  }
});
</script>

<style scoped>
.chat-header-avatar {
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
  position: relative;
}

.chat-header-avatar:hover {
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #4b71ed 60%, #93a7ee 100%);
}
</style>
