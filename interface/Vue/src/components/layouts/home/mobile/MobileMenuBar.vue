<template>
  <!-- Barre mobile pour actions principales (visible uniquement sur mobile) -->
  <div
    class="absolute bottom-0 left-0 right-0 w-full flex justify-around items-center z-40 py-2 px-3 bg-[var(--background)]/80 backdrop-blur-md border-t border-[var(--color-text)]/10 transition-all md:hidden"
    style="box-shadow: 0 -2px 12px 0 rgba(0, 0, 0, 0.09)"
  >
    <!-- Conversations (sidebar) -->
    <button
      class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
      @click="updateSideBarClick(!sidebarExpended)"
      title="Conversations"
    >
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="11" width="18" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="16" width="18" height="2.5" rx="1" fill="currentColor" />
      </svg>
      <span class="text-xs mt-0.5">Convs</span>
    </button>
    <!-- Ajouter un ami -->
    <button
      class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
      @click="openAddFriendModal()"
      title="Ajouter un ami"
    >
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
        <path
          d="M12 8v8M8 12h8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <span class="text-xs mt-0.5">Ami</span>
    </button>
    <!-- Créer une room -->
    <button
      class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
      @click="openCreateRoomModal()"
      title="Créer une room"
    >
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
        <rect
          x="5"
          y="8"
          width="14"
          height="8"
          rx="2"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M12 12v3"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <span class="text-xs mt-0.5">Room</span>
    </button>
    <!-- Paramètres -->
    <button
      class="flex flex-col items-center text-[var(--color-text)] focus:outline-none"
      @click="askLogout()"
      title="Paramètres"
    >
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <path
          d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
          stroke="currentColor"
          stroke-width="2"
        />
      </svg>
      <span class="text-xs mt-0.5">Param</span>
    </button>
    <!-- Déconnexion -->
    <button
      class="flex flex-col items-center text-red-500 focus:outline-none"
      @click="askLogout()"
      title="Déconnexion"
    >
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
        <path
          d="M15 12H3"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path
          d="M19 7v10M19 12l-4-4m4 4l-4 4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <span class="text-xs mt-0.5">Quitter</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps({
  sidebarExpended: Boolean,
});
const emit = defineEmits([
  "openAddFriendModal",
  "openCreateRoomModal",
  "askLogout",
  "update-mobile-side-bar-click",
]);

function updateSideBarClick(value: boolean) {
  emit("update-mobile-side-bar-click", value);
}

function askLogout() {
  emit("askLogout");
}

function openAddFriendModal() {
  emit("openAddFriendModal");
}

function openCreateRoomModal() {
  emit("openCreateRoomModal");
}
</script>