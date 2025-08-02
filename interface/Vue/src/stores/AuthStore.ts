import { defineStore } from 'pinia';
import { ref } from 'vue';
import axiosService from '../services/axios/axios';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const isAuthenticated = ref(false);
  const user = ref<string | null>(null);
  const preferences = ref<any | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Actions ---

  // Get user display name
  async function getUserDisplayName() {
    if (import.meta.env.DEV) {
      console.log('[AuthStore] getUserDisplayName called');
    }
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosService.get('/api/user/display-name');
      if (import.meta.env.DEV) {
        console.log('[AuthStore] getUserDisplayName response', response.data);
      }
      if (response.data && response.data.displayName) {
        user.value = response.data.displayName;
        return true;
      } else {
        error.value = 'Nom d\'affichage non trouvé';
        return false;
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthStore] getUserDisplayName error', err);
      }
      error.value = err?.message + ' getUserDisplayName method' || 'Erreur lors de la récupération du nom d\'affichage.';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Get user preferences
  async function getUserPreference() {
    if (import.meta.env.DEV) {
      console.log('[AuthStore] getUserPreference called');
    }
    loading.value = true;
    preferences.value = null;
    error.value = null;
    try {
      const response = await axiosService.get('/api/user/preference');
      if (import.meta.env.DEV) {
        console.log('[AuthStore] getUserPreference response', response.data);
      }
      if (response.data && response.data.preferences) {
        preferences.value = response.data.preferences;
        return true;
      } else {
        error.value = 'Préférences non trouvées';
        return false;
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthStore] getUserPreference error', err);
      }
      error.value = err?.message + ' getUserPreference method' || 'Erreur lors de la récupération des préférences.';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Login
  async function login(username: string, password: string) {
    if (import.meta.env.DEV) {
      console.log('[AuthStore] login called', { username });
    }
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosService.post('/api/login', { username, password });
      if (import.meta.env.DEV) {
        console.log('[AuthStore] login response', response.data);
      }
      if (response.data.success) {
        isAuthenticated.value = true;
        const responseCsrf = await axiosService.get('/api/csrf');
        console.log('[AuthStore] csrf response', responseCsrf.data);

        const responseHello = await axiosService.get('/api/hello');
        console.log('[AuthStore] hello response', responseHello.data);
        return true;
      } else {
        error.value = response.data.message + ' login method';
        isAuthenticated.value = false;
        return false;
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthStore] login error', err);
      }
      error.value = err?.message + ' login method' || 'Erreur lors de la connexion.';
      isAuthenticated.value = false;
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Reauth
  async function reauth() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axiosService.get('/api/reauth');
      if (response.data.success) {
        isAuthenticated.value = true;
        if (import.meta.env.DEV) {
          console.log('[AuthStore] reauth success', response.data);
        }
        return true;
      } else {
        isAuthenticated.value = false;
        error.value = response.data.message;
        return false;
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthStore] reauth error', err);
      }
      isAuthenticated.value = false;
      error.value = err?.message || 'Erreur lors de la reauth.';
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Logout
  async function logout() {
    if (import.meta.env.DEV) {
      console.log('[AuthStore] logout called');
    }
    loading.value = true;
    try {
      await axiosService.get('/api/logout');
      if (import.meta.env.DEV) {
        console.log('[AuthStore] logout success');
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AuthStore] logout error', err);
      }
      // Ignorer l'erreur
    } finally {
      isAuthenticated.value = false;
      loading.value = false;
    }
  }


  return {
    isAuthenticated,
    user,
    preferences,
    loading,
    error,
    login,
    logout,
    reauth,
    getUserDisplayName,
    getUserPreference
  };
});
