<template>
  <div class="search-user-card">
    <Avatar v-if="!noresult" :avatar="avatarComputed" :name="name" size="md" :isOnline="isOnline" />
    <span v-if="!noresult" class="user-name">{{ name }}</span>
    <button
      v-if="!noresult"
      class="add-btn"
      :disabled="props.isFriend == true || props.pendingInvitation == true"
      :aria-disabled="props.isFriend == true || props.pendingInvitation == true"
      @click="$emit('action', {userId, name, avatar})"
    >
      <template v-if="props.isFriend">
        <!-- Icône check/ami -->
        <div class="status-icon" :class="{ 'accepted-pulse': acceptedPulse }">
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
        </div>
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
    <!-- Friend quick actions: call / message (only if already friends) -->
    <div v-if="!noresult && isFriend" class="friend-actions">
      <button class="btn-call" title="Appeler" @click.stop="$emit('call', { userId, name })">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7bd88f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.57 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.09a2 2 0 0 1 2.11-.45c.85.26 1.73.45 2.63.57A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>
      <button class="btn-message" title="Envoyer un message" @click.stop="$emit('message', { userId, name })">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6aa2ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
    <!-- Incoming request actions: show alongside the pending icon -->
    <div v-if="!noresult && pendingInvitation && incoming && !isFriend" class="incoming-actions">
      <button class="btn-accept" title="Accepter" @click.stop="$emit('accept', { userId, name })">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#19c37d" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      <button class="btn-reject" title="Refuser" @click.stop="$emit('reject', { userId, name })">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <span v-if="noresult" class="user-name">Aucun résultat</span>
  </div>
</template>

<script setup lang="ts">
import Avatar from "@ui/avatars/Avatar.vue";
import { computed, ref, watch } from "vue";
const props = defineProps<{
  name?: string;
  avatar?: string;
  noresult?: boolean;
  pendingInvitation?: boolean;
  isFriend?: boolean;
  isOnline?: boolean;
  incoming?: boolean;
  outgoing?: boolean;
  userId?: string;
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
defineEmits(["action", "accept", "reject", "call", "message"]);

// Subtle pulse when status switches to accepted
const acceptedPulse = ref(false);
watch(
  () => props.isFriend,
  (now, prev) => {
    if (now === true && prev !== true) {
      acceptedPulse.value = true;
      setTimeout(() => { acceptedPulse.value = false; }, 800);
    }
  }
);
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
.status-icon {
  display: inline-flex;
}
.accepted-pulse {
  animation: acceptedPulse 0.8s ease-out;
}
@keyframes acceptedPulse {
  0% { transform: scale(0.7); filter: drop-shadow(0 0 0 rgba(25,195,125,0)); }
  40% { transform: scale(1.15); filter: drop-shadow(0 0 8px rgba(25,195,125,0.55)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(25,195,125,0)); }
}
.incoming-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.4rem;
}
.friend-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.45rem;
}
.btn-call, .btn-message {
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  padding: 0.18rem;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}
.btn-call:hover, .btn-message:hover {
  transform: scale(1.08);
  background: rgba(255,255,255,0.06);
}
.btn-accept, .btn-reject {
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  padding: 0.2rem 0.3rem;
  cursor: pointer;
}
.btn-accept:hover { background: rgba(25,195,125,0.12); }
.btn-reject:hover { background: rgba(239,68,68,0.12); }
</style>
