import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';

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
  const isAuthenticated = ref(true);
  const user = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Actions ---

  // --- Auth via socket.io-client ---

  function tryAutoAuth() {
    const token = getCookie('sessionToken');
    if (!token) return false;
    loading.value = true;
    socketService.connect();
    socketService.emit('authenticate', { token }, (res: any) => {
      if (res && res.success) {
        isAuthenticated.value = true;
        user.value = res.name;
        error.value = null;
      } else {
        isAuthenticated.value = false;
        user.value = null;
        error.value = res?.error || 'Session invalide';
        eraseCookie('sessionToken');
      }
      loading.value = false;
    });
  }

  async function login(username: string, password: string) {
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

  async function register(username: string, password: string, confirm: string) {
    loading.value = true;
    error.value = null;
    socketService.connect();
    return new Promise<boolean>((resolve) => {
      socketService.emit('register', { username, password, confirmPassword: confirm }, (res: any) => {
        if (res && res.error) {
          error.value = res.error;
          loading.value = false;
          resolve(false);
          return;
        }
        // Succès inscription, invite à se connecter
        error.value = 'Compte créé avec succès ! Connectez-vous.';
        loading.value = false;
        resolve(true);
      });
    });
  }

  async function logout() {
    loading.value = true;
    error.value = null;
    socketService.emit('logout', {}, (res: any) => {
      isAuthenticated.value = false;
      user.value = null;
      eraseCookie('sessionToken');
      loading.value = false;
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
