import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';
import { axiosService } from '@/services/axios/axios';
import { useAuthStore } from '@/stores/AuthStore';

export interface MessageDTO {
  id: number;
  content: string;
  author?: { id: string; name: string };
  timestamp?: number;
  edited?: boolean;
  deleted?: boolean;
  deliveredAt?: number;
  readAt?: number;
}

interface RoomHistoryState {
  items: MessageDTO[];
  nextCursor?: number;
  loading: boolean;
  loadedOnce: boolean;
}

function ensureRoom(state: Record<string, RoomHistoryState>, roomId: string): RoomHistoryState {
  if (!state[roomId]) state[roomId] = { items: [], loading: false, loadedOnce: false } as RoomHistoryState;
  return state[roomId];
}

export const useMessagesStore = defineStore('messages', () => {
  // --- Stores ---
  const auth = useAuthStore();

  // --- State ---
  // roomId -> state
  const byRoom = ref<Record<string, RoomHistoryState>>({});
  const activeRoomId = ref<string | null>(null);

  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    // Normalizer to keep types consistent for matching/status updates
    function normalizeMessage(m: any): MessageDTO {
      const idNum = Number((m?.id as any));
      const tsNum = Number((m?.timestamp as any));
      const deliveredNum = m?.deliveredAt != null ? Number(m.deliveredAt) : undefined;
      const readNum = m?.readAt != null ? Number(m.readAt) : undefined;
      return {
        id: Number.isFinite(idNum) ? idNum : (m?.id as any),
        content: String(m?.content ?? ''),
        author: m?.author ? { id: String((m.author as any)?.id ?? ''), name: String((m.author as any)?.name ?? '') } : undefined,
        timestamp: Number.isFinite(tsNum) ? tsNum : undefined,
        edited: !!m?.edited,
        deleted: !!m?.deleted,
        deliveredAt: Number.isFinite(deliveredNum as any) ? deliveredNum : undefined,
        readAt: Number.isFinite(readNum as any) ? readNum : undefined,
      } as MessageDTO;
    }

    // New message to a room
    socketService.on('message', (p: any) => {
      const rid = p?.roomId as string;
      const msg = normalizeMessage(p?.message);
      if (!rid || !msg) return;
      const rs = ensureRoom(byRoom.value, rid);
      // Append in order; avoid duplicates by id
      const exists = rs.items.find((m) => m.id === msg.id);
      if (!exists) rs.items.push(msg);
      // Auto-ack delivered/read if message is for the active room and not mine
      try {
        if (activeRoomId.value && activeRoomId.value === rid) {
          const authorName = (msg as any)?.author?.name as string | undefined;
          const myName = auth?.user || null;
          const mine = myName && authorName && myName === authorName;
          const mid = Number((msg as any)?.id);
          if (!mine && Number.isFinite(mid)) {
            const now = Date.now();
            socketService.emit('messageDelivered', { messageId: mid, roomId: rid, timestamp: now });
            socketService.emit('messageRead', { messageId: mid, roomId: rid, timestamp: now });
          }
        }
      } catch {}
    });

    // Initial room history received when joining a room (legacy push)
    socketService.on('roomHistory', (data: any) => {
      const rid = data?.roomId as string;
      const messages = Array.isArray(data?.messages) ? (data.messages as any[]).map(normalizeMessage) : [];
      if (!rid) return;
      const rs = ensureRoom(byRoom.value, rid);
      rs.items = messages.slice();
      rs.loadedOnce = true;
      rs.nextCursor = undefined; // unknown from legacy push
      // Auto-ack delivered/read for visible history in active room
      try {
        if (activeRoomId.value && activeRoomId.value === rid) {
          const myName = auth?.user || null;
          const now = Date.now();
          for (const m of messages) {
            const authorName = (m as any)?.author?.name as string | undefined;
            const mine = myName && authorName && myName === authorName;
            const mid = Number((m as any)?.id);
            if (!mine && Number.isFinite(mid)) {
              socketService.emit('messageDelivered', { messageId: mid, roomId: rid, timestamp: now });
              socketService.emit('messageRead', { messageId: mid, roomId: rid, timestamp: now });
            }
          }
        }
      } catch {}
    });

    // Message edited
    socketService.on('messageEdited', (p: any) => {
      const rid = p?.roomId as string; const mid = Number(p?.messageId);
      if (!rid || !Number.isFinite(mid)) return;
      const rs = ensureRoom(byRoom.value, rid);
      const idx = rs.items.findIndex((m) => m.id === mid);
      if (idx >= 0) {
        rs.items[idx] = { ...rs.items[idx], content: p?.content, edited: !p?.restored };
        // Force reactivity in some edge cases
        rs.items = rs.items.slice();
      }
    });

    // Message deleted
    socketService.on('messageDeleted', (p: any) => {
      const rid = p?.roomId as string; const mid = Number(p?.messageId);
      if (!rid || !Number.isFinite(mid)) return;
      const rs = ensureRoom(byRoom.value, rid);
      const idx = rs.items.findIndex((m) => m.id === mid);
      if (idx >= 0) {
        rs.items[idx] = { ...rs.items[idx], deleted: true };
        rs.items = rs.items.slice();
      }
    });

    // Delivery/read receipts
    socketService.on('messageStatusUpdated', (p: any) => {
      // p: { roomId?, messageId, status: 'delivered' | 'read', deliveredAt?, readAt? }
      const rid = p?.roomId as string | undefined;
      const mid = Number(p?.messageId);
      const status = String(p?.status || '');
      if (!Number.isFinite(mid)) return;

      const apply = (rs: RoomHistoryState | undefined) => {
        if (!rs) return;
        const idx = rs.items.findIndex((m) => m.id === mid);
        if (idx < 0) return;
        const msg = rs.items[idx];
        if (status === 'delivered') {
          msg.deliveredAt = typeof p?.deliveredAt === 'number' ? p.deliveredAt : Date.now();
        } else if (status === 'read') {
          msg.readAt = typeof p?.readAt === 'number' ? p.readAt : Date.now();
          // Ensure deliveredAt exists if read
          if (!msg.deliveredAt) msg.deliveredAt = msg.readAt;
        }
        rs.items[idx] = { ...msg };
        rs.items = rs.items.slice();
      };

      if (rid) {
        apply(ensureRoom(byRoom.value, rid));
      } else {
        // Fallback: search all rooms for this message id
        for (const key of Object.keys(byRoom.value)) {
          apply(byRoom.value[key]);
        }
      }
    });
  }
  bindSocketListeners();

  // Actions
  function loadRoomHistory(roomId: string, cursor?: number, size?: number): Promise<{ success: boolean; page?: { items: MessageDTO[]; nextCursor?: number }; error?: string }>{
    const rs = ensureRoom(byRoom.value, roomId);
    rs.loading = true;
    return new Promise((resolve) => {
      socketService.emit('loadRoomHistory', { roomId, cursor, size }, (res: any) => {
        rs.loading = false;
        if (res?.success) {
          // According to server DTO migration: res.page has { items, nextCursor }
          const page = res.page as { items: MessageDTO[]; nextCursor?: number };
          if (page && Array.isArray(page.items)) {
            // Replace or append depending on cursor
            if (!cursor || cursor === 0 || !rs.loadedOnce) {
              rs.items = page.items.slice();
              rs.loadedOnce = true;
            } else {
              rs.items = rs.items.concat(page.items);
            }
            rs.nextCursor = page.nextCursor;
          }
          resolve({ success: true, page });
        } else {
          resolve({ success: false, error: res?.error || 'Failed to load history' });
        }
      });
    });
  }

  function sendMessageToRoom(roomId: string, content: string, opts?: { attachments?: string[]; clientMsgId?: string; timestamp?: number }): Promise<any>{
    const payload: any = { roomId, content };
    if (opts?.attachments) payload.attachments = opts.attachments;
    if (opts?.clientMsgId) payload.clientMsgId = opts.clientMsgId;
    if (opts?.timestamp) payload.timestamp = opts.timestamp;
    return new Promise((resolve) => socketService.emit('sendMessageToRoom', payload, resolve));
  }

  function messageDelivered(roomId: string, messageId: number, timestamp?: number): Promise<any>{
    return new Promise((resolve) => socketService.emit('messageDelivered', { roomId, messageId, timestamp }, resolve));
  }
  function messageRead(roomId: string, messageId: number, timestamp?: number): Promise<any>{
    return new Promise((resolve) => socketService.emit('messageRead', { roomId, messageId, timestamp }, resolve));
  }
  function messageEdit(roomId: string, messageId: number, newContent: string): Promise<any>{
    return new Promise((resolve) => socketService.emit('messageEdit', { roomId, messageId, newContent }, resolve));
  }
  function messageDelete(roomId: string, messageId: number): Promise<any>{
    return new Promise((resolve) => socketService.emit('messageDelete', { roomId, messageId }, resolve));
  }
  function messageUndo(roomId: string, messageId: number): Promise<any>{
    return new Promise((resolve) => socketService.emit('messageUndo', { roomId, messageId }, resolve));
  }
  function getUndoTTL(roomId: string, messageId: number): Promise<{ success: boolean; ttlSeconds: number }>{
    return new Promise((resolve) => socketService.emit('getUndoTTL', { roomId, messageId }, resolve));
  }

  // ---- Active room helpers ----
  function setActiveRoom(roomId: string | null) {
    activeRoomId.value = roomId;
  }
  function getActiveRoomId(): string | null {
    return activeRoomId.value;
  }

  // ---- Upload helpers (REST) ----
  // Upload a single file as temp for a specific room. Returns { key, url }
  async function uploadTemp(roomId: string, file: File): Promise<{ key: string; url: string }>{
    const url = `/upload?temp=1&roomId=${encodeURIComponent(roomId)}`;
    const res = await axiosService.upload<{ url: string; key: string }>(url, file);
    if (!res.success || !(res.data as any)?.key) {
      throw new Error(((res.data as any)?.error) || 'Upload failed');
    }
    const data = res.data as any;
    return { key: String(data.key), url: String(data.url) };
  }

  // Delete temporary keys (cleanup if user cancels before sending)
  async function deleteTempKeys(keys: string[]): Promise<string[]>{
    if (!keys || keys.length === 0) return [];
    const res = await axiosService.delete<{ deleted: string[] }>(`/upload`, { data: { keys } as any });
    if (!res.success) return [];
    const del = (res.data as any)?.deleted;
    return Array.isArray(del) ? del : [];
  }

  return {
    byRoom,
    setActiveRoom,
    getActiveRoomId,
    loadRoomHistory,
    sendMessageToRoom,
    messageDelivered,
    messageRead,
    messageEdit,
    messageDelete,
    messageUndo,
    getUndoTTL,
    uploadTemp,
    deleteTempKeys,
  };
});
