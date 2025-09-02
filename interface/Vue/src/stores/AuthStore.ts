import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';
import { axiosService } from '@/services/axios/axios';

function setCookie(name: string, value: string, days = 7) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
}
function eraseCookie(name: string) {
  document.cookie = name + '=; Max-Age=-99999999; path=/;';
}
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const isAuthenticated = ref(false);
  const user = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Actions ---

  // --- Auth via socket.io-client ---

  async function tryAutoAuth(): Promise<boolean> {
    const token = getCookie('sessionToken');
    if (!token) return false;
  
    loading.value = true;
    socketService.connect();
  
    return new Promise<boolean>((resolve) => {
      socketService.emit('authenticate', { token }, (res: any) => {
        console.log('AuthStore.tryAutoAuth res:', res);
        if (res && res.success) {
          console.log('AuthStore.tryAutoAuth success');
          isAuthenticated.value = true;
          user.value = res.name;
          error.value = null;
          loading.value = false;
          resolve(true);
        } else {
          console.log('AuthStore.tryAutoAuth fail');
          isAuthenticated.value = false;
          user.value = null;
          error.value = res?.error || 'Session invalide';
          eraseCookie('sessionToken');
          loading.value = false;
          resolve(false);
        }
      });
    });
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    socketService.connect();
    return new Promise<boolean>((resolve) => {
      socketService.emit('login', { username, password }, (res: any) => {
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
        if (res.token) setCookie('sessionToken', res.token);
        loading.value = false;
        resolve(true);
      });
    });
  }

  async function register(username: string, password: string, confirm: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // REST: POST /api/user/register (base URL comes from VITE_API_BASE_URL)
      const res = await axiosService.post<{ id: string; name: string }>(
        '/user/register',
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
    return new Promise<boolean>((resolve) => {
      const token = getCookie('sessionToken');
      socketService.emit('logout', { token }, (res: any) => {
        console.log('AuthStore.logout res:', res);
        if (res && res.error) {
          error.value = res?.error || null;
          resolve(false);
          return;
        }
        console.log('AuthStore.logout success');
        isAuthenticated.value = false;
        user.value = null;
        loading.value = false;
        eraseCookie('sessionToken');
        resolve(true);
      });
    });
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
