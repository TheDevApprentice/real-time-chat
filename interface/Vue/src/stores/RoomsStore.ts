import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socketService } from '@/services/websocket/websocket';

export interface RoomDTO {
  id: string;
  name: string;
  creatorId: string;
  isPublic: boolean;
  type?: 'room' | 'user';
  users?: Array<{ id: string; name: string }>;
}

export const useRoomsStore = defineStore('rooms', () => {
  // --- State ---
  const rooms = ref<RoomDTO[]>([]);
  const unreadCounts = ref<Record<string, number>>({});
  const roomUsers = ref<Record<string, Array<{ id: string; name: string }>>>({});
  const roomOnline = ref<Record<string, number>>({});
  const typingCount = ref<Record<string, number>>({});
  const typingUsers = ref<Record<string, Record<string, boolean>>>({});

  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Derived ---
  const roomsById = computed(() => {
    const map: Record<string, RoomDTO> = {};
    for (const r of rooms.value) map[r.id] = r;
    return map;
  });

  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    socketService.on('rooms', (list: RoomDTO[]) => {
      rooms.value = Array.isArray(list) ? list : [];
    });
    socketService.on('unreadCounts', (p: any) => {
      if (p && p.counts) unreadCounts.value = p.counts as Record<string, number>;
    });
    socketService.on('roomUsers', (p: any) => {
      const rid = p?.roomId as string; const users = p?.users as Array<{ id: string; name: string }>;
      if (rid && Array.isArray(users)) roomUsers.value = { ...roomUsers.value, [rid]: users };
    });
    socketService.on('roomOnline', (p: any) => {
      const rid = p?.roomId as string; const count = Number(p?.count ?? 0) || 0;
      if (rid) roomOnline.value = { ...roomOnline.value, [rid]: Math.max(0, count) };
    });
    socketService.on('typing', (p: any) => {
      const rid = String(p?.roomId || ''); const uid = String(p?.userId || ''); const t = !!p?.typing;
      if (!rid || !uid) return;
      const ru = typingUsers.value[rid] ? { ...typingUsers.value[rid] } : {};
      if (t) ru[uid] = true; else delete ru[uid];
      typingUsers.value = { ...typingUsers.value, [rid]: ru };
    });
    socketService.on('typingCount', (p: any) => {
      const rid = String(p?.roomId || ''); const count = Number(p?.count ?? 0) || 0;
      if (!rid) return;
      typingCount.value = { ...typingCount.value, [rid]: Math.max(0, count) };
    });
  }
  bindSocketListeners();

  // --- Actions ---
  function getRooms(): Promise<{ success: boolean; error?: string }>{
    loading.value = true; error.value = null;
    return new Promise((resolve) => {
      socketService.emit('getRooms', {}, (res: any) => {
        loading.value = false;
        if (!res?.success && res?.error) error.value = res.error;
        resolve(res);
      });
    });
  }

  function createRoom(args: { name: string; type?: 'room' | 'user'; isPublic?: boolean; invitedUserIds?: string[] }): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('createRoom', args, resolve));
  }

  function joinRoom(roomId: string): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('joinRoom', { roomId }, resolve));
  }

  function typingStart(roomId: string): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('typingStart', { roomId }, resolve));
  }
  function typingStop(roomId: string): Promise<{ success: boolean; error?: string }>{
    return new Promise((resolve) => socketService.emit('typingStop', { roomId }, resolve));
  }

  function getTopActiveRooms(limit = 10): Promise<{ success: boolean; items: RoomDTO[] }>{
    return new Promise((resolve) => socketService.emit('getTopActiveRooms', { limit }, resolve));
  }

  function getRoomLastMessage(roomId: string): Promise<{ success: boolean; roomId: string; message: any }>{
    return new Promise((resolve) => socketService.emit('getRoomLastMessage', { roomId }, resolve));
  }

  function getRoomMessageCounts(roomId: string, range: 'hour' | 'day' = 'hour', from?: number, to?: number): Promise<{ success: boolean; items: Array<{ bucket: string; count: number }> }>{
    return new Promise((resolve) => socketService.emit('getRoomMessageCounts', { roomId, range, from, to }, resolve));
  }

  return {
    rooms,
    roomsById,
    unreadCounts,
    roomUsers,
    roomOnline,
    typingUsers,
    typingCount,
    loading,
    error,
    getRooms,
    createRoom,
    joinRoom,
    typingStart,
    typingStop,
    getTopActiveRooms,
    getRoomLastMessage,
    getRoomMessageCounts,
  };
});
