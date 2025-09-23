import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import { socketService } from '@/services/websocket/websocket';
import type { Conversation } from '@/components/home/chatZone/SideBarConversations.vue';
import type { Bubble } from '@/components/login/chat/view/ChatBubble.vue';
import { useAuthStore } from './AuthStore';
import { useFriendsStore } from './FriendsStore';
import { useMessagesStore } from './MessagesStore';
import { useDeviceStore } from './DeviceStore';

export interface RoomDTO {
  id: string;
  name: string;
  creatorId: string;
  isPublic: boolean;
  type?: 'room' | 'user';
  users?: Array<{ id: string; name: string }>;
}

export const useRoomsStore = defineStore('rooms', () => {
  // --- Stores ---
  const authStore = useAuthStore();
  const friendsStore = useFriendsStore();
  const messagesStore = useMessagesStore();
  const deviceStore = useDeviceStore();

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

  const searchQuery = ref("");

// Filtrage des conversations selon le searchQuery (titre, participants, dernier message)
const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversations.value;
  const q = searchQuery.value.toLowerCase();
  return conversations.value.filter((conv) => {
    // Recherche sur le titre
    if (conv.name && conv.name.toLowerCase().includes(q)) return true;
    // Recherche sur le texte des messages
    if (conv.messages.some((msg) => msg.text.toLowerCase().includes(q)))
      return true;
    // Recherche sur les participants
    if (conv.participants.some((p) => p.name.toLowerCase().includes(q)))
      return true;
    // Recherche sur le texte du dernier message
    if (
      conv.messages.length > 0 &&
      conv.messages[conv.messages.length - 1].text.toLowerCase().includes(q)
    )
      return true;
    return false;
  });
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

  // Active rooms tracking for ChatGrid (device-aware)
  const activeRoomIds = ref<string[]>([]);
    // Map store Rooms/Messages to the Conversation/Bubble shapes expected by child components
  const conversations = computed<Conversation[]>(() => {
    const myId = authStore.userId;
    const friends = friendsStore.friends;
    return rooms.value.map((r) => {
      // Compute display label and avatar
      let label = r.name || (r.type === 'user' ? 'DM' : 'Room');
      let avatar = (label || '?').trim().charAt(0).toUpperCase();
      if (r.type === 'user') {
        const meId = myId || undefined;
        const members: Array<{ id: string; name: string, avatar: string, isOnline: boolean }> = Array.isArray((r as any).users) ? (r as any).users : [];
        const other = members.find((u) => !meId || u.id !== meId) || members[0];
        if (other?.name) {
          label = other.name;
          avatar = (other.name || '?').trim().charAt(0).toUpperCase();
        }
      }
      // Map messages for this room
      const rs = messagesStore.byRoom[r.id] || { items: [] } as any;
      const bubbles: Bubble[] = (rs.items as any[]).map((m) => {
        const authorId = (m?.author?.id as string | undefined) || undefined;
        const speaker = myId && authorId && myId === authorId ? 0 : 1;
        const date = typeof m?.timestamp === 'number' ? new Date(m.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
        // We do not track isTyping/isWriting in message entries; typing is separate in RoomsStore
        return {
          text: String(m?.content || ''),
          speaker,
          date,
          isTyping: false,
          isWriting: false,
          isSent: true,
          isRead: !!m?.edited ? true : true,
        } as Bubble;
      });
      return {
        id: (r as any).id,
        participants: Array.isArray((r as any).users)
          ? (r as any).users.map((u: any) => {
              const uid = String(u?.id || '');
              const name = u?.name || 'User';
              const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
              const isOnline = friendsStore.presence?.[uid]?.status === 'online' || false;
              return { id: uid, name, avatar: initial, isOnline };
            })
          : [],
        avatar,
        name: label,
        type: (r as any).type === 'user' ? 'user' : 'room',
        messages: bubbles,
        active: activeRoomIds.value.includes(String((r as any).id)),
        mostRecent: true,
      } as Conversation;
    });
  });
  
  function closeConversation(conv: Conversation) {
    const rid = String((conv as any).id || '');
    if (!rid) return;
    const arr = activeRoomIds.value.slice().filter(id => id !== rid);
    activeRoomIds.value = arr;
    // If the closed room was the active one, switch MessagesStore activeRoomId to the newest remaining
    const currentActive = messagesStore.getActiveRoomId();
    if (currentActive === rid) {
      const next = arr[arr.length - 1] || null;
      messagesStore.setActiveRoom(next);
    }
  }
  // Open a conversation with device-aware limits
async function openConversation(conv: Conversation) {
  try {
    const rid = String((conv as any).id || '');
    if (!rid) return;
    // Join room to ensure data
    try { await joinRoom(rid); } catch {}
    messagesStore.setActiveRoom(rid);
    // Determine device-based max open chats
    const maxChats = deviceStore.isMobile ? 1 : (deviceStore.isTablet ? 2 : 4);
    // Update activeRoomIds preserving order and uniqueness
    const arr = activeRoomIds.value.slice().filter(id => id !== rid);
    arr.push(rid);
    while (arr.length > maxChats) arr.shift();
    activeRoomIds.value = arr;
  } catch {}
}
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

  // === Lifecycle wiring ===
  onMounted(async () => {
    try { await getRooms(); } catch {}
  });
  return {
    activeRoomIds,
    conversations,
    rooms,
    roomsById,
    unreadCounts,
    roomUsers,
    roomOnline,
    typingUsers,
    typingCount,
    loading,
    error,
    searchQuery,
    filteredConversations,
    getRooms,
    createRoom,
    joinRoom,
    typingStart,
    typingStop,
    getTopActiveRooms,
    getRoomLastMessage,
    getRoomMessageCounts,
    closeConversation,
    openConversation
  };
});
