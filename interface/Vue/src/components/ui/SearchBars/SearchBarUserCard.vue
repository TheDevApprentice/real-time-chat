<template>
  <div class="search-user-card">
    <Avatar v-if="!noresult" :avatar="avatarComputed" :name="name" size="md" />
    <span v-if="!noresult" class="user-name">{{ name }}</span>
    <button
      v-if="!noresult"
      class="add-btn"
      :disabled="props.isFriend == true || props.pendingInvitation == true"
      :aria-disabled="props.isFriend == true || props.pendingInvitation == true"
      @click="$emit('action', {name, avatar})"
    >
      <template v-if="props.isFriend">
        <!-- Icône check/ami -->
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="#19c37d"
          stroke-width="2.3"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" stroke="#19c37d" fill="none" />
          <polyline
            points="8,13 11,16 16,10"
            fill="none"
            stroke="#19c37d"
            stroke-width="2.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </template>
      <template v-else-if="props.pendingInvitation">
        <!-- Icône horloge/pending -->
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="#f7b500"
          stroke-width="2.2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" stroke="#f7b500" fill="none" />
          <path
            d="M12 8v4l2.5 2.5"
            stroke="#f7b500"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </template>
      <template v-else>
        <!-- Icône +/ajout -->
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </template>
    </button>
    <span v-else class="user-name">Aucun résultat</span>
  </div>
</template>

<script setup lang="ts">
import Avatar from "../avatars/Avatar.vue";
import { computed } from "vue";
const props = defineProps<{
  name?: string;
  avatar?: string;
  noresult?: boolean;
  pendingInvitation?: boolean;
  isFriend?: boolean;
}>();
const avatarComputed = computed(() => {
  if (props.avatar !== undefined) {
    return (
      props.avatar ||
      (props.name
        ? props.name
            .trim()
            .split(/\s+/)
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 1)
            .concat(
              props.name
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .filter(Boolean)
                .slice(-1)
            )
            .join("")
            .toUpperCase()
        : "🤖")
    );
  } else {
    return props.avatar;
  }
});
defineEmits(["action"]);
</script>

<style scoped>
.search-user-card {
  display: flex;
  align-items: center;
  background: var(--color-background);
  box-shadow: 0px 0.5px 8px 3px rgba(68, 102, 214, 0.242);
  border-radius: 1.1rem;
  padding: 0.55em 0.8em 0.55em 0.5em;
  margin-top: 0.3em;
  margin-bottom: 0.3em;
  transition: background 0.15s;
  cursor: pointer;
  box-shadow: 0 1px 8px 0 rgba(68, 102, 214, 0.07);
}
.search-user-card:hover {
  background: rgba(68, 102, 214, 0.09);
}
.user-name {
  flex: 1;
  margin-left: 0.8em;
  color: var(--color-text);
  font-size: 1.08em;
  font-weight: 500;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.add-btn {
  background: rgba(68, 102, 214, 0.13);
  border: none;
  border-radius: 0.85em;
  padding: 0.26em 0.62em;
  margin-left: 0.6em;
  display: flex;
  align-items: center;
  color: #4466d6;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}
.add-btn:hover {
  background: #4466d6cb;
  color: #e3e8fa;
}
.add-btn svg {
  display: block;
}
</style>
