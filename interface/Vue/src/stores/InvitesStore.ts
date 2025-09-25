import { defineStore } from 'pinia';
import { ref } from 'vue';
import { axiosService } from '@/services/axios/axios';
import { socketService } from '@/services/websocket/websocket';

export const useInvitesStore = defineStore('invites', () => {
  const creating = ref(false);
  const consuming = ref(false);
  const error = ref<string | null>(null);
  const lastShareUrl = ref<string | null>(null);

  async function createInviteForRoom(roomId: string): Promise<{ token?: string; shareUrl?: string; error?: string }>{
    error.value = null; creating.value = true; lastShareUrl.value = null;
    try {
      const res = await axiosService.post<{ token: string; expiresIn: number }>(`/api/chat/invite`, { roomId });
      if (!res.success || !(res.data as any)?.token) {
        const e = (res.data as any)?.error || 'Impossible de créer une invitation';
        error.value = e; creating.value = false; return { error: e };
      }
      const token = (res.data as any).token as string;
      const shareUrl = `${location.origin}/api/chat/invite/${encodeURIComponent(token)}`;
      lastShareUrl.value = shareUrl;
      creating.value = false;
      return { token, shareUrl };
    } catch (e: any) {
      const msg = e?.message || 'Erreur réseau';
      error.value = msg; creating.value = false; return { error: msg };
    }
  }

  async function consumeInviteToken(raw: string): Promise<{ roomId?: string; error?: string }>{
    error.value = null; consuming.value = true;
    try {
      let token = raw.trim();
      try {
        if (/^https?:\/\//i.test(token)) {
          const u = new URL(token);
          const parts = u.pathname.split('/').filter(Boolean);
          token = parts[parts.length - 1] || token;
        }
      } catch { /* keep token */ }
      const res = await axiosService.get<{ token: string; payload?: { roomId: string } }>(`/api/chat/invite/${encodeURIComponent(token)}`);
      if (!res.success || !(res.data as any)?.payload?.roomId) {
        const e = (res.data as any)?.error || 'Invitation invalide ou expirée';
        error.value = e; consuming.value = false; return { error: e };
      }
      const roomId = (res.data as any).payload.roomId as string;
      // Join via socket so other events flow
      await new Promise<void>((resolve) => socketService.emit('joinRoom', { roomId }, () => resolve()));
      consuming.value = false;
      return { roomId };
    } catch (e: any) {
      const msg = e?.message || 'Erreur réseau';
      error.value = msg; consuming.value = false; return { error: msg };
    }
  }

  return {
    creating,
    consuming,
    error,
    lastShareUrl,
    createInviteForRoom,
    consumeInviteToken,
  };
});
