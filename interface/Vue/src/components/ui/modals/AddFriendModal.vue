<template>
  <Modal>
    <template #header>
      <span>{{ headerTitle }}</span>
    </template>
    <template #content>
      <div class="add-friend-modal-content">
        <div class="modal-searchbar-wrapper">
          <SearchBar
            :modelValue="searchQuery"
            @update:modelValue="updateSearchQuery($event)"
            placeholder="Rechercher"
          >
            <template v-if="searchQuery && filteredUsers.length > 0" #results>
              <SearchBarUserCard
                v-for="user in filteredUsers"
                :key="user.id || user.name"
                :avatar="user.avatar"
                :name="user.name"
                :userId="user.id"
                @action="handleAddFriend($event)"
                @message="handleMessage($event)"
              />
            </template>
            <template
              v-if="searchQuery && filteredUsers.length === 0"
              #no-result
            >
              <SearchBarUserCard :noresult="true" />
            </template>
          </SearchBar>
        </div>
        <div class="modal-added-friends">
          <div class="modal-added-title">Amis ajoutés</div>
          <transition-group name="friend-card" tag="div" class="friend-list">
            <SearchBarUserCard
              v-for="friend in friendsStore.friendRequests"
              :key="friend.userId || friend.name"
              :avatar="friend.avatar"
              :name="friend.name"
              :isOnline="friend.isOnline === true"
              :pendingInvitation="friend.pendingInvitation"
              :isFriend="friend.isFriend"
              :incoming="friend.incoming"
              :outgoing="friend.outgoing"
              :userId="friend.userId"
              @accept="handleAccept($event)"
              @reject="handleReject($event)"
              @action="handleAddFriend($event)"
              @message="handleMessage($event)"
            />
          </transition-group>
        </div>
        <button class="modal-btn" @click="handleClose">Fermer</button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onMounted } from "vue";
import { useUserStore } from "@/stores/UserStore";
import { useAuthStore } from "@/stores/AuthStore";
import { useFriendsStore } from "@/stores/FriendsStore";
const Modal = defineAsyncComponent(() => import("@reusable/Modal.vue"));
const SearchBar = defineAsyncComponent(() => import("@ui/SearchBars/SearchBar.vue"));
const SearchBarUserCard = defineAsyncComponent(
  () => import("@ui/SearchBars/SearchBarUserCard.vue")
);
import { useRoomsStore } from "@/stores/RoomsStore";
import { useMessagesStore } from "@/stores/MessagesStore";

defineProps<{
  headerTitle?: string;
}>();

const emit = defineEmits(["close"]);

const userStore = useUserStore();
const authStore = useAuthStore();
const friendsStore = useFriendsStore();
const roomsStore = useRoomsStore();
const messagesStore = useMessagesStore();

const searchQuery = ref("");
// Live results populated from REST /chat/users/search
const users = ref<Array<{ id: string; name: string; avatar: string }>>([]);

// Live results populated from FriendsStore
const filteredUsers = computed(() => {
  if (!searchQuery.value) return [] as Array<{ id: string; name: string; avatar: string }>;
  const myId = authStore.userId;
  if (!myId) return [] as Array<{ id: string; name: string; avatar: string }>;
  return users.value.filter(u => u.id !== myId);
});

function updateSearchQuery(searchQueryChanged: string) {
  searchQuery.value = searchQueryChanged;
}

// Open or create a DM room with the selected friend
async function handleMessage(e: { userId: string; name?: string }) {
  try {
    const myId = authStore.userId;
    const targetId = String(e?.userId || "");
    if (!targetId || !myId) return;

    // Try to find an existing DM with this user
    const rooms = roomsStore.rooms || [];
    const dm = rooms.find((r: any) => {
      if (!r || r.type !== 'user') return false;
      const members: Array<{ id: string; name: string }> = Array.isArray(r.users) ? r.users : [];
      const ids = members.map((u) => u && u.id).filter(Boolean);
      return ids.includes(myId) && ids.includes(targetId);
    });

    let roomId: string | null = dm ? String((dm as any).id) : null;
    if (!roomId) {
      // Create the DM; server will materialize a DM room for both users
      const name = e?.name || 'DM';
      const res = await roomsStore.createRoom({ name, type: 'user', isPublic: false, invitedUserIds: [targetId] });
      if (!res?.success) return;
      // Refresh and search again
      try { await roomsStore.getRooms(); } catch {}
      const rooms2 = roomsStore.rooms || [];
      const created = rooms2.find((r: any) => {
        if (!r || r.type !== 'user') return false;
        const members: Array<{ id: string; name: string }> = Array.isArray(r.users) ? r.users : [];
        const ids = members.map((u) => u && u.id).filter(Boolean);
        return ids.includes(myId) && ids.includes(targetId);
      });
      roomId = created ? String((created as any).id) : null;
    }

    if (roomId) {
      try { await roomsStore.joinRoom(roomId); } catch {}
      messagesStore.setActiveRoom(roomId);
    }
  } catch {}
}

function handleClose() {
  emit("close");
}
async function handleAddFriend(e: { userId: string; name: string; avatar: string }) {
  console.log("handleAddFriend", e);
  console.log("userId", e.userId);
  console.log("name", e.name);
  console.log("avatar", e.avatar);
  // Find selected user id by name (component does not expose id). If multiple same names, pick first.
  const target = filteredUsers.value.find(u => u.id === e.userId);
  if (!target) return;
  try {
    const res = await friendsStore.friendRequest(target.id);
    if (!res?.success) throw new Error(res?.error || 'Erreur');
    // Immediately reflect pending outgoing request locally for requester UI
    friendsStore.upsertLocalPending(target.id, target.name, true);
    // Do not simulate acceptance; UI will update via FriendsStore 'friendUpdated' event
    searchQuery.value = "";
  } catch (err) {
    console.error('friendRequest failed', err);
  }
}

async function handleAccept(e: { userId: string; name: string }) {
  try {
    console.log("handleAccept", e);
    console.log("userId", e.userId);
    console.log("friend requests : ", friendsStore.friendRequests)
    // Find selected user id by name (component does not expose id). If multiple same names, pick first.
    const target = friendsStore.friendRequests.find(u => u.userId === e.userId);
    console.log("target", target);
    if (!target) return;
    const res = await friendsStore.friendRespond(target.userId, 'accept');
    if (!res?.success) throw new Error(res?.error || 'Erreur');
  } catch (err) {
    console.error('friendAccept failed', err);
  }
}

async function handleReject(e: { userId: string; name: string }) {
  try {
    console.log("handleReject", e);
    console.log("userId", e.userId);
    // Find selected user id by name (component does not expose id). If multiple same names, pick first.
    const target = friendsStore.friendRequests.find(u => u.userId === e.userId);
    console.log("target", target);
    if (!target) return;
    const res = await friendsStore.friendRespond(target.userId, 'reject');
    if (!res?.success) throw new Error(res?.error || 'Erreur');
  } catch (err) {
    console.error('friendReject failed', err);
  }
}



// Live search: fetch results when query changes
watch(searchQuery, async (q) => {
  const s = String(q || '').trim();
  if (!s) { users.value = []; return; }
  const list = await userStore.searchUsers(s, 20);
  // Exclude current user and users with an existing friendship (pending or accepted)
  const myId = authStore.userId;
  const blocked = new Set((friendsStore.items || [])
    .filter(i => i.status === 'pending' || i.status === 'accepted')
    .map(i => i.userId));
  users.value = list
    .filter(u => (!myId || u.id !== myId) && !blocked.has(u.id))
    .map(u => ({ id: u.id, name: u.name, avatar: (u.name || '?').trim().charAt(0).toUpperCase() || '?' }));
});

</script>

<style scoped>
.add-friend-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 320px;
  min-height: 180px;
  padding-top: 0.5rem;
}
.modal-searchbar-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.modal-friend-results {
  width: 100%;
  min-height: 2.5rem;
  margin-bottom: 1.5rem;
}
.modal-btn {
  position: relative;
  overflow: hidden;
  background-size: 200% 100%;
  background: var(--modal-message-btn-background-color);
  color: var(--modal-message-btn-text-color);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 #23233a33;
  transition: background-position 0.4s ease, box-shadow 0.3s ease,
    transform 0.2s ease;
}
.modal-btn:hover {
  background: var(--modal-message-btn-background-hover-color);
  box-shadow: 0 0 12px 0 #b03a7a44;
  transform: scale(1.045);
  background-position: right center;
}

.modal-added-friends {
  width: 100%;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0 0.7rem 0;
  border-top: 1px solid var(--modal-message-color, #e0e7ef);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}
.friend-list { width: 100%; }
.modal-added-title {
  font-size: 0.99em;
  font-weight: 600;
  color: var(--modal-message-color);
  margin-bottom: 0.3rem;
  margin-left: 0.2rem;
}

/* Subtle enter/leave for friend cards (applies when requests are accepted/rejected) */
.friend-card-enter-active,
.friend-card-leave-active {
  transition: opacity 200ms ease, transform 220ms ease;
}
.friend-card-enter-from,
.friend-card-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.friend-card-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
