<template>
  <Suspense>
    <template #default>
      <MainLayout>
        <template #content>
          <div class="max-h-screen">
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
            v-if="showInfoModal"
            headerTitle="Déconnexion"
            message="Êtes-vous sûr de vouloir vous déconnecter ?"
            type="warning"
            @onok="logout"
            @close="closeInfoModal"
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
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from "vue";
import LoadingOverlay from "../LoadingOverlay.vue";
import { useAuthStore } from "../../../stores/AuthStore";
import MobileMenuBar from "./mobile/MobileMenuBar.vue";
import MobileHeader from "./mobile/MobileHeader.vue";

const MainLayout = defineAsyncComponent(
  () => import("../../layouts/MainLayout.vue")
);
const InfoModal = defineAsyncComponent(
  () => import("../../ui/modals/InfoModal.vue")
);
const AddFriendModal = defineAsyncComponent(
  () => import("../../ui/modals/AddFriendModal.vue")
);
const CreateRoomModal = defineAsyncComponent(
  () => import("../../ui/modals/CreateRoomModal.vue")
);

defineProps({
   sidebarExpended: Boolean,
   askLogout: Function,
   openAddFriendModal: Function,
   openCreateRoomModal: Function,
   updateSideBarExpended: Function,
});

const emit = defineEmits(["updateSideBarExpended"]);

const authStore = useAuthStore();
const addFriendModalisOpen = ref(false);
const createRoomModalisOpen = ref(false);
const showInfoModal = ref(false);

function updateSideBarExpended(value: boolean) {
  emit("updateSideBarExpended", value);
}

function askLogout() {
  openInfoModal();
}

function openInfoModal() {
  showInfoModal.value = true;
}

function logout() {
  authStore.logout();
  closeInfoModal();
}

function closeInfoModal() {
  showInfoModal.value = false;
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
