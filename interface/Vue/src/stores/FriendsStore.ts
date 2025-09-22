import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { axiosService } from "@/services/axios/axios";
import { socketService } from "@/services/websocket/websocket";

export interface FriendListItemDTO {
  id: string; // friendship id
  userId: string; // friend or other user id
  name: string;
  status: "accepted" | "pending" | "rejected";
  isRequester: boolean;
}

export type FriendAction = "accept" | "reject";

export const useFriendsStore = defineStore("friends", () => {
  // --- State ---
  const items = ref<FriendListItemDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // presence for friends only (updated via presenceChanged broadcast)
  const presence = ref<
    Record<string, { status: "online" | "offline"; lastSeen: number | null }>
  >({});

  // --- Derived ---
  const friends = computed(() =>
    items.value.filter((i) => i.status === "accepted")
  );
  const pendingIncoming = computed(() =>
    items.value.filter((i) => i.status === "pending" && !i.isRequester)
  );
  const pendingOutgoing = computed(() =>
    items.value.filter((i) => i.status === "pending" && i.isRequester)
  );

  // --- Bind listeners once ---
  let bound = false;
  function bindSocketListeners() {
    if (bound) return;
    bound = true;

    // Server pushes updates on requests/responds.
    // Since WS emits FriendDTO (not the curated list item), avoid partial merges that cause duplicates.
    // Instead, refresh the authoritative list from the server.
    socketService.on("friendUpdated", async () => {
      try {
        await friendList();
      } catch {}
    });

    // Presence updates for friends
    socketService.on("presenceChanged", (p: any) => {
      const uid = String(p?.userId || "");
      if (!uid) return;
      const st = String(p?.status || "offline") as "online" | "offline";
      const lastSeen =
        typeof p?.lastSeen === "number"
          ? p.lastSeen
          : st === "online"
          ? null
          : Date.now();
      presence.value = { ...presence.value, [uid]: { status: st, lastSeen } };
    });
  }

  // --- Presence helpers (REST fallback like server/public UI) ---
  async function ensurePresence(userId: string): Promise<void> {
    const uid = String(userId || "");
    if (!uid) return;
    if (presence.value[uid]) return; // already known
    try {
      const res = await axiosService.get<{
        status: string;
        lastSeen: number | null;
      }>(`/user/presence/${encodeURIComponent(uid)}`, {
        skipErrorHandling: true,
      } as any);
      if (res?.success && res?.data) {
        const st = res.data.status === "online" ? "online" : "offline";
        presence.value = {
          ...presence.value,
          [uid]: { status: st, lastSeen: res.data.lastSeen ?? null },
        };
      }
    } catch {
      // ignore
    }
  }
  bindSocketListeners();

  // --- Actions ---
  function friendList(): Promise<{
    success: boolean;
    items?: FriendListItemDTO[];
    error?: string;
  }> {
    loading.value = true;
    error.value = null;
    return new Promise((resolve) => {
      socketService.emit("friendList", {}, (res: any) => {
        loading.value = false;
        if (res?.success && Array.isArray(res.items)) {
          items.value = res.items as FriendListItemDTO[];
          resolve({ success: true, items: items.value });
        } else {
          error.value = res?.error || "Failed to load friend list";
          resolve({ success: false, error: error.value || undefined });
        }
      });
    });
  }

  function friendRequest(
    targetUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      socketService.emit("friendRequest", { targetUserId }, (res: any) => {
        if (!res?.success && res?.error) error.value = res.error;
        resolve({ ...(res || {}), error: res?.error || undefined });
      });
    });
  }

  function friendRespond(
    otherUserId: string,
    action: FriendAction
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      socketService.emit(
        "friendRespond",
        { otherUserId, action },
        (res: any) => {
          if (!res?.success && res?.error) error.value = res.error;
          resolve({ ...(res || {}), error: res?.error || undefined });
        }
      );
    });
  }

  // Helper: locally reflect an outgoing pending request immediately for the requester UI
  function upsertLocalPending(
    userId: string,
    name: string,
    isRequester = true
  ) {
    if (!userId) return;
    const idx = items.value.findIndex((it) => it.userId === userId);
    const base: FriendListItemDTO = {
      id: items.value[idx]?.id || "",
      userId,
      name: name || items.value[idx]?.name,
      status: "pending",
      isRequester,
    };
    if (idx >= 0) items.value[idx] = { ...items.value[idx], ...base };
    else items.value.push(base);
  }

  // Keep presence fresh when accepted friends list changes
  watch(
    () => friends.value,
    async (list) => {
      try {
        for (const f of list || []) {
          if (f?.userId && !presence.value?.[f.userId]) {
            await ensurePresence(f.userId);
          }
        }
      } catch {}
    },
    { deep: false }
  );

  const friendRequests = computed(() => {
    const list: Array<{
      userId?: string;
      name: string;
      avatar: string;
      pendingInvitation: boolean;
      isFriend: boolean;
      incoming?: boolean;
      outgoing?: boolean;
      isOnline?: boolean;
    }> = [];

    // Accepted friends
    for (const i of friends.value || []) {
      const display = i.name;
      const avatar = (display || "?").trim().charAt(0).toUpperCase() || "?";
      const isOnline = presence.value?.[i.userId]?.status === "online";
      list.push({
        userId: i.userId,
        name: display,
        avatar,
        pendingInvitation: false,
        isFriend: true,
        isOnline,
      });
    }

    // Pending outgoing requests (you sent)
    for (const i of pendingOutgoing.value || []) {
      const display = i.name;
      const avatar = (display || "?").trim().charAt(0).toUpperCase() || "?";
      const isOnline = presence.value?.[i.userId]?.status === "online";
      list.push({
        userId: i.userId,
        name: display,
        avatar,
        pendingInvitation: true,
        isFriend: false,
        outgoing: true,
        isOnline,
      });
    }

    // Pending incoming requests (received)
    for (const i of pendingIncoming.value || []) {
      const display = i.name;
      const avatar = (display || "?").trim().charAt(0).toUpperCase() || "?";
      const isOnline = presence.value?.[i.userId]?.status === "online";
      list.push({
        userId: i.userId,
        name: display,
        avatar,
        pendingInvitation: true,
        isFriend: false,
        incoming: true,
        isOnline,
      });
    }

    return list;
  });

  return {
    items,
    friends,
    friendRequests,
    pendingIncoming,
    pendingOutgoing,
    presence,
    loading,
    error,
    friendList,
    friendRequest,
    friendRespond,
    upsertLocalPending,
    ensurePresence,
  };
});
