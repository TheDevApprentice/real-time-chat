import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { axiosService } from '@/services/axios/axios';
import { useAuthStore } from './AuthStore';
import { useFriendsStore } from './FriendsStore';

export interface UserDTO {
  id: string;
  name: string;
}

export const useUserStore = defineStore('userSearch', () => {
  // --- Stores ---
  const authStore = useAuthStore();
  const friendsStore = useFriendsStore();
  
  // --- State ---
  const results = ref<UserDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Optional: simple in-memory cache keyed by q|limit to reduce spam
  const cache = new Map<string, UserDTO[]>();

  function keyOf(q: string, limit?: number) {
    return `${q}::${limit ?? 20}`;
  }

  // Users for the search bar (mapped from REST /chat/users/search)
const users = ref<Array<{ id: string; name: string; avatar: string; isOnline: boolean; pendingInvitation: boolean; isFriend: boolean; incoming: boolean; outgoing: boolean; }>>([]);
const searchQuery = ref<string>("");
const filteredUsers = computed(() => {
  if (!searchQuery.value) return [];
  const userId = authStore.userId;
  if (!userId) return [];
  return users.value.filter((u) => u.id !== userId);  
});

function updateSearchQuery(searchQueryChanged: string) {
  console.log("Home Page searchQuery changed : ", searchQueryChanged);
  searchQuery.value = searchQueryChanged;
}
// Search bar: call REST search and merge with FriendsStore to expose presence and relation flags
watch(searchQuery, async (q) => {
  const s = String(q || '').trim();
  if (!s) { users.value = []; return; }
  const list = await searchUsers(s, 20);
  // Build quick lookup sets from FriendsStore
  const acceptedSet = new Set((friendsStore.friends || []).map(i => i.userId));
  const pendingInSet = new Set((friendsStore.pendingIncoming || []).map(i => i.userId));
  const pendingOutSet = new Set((friendsStore.pendingOutgoing || []).map(i => i.userId));

  users.value = list.map(u => {
    const id = u.id;
    const name = u.name;
    const avatar = (name || '?').trim().charAt(0).toUpperCase() || '?';
    const isFriend = acceptedSet.has(id);
    const outgoing = pendingOutSet.has(id);
    const incoming = pendingInSet.has(id);
    const pendingInvitation = outgoing || incoming;
    const isOnline = friendsStore.presence?.[id]?.status === 'online';
    // Opportunistically fetch presence for accepted friends that are missing
    if (isFriend && !friendsStore.presence?.[id]) {
      friendsStore.ensurePresence(id).catch(() => undefined);
    }
    return { id, name, avatar, isOnline, pendingInvitation, isFriend, incoming, outgoing };
  });
  console.log("users", users.value);
});
  async function searchUsers(q: string, limit = 20): Promise<UserDTO[]> {
    const key = keyOf(q, limit);
    if (cache.has(key)) {
      results.value = cache.get(key) || [];
      return results.value;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await axiosService.get<UserDTO[]>(`/api/chat/users/search`, {
        params: { q, limit },
        // keep defaults: withCredentials true from axiosService
      });
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        results.value = list;
        cache.set(key, list);
        return list;
      } else {
        error.value = (res.data as any)?.error || 'Search failed';
        results.value = [];
        return [];
      }
    } catch (e: any) {
      error.value = e?.message || 'Search failed';
      results.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  function clearResults() {
    results.value = [];
  }

  return {
    results,
    loading,
    error,
    searchUsers,
    clearResults,
    users,
    searchQuery,
    filteredUsers,
    updateSearchQuery,
  };
});
