<template>
  <Suspense>
    <template #default>
      <!-- Zone bouton d'actions et de recherche cette zone se superpose avec le parent : PageTemplate qui laisse en haut à droite des bouton qui permettent de faire la gestion rapide du theme et de la lanque
                   il faut donc que cette zone soit libre -->
      <section class="flex-row relative hidden md:flex lg:flex transition-all">
        <div class="search-bar">
          <SearchBar
            v-if="authStore.isAuthenticated"
            :modelValue="searchQuery"
            @update:modelValue="updateSearchQuery($event)"
            placeholder="Rechercher"
          >
            <template v-if="searchQuery && filteredUsers.length > 0" #results>
              <SearchBarUserCard
                v-for="user in filteredUsers"
                :key="user.name"
                :avatar="user.avatar"
                :name="user.name"
                :isOnline="user.isOnline === true"
                :pendingInvitation="user.pendingInvitation"
                :isFriend="user.isFriend"
                :incoming="user.incoming"
                :outgoing="user.outgoing"
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
        <div v-if="!sidebarHovered" class="upperzone-btns">
          <!-- Bouton Ajouter un ami -->
          <button
            class="upperzone-btn"
            title="Ajouter un ami"
            @click="$emit('add-friend')"
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M19 8v3m0 0v3m0-3h3m-3 0h-3"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <!-- Bouton Créer une room -->
          <button
            class="upperzone-btn"
            title="Créer une room"
            @click="$emit('create-room')"
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="7"
                width="18"
                height="10"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M12 12v4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </section>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import LoadingOverlay from "@layouts/LoadingOverlay.vue";
import { computed, defineAsyncComponent, ref } from "vue";
import { useAuthStore } from "@stores/AuthStore";
import { useFriendsStore } from "@/stores/FriendsStore";
import { useRoomsStore } from "@/stores/RoomsStore";
import { useMessagesStore } from "@/stores/MessagesStore";

const SearchBar = defineAsyncComponent(
  () => import("@ui/SearchBars/SearchBar.vue")
);
const SearchBarUserCard = defineAsyncComponent(
  () => import("@ui/SearchBars/SearchBarUserCard.vue")
);

const authStore = useAuthStore();
const friendsStore = useFriendsStore();
const roomsStore = useRoomsStore();
const messagesStore = useMessagesStore();

const props = defineProps<{
  sidebarHovered: boolean;
  searchQuery: string;
  users: { id: string; name: string; avatar: string }[];
  filteredUsers: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
    pendingInvitation: boolean;
    isFriend: boolean;
    incoming: boolean;
    outgoing: boolean;
  }[];
}>();

const emit = defineEmits(["add-friend", "create-room", "updateSearchQuery"]);

function updateSearchQuery(searchQuery: string) {
  emit("updateSearchQuery", searchQuery);
}

async function handleAddFriend(e: {
  userId: string;
  name: string;
  avatar: string;
}) {
  console.log("handleAddFriend", e);
  console.log("userId", e.userId);
  console.log("name", e.name);
  console.log("avatar", e.avatar);
  // Find selected user id by name (component does not expose id). If multiple same names, pick first.
  const target = props.filteredUsers.find((u) => u.id === e.userId);
  if (!target) return;
  try {
    const res = await friendsStore.friendRequest(target.id);
    if (!res?.success) throw new Error(res?.error || "Erreur");
    // Immediately reflect pending outgoing request locally for requester UI
    friendsStore.upsertLocalPending(target.id, target.name, true);
    // Do not simulate acceptance; UI will update via FriendsStore 'friendUpdated' event
    emit("updateSearchQuery", "");
  } catch (err) {
    console.error("friendRequest failed", err);
  }
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
      // Clear search so dropdown collapses
      emit('updateSearchQuery', '');
    }
  } catch {}
}
</script>

<style scoped>
.scroll-bar {
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.scroll-bar::-webkit-scrollbar {
  display: none;
}

.sidebar-glass {
  /* background: rgba(30, 34, 44, 0.72); */
  background: var(--background);
  backdrop-filter: blur(14px);
  border-right: 1.5px solid rgba(120, 120, 160, 0.12);
}
.sidebar-divider {
  height: 1.5px;
  background: #fff;
  opacity: 0.08;
  border-radius: 2px;
}
.sidebar-title {
  color: var(--color-text);
  letter-spacing: 0.02em;
}
.sidebar-section {
  margin-left: 0.7rem;
  color: var(--color-text);
  font-weight: 600;
  font-size: 1rem;
}
.sidebar-btn-add {
  background: #6c47ff;
  color: #fff;
  border-radius: 50%;
  width: 2.2rem;
  height: 2.2rem;
  font-size: 1.3rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background 0.2s, box-shadow 0.2s;
}
.sidebar-btn-add:hover {
  background: #825fff;
  box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  animation: pulse-btn 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-btn {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  }
  50% {
    transform: scale(1.11);
    box-shadow: 0 0px 24px 4px rgba(108, 71, 255, 0.17);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(108, 71, 255, 0.12);
  }
}

.sidebar-room {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--color-text);
}
.sidebar-room:hover,
.sidebar-room-active {
  background: rgba(108, 71, 255, 0.11);
  color: var(--color-text);
}
.sidebar-room-label {
  font-weight: 500;
  color: var(--color-text);

  transition: color 0.2s;
}
.sidebar-btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text);

  border-radius: 8px;
  width: 100%;
  padding: 0.5rem;
  box-shadow: 0 0px 6px 0px rgba(81, 146, 211, 0.57);
  transition: background 0.2s, box-shadow 0.2s, color 0.2s;
  font-size: 1.3rem;
}
.sidebar-btn-action:hover {
  background: rgba(108, 71, 255, 0.13);
  box-shadow: 0 0px 10px 0px rgba(81, 146, 211, 0.686);
  color: #fff;
}

.sidebar-btn-logout {
  color: #ef4444;
}
.sidebar-btn-logout:hover {
  background: rgba(239, 68, 68, 0.13);
  color: #fff;
}
.search-bar {
  display: flex;
  justify-self: center;
  align-self: center;
  gap: 0.7rem;
  z-index: 30;
  position: absolute;

  padding: 1.3rem 2.2rem 0.5rem 0;
  top: -0.3rem;
  transform: translateX(2%);
}
.upperzone-btns {
  display: flex;
  justify-self: center;
  align-self: center;
  gap: 0.7rem;
  z-index: 30;
  position: absolute;
  padding: 1.3rem 2.2rem 0.5rem 0;
  top: 0.2rem;
  left: 19rem;
}
.upperzone-btn {
  display: flex;
  align-items: center;

  border-radius: 1.3rem;
  padding: 0.15rem 1rem 0.15rem 0.7rem;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0px 0.5px 8px 3px rgba(68, 102, 214, 0.242);
  transition: box-shadow 0.18s, background 0.18s, color 0.18s;
  width: 100%;
  margin-left: 0.1rem;
  margin-right: 0.1rem;
  max-width: 340px;
  position: relative;
  left: 2%;
}
.upperzone-btn:hover {
  background: rgba(255, 255, 255, 0.195);
  box-shadow: 0px 0.5px 8px 2px rgba(68, 102, 214, 0.57);
}
</style>
