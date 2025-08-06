 <template>
  <Transition
    name="fade-slide"
    appear
  >
    <div :class="[displayFullContent ? 'user-conv-item' : 'user-conv-item-full', { active, unread: lastMessage?.isRead === false && displayFullContent && displayDate }]" @click="$emit('click')">
      <div class="avatars">
        <LargeAvatar  
          v-for="(user, idx) in displayedParticipants"
          :key="user.name + idx"
          :avatar="user.avatar"
          :name="user.name"
          :isOnline="user.isOnline"
          v-if="type === 'user'"
        />
        <LargeAvatar
          v-if="type === 'room'"
          :avatar="avatar"
          :name="name"
        />
        <span v-if="extraCount > 0" class="extra-count">+{{ extraCount }}</span>
      </div>
      <div v-if="displayFullContent" class="conv-content ">
        <Transition name="fade-slide-in" appear>
          <div class="conv-title"><span>{{ name }}</span></div>
        </Transition>
        <Transition name="fade-slide-in" appear>
          <div class="conv-last-msg">
            <span v-if="lastMessage?.speaker === 1" class="me">Moi: </span>
            <span class="msg">{{ lastMessage?.text }}</span>

            <span v-if="!sidebarExpanded || lastMessage?.isRead === false" class="unread-dot"></span>
          </div>
        </Transition>
      </div>
      <Transition name="fade-in" appear>
        <div v-if="sidebarExpanded || displayFullContent && displayDate" class="conv-meta">
          <span class="date">{{ formattedDate }}</span>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LargeAvatar from '../LargeAvatar.vue';
import type { ConversationType } from '../SideBarConversations.vue';
import type { Bubble } from './bubbleChat/ChatBubble.vue';

const props = defineProps<{
  displayFullContent?: boolean;
  displayDate?: boolean;
  sidebarExpanded?: boolean;
  avatar?: string;
  type?: ConversationType;
  messages: Bubble[];
  participants: { name: string, avatar: string, isOnline: boolean }[];
  name?: string;
  active?: boolean;
}>()

const displayedParticipants = computed(() => props.participants);
const extraCount = computed(() => Math.max(0, props.participants.length - 2));
const lastMessage = computed(() => props.messages[props.messages.length - 1]);

const formattedDate = computed(() => {
  if (!lastMessage.value?.date) return '';
  const d = new Date(lastMessage.value.date);
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
  width: 100%;
  min-width: 0rem;
  background: rgba(255, 255, 255, 0);
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
  width: 100%;
  min-width: 0rem;
  border-radius: 1.2rem;
  background: rgba(255,255,255,0.04);
  transition: background 0.18s, box-shadow 0.18s;
  cursor: pointer;
  margin-bottom: 0.4rem;
  box-shadow: 0 2px 8px 0 rgba(68, 102, 214, 0.07);
  position: relative;
}

.user-conv-item:hover,
.user-conv-item.active {
  background: linear-gradient(90deg, #4466d66d 70%, #5b7fff7d 100%);
  box-shadow: 0 2px 12px 0 rgba(68, 102, 214, 0.13);
  color: var(--color-text);
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
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s cubic-bezier(0.4,0,0.2,1), transform 0.18s cubic-bezier(0.4,0,0.2,1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(18px);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-slide-in-enter-active {
  transition: opacity 0.22s 0.07s cubic-bezier(0.4,0,0.2,1), transform 0.22s 0.07s cubic-bezier(0.4,0,0.2,1);
}
.fade-slide-in-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.fade-slide-in-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.fade-in-enter-active {
  transition: opacity 0.22s 0.13s cubic-bezier(0.4,0,0.2,1);
}
.fade-in-enter-from {
  opacity: 0;
}
.fade-in-enter-to {
  opacity: 1;
}
</style>