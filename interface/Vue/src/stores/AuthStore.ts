import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';
import { axiosService } from '@/services/axios/axios';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const isAuthenticated = ref(false);
  const user = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Actions ---

  // --- Auth via socket.io-client ---

  async function tryAutoAuth(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // Cookie-first: backend will read HttpOnly cookie and return the user
      const res = await axiosService.get<{ id: string; name: string }>("/auth/me");
      if (!res.success) {
        isAuthenticated.value = false;
        user.value = null;
        loading.value = false;
        return false;
      }
      isAuthenticated.value = true;
      user.value = res.data.name;
      // Connect socket; server will restore session from cookie
      socketService.connect();
      loading.value = false;
      return true;
    } catch (e: any) {
      isAuthenticated.value = false;
      user.value = null;
      error.value = e?.data?.error || e?.message || 'Session invalide';
      loading.value = false;
      return false;
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    socketService.connect();
    return new Promise<boolean>((resolve) => {
      socketService.emit('login', { username, password }, async (res: any) => {
        if (res && res.error) {
          error.value = res.error;
          isAuthenticated.value = false;
          user.value = null;
          loading.value = false;
          resolve(false);
          return;
        }
        // Succès
        isAuthenticated.value = true;
        user.value = res.name;
        error.value = null;
        // Demander au serveur de placer un cookie HttpOnly sécurisé
        if (res.token) {
          try {
            await axiosService.post('/auth/session-cookie', { token: res.token });
          } catch (e) {
            console.warn('Failed to set HttpOnly cookie from server:', e);
          }
        }
        loading.value = false;
        resolve(true);
      });
    });
  }

  async function register(username: string, password: string, confirm: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // REST: POST /api/auth/register (base URL comes from VITE_API_BASE_URL)
      const res = await axiosService.post<{ id: string; name: string }>(
        '/auth/register',
        { username, password, confirmPassword: confirm }
      );
      if (!res.success) {
        error.value = (res.data as any)?.error || 'Inscription échouée.';
        loading.value = false;
        return false;
      }
      // Succès inscription, invite à se connecter
      error.value = 'Compte créé avec succès ! Connectez-vous.';
      loading.value = false;
      return true;
    } catch (e: any) {
      // e is formatted by axiosService.formatError when available
      error.value = e?.data?.error || e?.message || 'Inscription échouée.';
      loading.value = false;
      return false;
    }
  }

  async function logout(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // Ask server to revoke all sessions for current user and clear cookie
      const res = await axiosService.delete<{ success: boolean }>("/user/sessions");
      if (!res.success) {
        error.value = (res.data as any)?.error || 'Déconnexion échouée.';
        loading.value = false;
        return false;
      }
      socketService.disconnect();
      isAuthenticated.value = false;
      user.value = null;
      loading.value = false;
      return true;
    } catch (e: any) {
      error.value = e?.data?.error || e?.message || 'Déconnexion échouée.';
      loading.value = false;
      return false;
    }
  }

  return {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    register,
    logout,
    tryAutoAuth,
  };
});
