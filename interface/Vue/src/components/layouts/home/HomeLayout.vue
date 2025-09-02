<template>
  <MainLayout>
    <template #content>
      <div class="max-h-screen h-screen w-screen">
        <MobileHeader />
        <div class="relative flex transition-all w-screen h-full">
          <slot name="sidebar"></slot>
          <slot name="upper-chat"></slot>
          <slot name="chat"></slot>
        </div>
        <MobileMenuBar
          :sidebarExpended="sidebarExpended"
          @update-mobile-side-bar-click="updateSideBarExpended"
          @open-add-friend-modal="openAddFriendModal"
          @open-create-room-modal="openCreateRoomModal"
          @ask-logout="askLogout"
        />
      </div>
      <InfoModal
        v-if="showLogoutModal"
        headerTitle="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        type="warning"
        @onOk="onConfirmLogout"
      />
      <AddFriendModal
        v-if="addFriendModalisOpen"
        headerTitle="Ajouter un ami"
        @close="closeAddFriendModal"
      />
      <CreateRoomModal
        v-if="createRoomModalisOpen"
        headerTitle="Créer une room"
        @close="closeCreateRoomModal"
      />
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import MobileMenuBar from "./mobile/MobileMenuBar.vue";
import MobileHeader from "./mobile/MobileHeader.vue";
import MainLayout from "@layouts/MainLayout.vue";
import InfoModal from "@ui/modals/InfoModal.vue";
import AddFriendModal from "@ui/modals/AddFriendModal.vue";
import CreateRoomModal from "@ui/modals/CreateRoomModal.vue";

defineProps({
   sidebarExpended: Boolean,
});

const emit = defineEmits(["updateSideBarExpended", "logout"]);

defineExpose({
  askLogout,
  openAddFriendModal,
  openCreateRoomModal,
});

const addFriendModalisOpen = ref(false);
const createRoomModalisOpen = ref(false);
const showLogoutModal = ref(false);

function updateSideBarExpended(value: boolean) {
  emit("updateSideBarExpended", value);
}

function askLogout() {
  showLogoutModal.value = true;
}

async function onConfirmLogout() {
  // Close the modal, wait DOM update, then emit logout without timers
  showLogoutModal.value = false;
  await nextTick();
  emit('logout');
}

function openAddFriendModal() {
  addFriendModalisOpen.value = true;
}

function closeAddFriendModal() {
  addFriendModalisOpen.value = false;
}

function openCreateRoomModal() {
  createRoomModalisOpen.value = true;
}

function closeCreateRoomModal() {
  createRoomModalisOpen.value = false;
}
</script>
