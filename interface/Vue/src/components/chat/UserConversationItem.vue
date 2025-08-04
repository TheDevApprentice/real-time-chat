 <template>
  <div :class="[ displayFullContent ? 'user-conv-item' : 'user-conv-item-full', { active, unread: lastMessage?.unread && displayFullContent && displayDate }]" @click="$emit('click')">
    <div class="avatars">
      <LargeAvatar
        v-for="(user, idx) in displayedParticipants"
        :key="user.name + idx"
        :avatar="user.avatar"
        :name="user.name"
      />
      <span v-if="extraCount > 0" class="extra-count">+{{ extraCount }}</span>
    </div>
    <div v-if="displayFullContent" class="conv-content ">
      <div class="conv-title">
        <span>{{ title }}</span>
      </div>
      <div class="conv-last-msg">
        <span v-if="lastMessage?.isMine" class="me">Moi: </span>
        <span class="msg">{{ lastMessage?.text }}</span>
        <span v-if="lastMessage?.unread" class="unread-dot"></span>
      </div>
    </div>
    <div v-if="displayFullContent && displayDate" class="conv-meta">
      <span class="date">{{ formattedDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LargeAvatar from '../LargeAvatar.vue';

const props = defineProps<{
  displayFullContent?: boolean;
  displayDate?: boolean;
  participants: { name: string, avatar: string }[];
  title?: string;
  lastMessage?: { text: string, author: string, date: string, isMine: boolean, unread: boolean };
  active?: boolean;
}>()

const displayedParticipants = computed(() => props.participants);
const extraCount = computed(() => Math.max(0, props.participants.length - 2));

const formattedDate = computed(() => {
  if (!props.lastMessage?.date) return '';
  const d = new Date(props.lastMessage.date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return time;
  } else {
    const date = d.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: '2-digit' });
    return `${date}, ${time}`;
  }
});
</script>

<style scoped>
.user-conv-item-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.1rem;
  border-radius: 1.2rem;
  cursor: pointer;
  margin-bottom: 0.4rem;
  position: relative;
}
.user-conv-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.1rem;
  border-radius: 1.2rem;
  background: rgba(255,255,255,0.04);
  transition: background 0.18s, box-shadow 0.18s;
  cursor: pointer;
  margin-bottom: 0.4rem;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.07);
  position: relative;
}
.user-conv-item.active {
  background: linear-gradient(90deg, #4466d6 70%, #5b7fff 100%);
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.13);
}
.user-conv-item.unread::after {
  content: '';
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4e6a;
  box-shadow: 0 0 0 0 rgba(255, 78, 106, 0.7);
  animation: unread-pulse 1.1s cubic-bezier(0.4,0,0.6,1) infinite;
}
@keyframes unread-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 78, 106, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 78, 106, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 78, 106, 0);
  }
}
.avatars {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  top: 0.66rem;
  left: -0.8rem;
  min-width: 56px;
  max-width: 70px;
}
.extra-count {
  margin-left: 0.2em;
  color: #fff;
  background: #4466d6;
  border-radius: 1em;
  font-size: 0.93em;
  padding: 0.1em 0.55em;
  font-weight: 600;
  box-shadow: 0 1px 3px 0 #4466d688;
}
.conv-content {
  flex: 1 1 0;
  position: relative;
  left: -0.9rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.18em;
}
.conv-title {
  font-weight: 600;
  color: var(--color-text, #c5d3fa);
  font-size: 1.01em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.conv-last-msg {
  font-size: 0.97em;
  color: #b4b4c2;
  display: flex;
  align-items: center;
  gap: 0.3em;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.conv-last-msg .me {
  color: #4466d6;
  font-weight: 500;
}
.unread-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4e6a;
  margin-left: 0.5em;
  box-shadow: 0 0 0 0 rgba(255, 78, 106, 0.7);
  animation: unread-pulse 1.1s cubic-bezier(0.4,0,0.6,1) infinite;
}
@keyframes unread-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 78, 106, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 78, 106, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 78, 106, 0);
  }
}
.conv-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 48px;
  font-size: 0.92em;
  color: #8ea6d6;
}
.date {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  position: relative;
  right: 1rem;
}
@media (max-width: 600px) {
  .user-conv-item {
    padding: 0.55rem 0.5rem;
    gap: 0.7rem;
  }
  .conv-title {
    font-size: 0.98em;
  }
}
</style>