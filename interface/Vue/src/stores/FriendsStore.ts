import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService } from '@/services/websocket/websocket';

export interface FriendListItemDTO {
  userId: string;           // friend or other user id
  status: 'accepted' | 'pending' | 'rejected';
  direction?: 'outgoing' | 'incoming';
  user?: { id: string; name: string; avatar?: string };
}

export type FriendAction = 'accept' | 'reject';

export const useFriendsStore = defineStore('friends', () => {
  // --- State ---
  const items = ref<FriendListItemDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // presence for friends only (updated via presenceChanged broadcast)
  const presence = ref<Record<string, { status: 'online' | 'offline'; lastSeen: number | null }>>({});

  // --- Derived ---
  const friends = computed(() => items.value.filter(i => i.status === 'accepted'));
  const pendingIncoming = computed(() => items.value.filter(i => i.status === 'pending' && i.direction === 'incoming'));
  const pendingOutgoing = computed(() => items.value.filter(i => i.status === 'pending' && i.direction === 'outgoing'));

  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    // Server pushes updates on requests/responds
    socketService.on('friendUpdated', (p: any) => {
      const t = p?.type as 'request' | 'respond' | undefined;
      const data = p?.data as FriendListItemDTO | undefined;
      if (!t || !data) return;
      // merge/update in items list by userId
      const idx = items.value.findIndex(it => it.userId === (data.userId || data.user?.id));
      const merged: FriendListItemDTO = {
        userId: data.userId || data.user?.id || '',
        status: data.status as any,
        direction: (data as any).direction,
        user: data.user,
      };
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...merged };
      else items.value.push(merged);
    });

    // Presence updates for friends
    socketService.on('presenceChanged', (p: any) => {
      const uid = String(p?.userId || '');
      if (!uid) return;
      const st = String(p?.status || 'offline') as 'online' | 'offline';
      const lastSeen = typeof p?.lastSeen === 'number' ? p.lastSeen : (st === 'online' ? null : Date.now());
      presence.value = { ...presence.value, [uid]: { status: st, lastSeen } };
    });
  }
  bindSocketListeners();

  // --- Actions ---
  function friendList(): Promise<{ success: boolean; items?: FriendListItemDTO[]; error?: string }>{
    loading.value = true; error.value = null;
    return new Promise((resolve) => {
      socketService.emit('friendList', {}, (res: any) => {
        loading.value = false;
        if (res?.success && Array.isArray(res.items)) {
          items.value = res.items as FriendListItemDTO[];
          resolve({ success: true, items: items.value });
        } else {
          error.value = res?.error || 'Failed to load friend list';
          resolve({ success: false, error: error.value || undefined });
        }
      });
    });
  }

  function friendRequest(targetUserId: string): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => {
      socketService.emit('friendRequest', { targetUserId }, (res: any) => {
        if (!res?.success && res?.error) error.value = res.error;
        resolve({ ...(res||{}), error: res?.error || undefined });
      });
    });
  }

  function friendRespond(otherUserId: string, action: FriendAction): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => {
      socketService.emit('friendRespond', { otherUserId, action }, (res: any) => {
        if (!res?.success && res?.error) error.value = res.error;
        resolve({ ...(res||{}), error: res?.error || undefined });
      });
    });
  }

  return {
    items,
    friends,
    pendingIncoming,
    pendingOutgoing,
    presence,
    loading,
    error,
    friendList,
    friendRequest,
    friendRespond,
  };
});
