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
                :key="user.name"
                :avatar="user.avatar"
                :name="user.name"
                @action="handleAddFriend($event)"
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
          <SearchBarUserCard
            v-for="friend in addedFriends"
            :key="friend.name"
            :avatar="friend.avatar"
            :name="friend.name"
            :pendingInvitation="friend.pendingInvitation"
            :isFriend="friend.isFriend"
            @action="handleAddFriend($event)"
          />
        </div>
        <button class="modal-btn" @click="handleClose">Fermer</button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import Modal from "./Modal.vue";
const SearchBar = defineAsyncComponent(() => import("./SearchBar.vue"));
const SearchBarUserCard = defineAsyncComponent(
  () => import("./SearchBarUserCard.vue")
);

const props = defineProps<{
  headerTitle?: string;
}>();
const emit = defineEmits(["close"]);
const searchQuery = ref("");
const users = [
  { name: "Bot Hugo", avatar: "🤖" },
  { name: "Bot Lidya", avatar: "🧛" },
  { name: "Bot Christine", avatar: "🤡" },
  { name: "Bot Frédéric", avatar: "🐺" },
  { name: "Bot Mistery", avatar: "🕵" },
];
const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  return users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const addedFriends = ref([
  { name: "Bot Hugo", avatar: "🤖", pendingInvitation: true, isFriend: false },
  { name: "Bot Lidya", avatar: "🧛", pendingInvitation: false, isFriend: true },
]);

function updateSearchQuery(searchQueryChanged: string) {
  console.log("Login Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}

function handleClose() {
  emit("close");
}
function handleAddFriend(e: { name: string; avatar: string }) {
  console.log("Add friend", e);
  // Ajoute l'ami avec pendingInvitation à true
  addedFriends.value.push({
    name: e.name,
    avatar: e.avatar,
    pendingInvitation: true,
    isFriend: false,
  });

  searchQuery.value = "";
  // Après 1 seconde, simule la validation (ami accepté)
  setTimeout(() => {
    const addedFriend = addedFriends.value.find((f) => f.name === e.name);
    if (addedFriend) {
      addedFriend.pendingInvitation = false;
      addedFriend.isFriend = true;
      // Pas besoin de filter/push, Vue est réactif sur les objets du tableau
      console.log("Friend validated", addedFriend);
    }
  }, 3000);
}

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
.modal-added-title {
  font-size: 0.99em;
  font-weight: 600;
  color: var(--modal-message-color);
  margin-bottom: 0.3rem;
  margin-left: 0.2rem;
}
</style>
