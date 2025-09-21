import { defineStore } from 'pinia';
import { ref } from 'vue';
import { axiosService } from '@/services/axios/axios';

export interface UserDTO {
  id: string;
  name: string;
}

export const useUserStore = defineStore('userSearch', () => {
  // --- State ---
  const results = ref<UserDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Optional: simple in-memory cache keyed by q|limit to reduce spam
  const cache = new Map<string, UserDTO[]>();

  function keyOf(q: string, limit?: number) {
    return `${q}::${limit ?? 20}`;
  }

  async function searchUsers(q: string, limit = 20): Promise<UserDTO[]> {
    const key = keyOf(q, limit);
    if (cache.has(key)) {
      results.value = cache.get(key) || [];
      return results.value;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await axiosService.get<UserDTO[]>(`/chat/users/search`, {
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
  };
});
