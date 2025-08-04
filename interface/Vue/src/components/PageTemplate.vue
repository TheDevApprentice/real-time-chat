<template>
  <Suspense>
    <template #default>
      <div class="page-template">
        <div class="page-template-header">
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
          <div class="header-actions">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
        <slot name="content" />
      </div>
    </template>
    <template #fallback>
      <LoadingOverlay />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import { useAuthStore } from "../stores/AuthStore";
const ThemeSwitcher = defineAsyncComponent(() => import("./ThemeSwitcher.vue"));
const LanguageSwitcher = defineAsyncComponent(
  () => import("./LanguageSwitcher.vue")
);
const LoadingOverlay = defineAsyncComponent(
  () => import("./LoadingOverlay.vue")
);
const SearchBar = defineAsyncComponent(
  () => import("../components/SearchBar.vue")
);
const SearchBarUserCard = defineAsyncComponent(
  () => import("../components/SearchBarUserCard.vue")
);

const searchQuery = ref("");
const authStore = useAuthStore();

const users = [
  { name: "Bot Hugo", avatar: "🤖" },
  { name: "Bot Lidya", avatar: "🧛" },
  { name: "Bot Christine", avatar: "🤡" },
];

const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  return users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function updateSearchQuery(searchQueryChanged: string) {
  console.log("Login Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}
</script>

<style scoped>
.page-template {
  background: var(--color-background);
}
.page-template-header {
  width: 100%;
  display: flex;
  z-index: 10;
}
.header-actions {
  display: flex;
  justify-self: flex-end;
  align-self: flex-start;
  gap: 0.7rem;
  z-index: 30;
  position: fixed;
  padding: 1.3rem 2.2rem 0.5rem 0;

  top: 0;
  right: 0;
}
.search-bar {
  display: flex;
  justify-self: center;
  align-self: center;
  gap: 0.7rem;
  z-index: 30;
  position: fixed;
  padding: 1.3rem 2.2rem 0.5rem 0;
  top: -0.3rem;
  left: 50%;
  transform: translateX(-50%);
}

</style>
