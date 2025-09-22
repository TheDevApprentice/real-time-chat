import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';
import { axiosService } from '@/services/axios/axios';
import { getToken } from '@/utils/cookieHelper';


export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const isAuthenticated = ref(false);
  const user = ref<string>("");
  const userId = ref<string>("");
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Actions ---

  // --- Auth via socket.io-client ---
  // --- Socket event listeners ---
  let listenersBound = false;
  function bindSocketListeners() {
    if (listenersBound) return;
    listenersBound = true;
    // Server emits this when a valid session cookie is present during connection
    socketService.on('sessionRestored', (payload: any) => {
      isAuthenticated.value = true;
      user.value = payload?.user?.name ?? payload?.user?.username ?? null;
      userId.value = payload?.user?.id ?? null;
      error.value = null;
      loading.value = false;
    });
    // Server can force logout across devices
    socketService.on('forceLogout', () => {
      try { socketService.disconnect(); } catch {}
      isAuthenticated.value = false;
      user.value = "";
      loading.value = false;
      error.value = null;
    });
  }
  bindSocketListeners();

  async function tryAutoAuth(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // Always connect so server can inspect HttpOnly cookie and emit 'sessionRestored'
      if (!socketService.isConnected()) socketService.connect();

      const token = getToken('session_token');

      const result = await new Promise<boolean>((resolve) => {
        // One-time handler for server-side restored session via cookie
        const onRestored = (payload: any) => {
          isAuthenticated.value = true;
          user.value = payload?.user?.name ?? payload?.user?.username ?? null;
          error.value = null;
          loading.value = false;
          socketService.off('sessionRestored', onRestored as any);
          resolve(true);
        };
        socketService.on('sessionRestored', onRestored as any);

        // If we also have a readable token, try explicit authenticate as a fallback/fast-path
        if (token) {
          socketService.emit('authenticate', { token }, (res: any) => {
            if (res && res.success) {
              isAuthenticated.value = true;
              user.value = res?.user?.name || null;
              error.value = null;
              loading.value = false;
              socketService.off('sessionRestored', onRestored as any);
              resolve(true);
            }
          });
        }

        // Soft timeout: resolve with current state after a short delay
        setTimeout(() => {
          socketService.off('sessionRestored', onRestored as any);
          loading.value = false;
          resolve(!!isAuthenticated.value);
        }, 1500);
      });

      if (!result) {
        isAuthenticated.value = false;
        user.value = "";
      }
      return result;
    } catch (e: any) {
      isAuthenticated.value = false;
      user.value = "";
      error.value = e?.data?.error || e?.message || 'Session invalide';
      loading.value = false;
      return false;
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    // Connect WS first so auth handshake is possible
    socketService.connect();
    return new Promise<boolean>((resolve) => {
      socketService.emit('login', { username, password }, async (res: any) => {
        if (res && res.error) {
          error.value = res.error;
          isAuthenticated.value = false;
          user.value = "";
          loading.value = false;
          resolve(false);
          return;
        }
        // Success: set state
        isAuthenticated.value = true;
        user.value = res?.name || res?.user?.name || null;
        error.value = null;
        // Ask backend to set secure HttpOnly cookie from token
        if (res?.token) {
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
      // REST: POST /auth/register (base URL comes from VITE_API_BASE_URL which points to /api)
      const res = await axiosService.post<{ id: string; name: string }>(
        '/auth/register',
        { username, password, confirmPassword: confirm }
      );
      if (!res.success) {
        error.value = (res.data as any)?.error || 'Inscription échouée.';
        loading.value = false;
        return false;
      }
      // Success: prompt to login
      error.value = 'Compte créé avec succès ! Connectez-vous.';
      loading.value = false;
      return true;
    } catch (e: any) {
      error.value = e?.data?.error || e?.message || 'Inscription échouée.';
      loading.value = false;
      return false;
    }
  }

  async function logout(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await new Promise<boolean>((resolve) => {
        const token = getToken("session_token");
        console.log("token", token);
        if (!token) return resolve(false);
        // Send empty payload; server reads session from socket. If it expects token and fails, we'll fallback.
        socketService.emit('logout', { token }, (res: any) => {
          if (res && res.error) return resolve(false);
          resolve(true);
        });
      });
      socketService.disconnect();
      isAuthenticated.value = false;
      user.value = "";
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
    userId,
    loading,
    error,
    login,
    register,
    logout,
    tryAutoAuth,
  };
});
