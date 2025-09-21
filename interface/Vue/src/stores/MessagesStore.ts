import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socketService } from '@/services/websocket/websocket';

export interface MessageDTO {
  id: number;
  content: string;
  author?: { id: string; name: string };
  timestamp?: number;
  edited?: boolean;
  deleted?: boolean;
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
  // roomId -> state
  const byRoom = ref<Record<string, RoomHistoryState>>({});

  // Bind listeners once
  let bound = false;
  function bindSocketListeners() {
    if (bound) return; bound = true;

    // New message to a room
    socketService.on('message', (p: any) => {
      const rid = p?.roomId as string;
      const msg = p?.message as MessageDTO;
      if (!rid || !msg) return;
      const rs = ensureRoom(byRoom.value, rid);
      // Append in order; avoid duplicates by id
      const exists = rs.items.find((m) => m.id === msg.id);
      if (!exists) rs.items.push(msg);
    });

    // Initial room history received when joining a room (legacy push)
    socketService.on('roomHistory', (data: any) => {
      const rid = data?.roomId as string;
      const messages = Array.isArray(data?.messages) ? (data.messages as MessageDTO[]) : [];
      if (!rid) return;
      const rs = ensureRoom(byRoom.value, rid);
      rs.items = messages.slice();
      rs.loadedOnce = true;
      rs.nextCursor = undefined; // unknown from legacy push
    });

    // Message edited
    socketService.on('messageEdited', (p: any) => {
      const rid = p?.roomId as string; const mid = Number(p?.messageId);
      if (!rid || !Number.isFinite(mid)) return;
      const rs = ensureRoom(byRoom.value, rid);
      const idx = rs.items.findIndex((m) => m.id === mid);
      if (idx >= 0) rs.items[idx] = { ...rs.items[idx], content: p?.content, edited: !p?.restored };
    });

    // Message deleted
    socketService.on('messageDeleted', (p: any) => {
      const rid = p?.roomId as string; const mid = Number(p?.messageId);
      if (!rid || !Number.isFinite(mid)) return;
      const rs = ensureRoom(byRoom.value, rid);
      const idx = rs.items.findIndex((m) => m.id === mid);
      if (idx >= 0) rs.items[idx] = { ...rs.items[idx], deleted: true };
    });

    // Delivery/read receipts
    socketService.on('messageStatusUpdated', (p: any) => {
      // You can extend this to track per-message delivery/read status if UI needs it
      // p: { messageId, status: 'delivered' | 'read', deliveredAt?, readAt? }
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

  return {
    byRoom,
    loadRoomHistory,
    sendMessageToRoom,
    messageDelivered,
    messageRead,
    messageEdit,
    messageDelete,
    messageUndo,
    getUndoTTL,
  };
});
