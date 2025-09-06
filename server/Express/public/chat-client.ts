// chat-client.ts
// @ts-expect-error
// Script extrait de index.html pour la logique front du chat en TypeScript
// Nécessite d'être compilé/transpilé en JS puis inclus dans index.html
const socket = io();

// Ensure a theme is set so CSS variables from base.css apply
function ensureTheme() {
  const root = document.documentElement;
  if (!root.getAttribute('data-theme')) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}
try { ensureTheme(); } catch {}

// Elements
const userActions = document.getElementById("user-actions") as HTMLElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const logoutAllBtn = document.getElementById("logout-all-btn") as HTMLButtonElement;
const authPanel = document.getElementById("auth-panel") as HTMLElement;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const loginUsername = document.getElementById("login-username") as HTMLInputElement;
const loginPassword = document.getElementById("login-password") as HTMLInputElement;
const registerForm = document.getElementById("register-form") as HTMLFormElement;
const registerUsername = document.getElementById("register-username") as HTMLInputElement;
const registerPassword = document.getElementById("register-password") as HTMLInputElement;
const registerConfirm = document.getElementById("register-confirm") as HTMLInputElement;
const authError = document.getElementById("auth-error") as HTMLElement;
// Onglets Connexion/Inscription
const tabLogin = document.getElementById("tab-login") as HTMLElement;
const tabRegister = document.getElementById("tab-register") as HTMLElement;

// Responsive helpers (Desktop-only test UI)
function isMobileLayout(): boolean {
  // For the server test UI, we target desktop only (no mobile/tablet behavior)
  return false;
}
function showSidebar(show: boolean) {
  try { if (roomPanel) roomPanel.style.display = show ? 'block' : 'none'; } catch {}
}
function showChat(show: boolean) {
  try { if (chatCard) chatCard.style.display = show ? 'block' : 'none'; } catch {}
}
function syncLayoutVisibility() {
  if (!roomPanel || !chatCard) return;
  // Hide entire grid if not authenticated
  const authed = !!currentUser;
  if (layoutContainer) layoutContainer.style.display = authed ? '' : 'none';
  // Desktop-only: always show sidebar; show chat only when a room is selected
  showSidebar(true);
  showChat(!!selectedRoom);
  // Expand sidebar to full width when no chat is selected
  if (layoutContainer) {
    try {
      if (!selectedRoom) layoutContainer.classList.add('no-chat');
      else layoutContainer.classList.remove('no-chat');
    } catch {}
  }
}

function showAuthTab(tab: "login" | "register") {
  if (tab === "login") {
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginUsername.focus();
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    registerUsername.focus();
  }
  authError.style.display = "none";
}
if (tabLogin && tabRegister && loginForm && registerForm) {
  tabLogin.addEventListener("click", () => showAuthTab("login"));
  tabRegister.addEventListener("click", () => showAuthTab("register"));
  // Affiche connexion par défaut
  showAuthTab("login");
}

const roomPanel = document.getElementById("room-panel") as HTMLElement;
// Unified room list
const roomListAll = document.getElementById("room-list-all") as HTMLElement | null;
const noRoomMsgAll = document.getElementById("no-room-msg-all") as HTMLElement | null;
const createRoomForm = document.getElementById("create-room-form") as HTMLFormElement;
const createRoomName = document.getElementById("create-room-name") as HTMLInputElement;
// Private room UI
const createRoomPrivate = document.getElementById("create-room-private") as HTMLInputElement | null;
const privateRoomInvite = document.getElementById("private-room-invite") as HTMLElement | null;
const inviteFriendsForm = document.getElementById("invite-friends-form") as HTMLFormElement | null;
const inviteFriendInput = document.getElementById("invite-friend-input") as HTMLInputElement | null;
const inviteFriendResults = document.getElementById("invite-friend-results") as HTMLElement | null;
const invitedUsersList = document.getElementById("invited-users") as HTMLElement | null;

// Tabs & collapsible sections (Messenger-like)
const tabDms = document.getElementById('tab-dms') as HTMLButtonElement | null;
const tabRooms = document.getElementById('tab-rooms') as HTMLButtonElement | null;
const sectionDms = document.getElementById('section-dms') as HTMLElement | null;
const sectionRooms = document.getElementById('section-rooms') as HTMLElement | null;
const toggleDms = document.getElementById('toggle-dms') as HTMLButtonElement | null;
const toggleRooms = document.getElementById('toggle-rooms') as HTMLButtonElement | null;

function setTabs(active: 'dms' | 'rooms') {
  if (tabDms) tabDms.setAttribute('aria-selected', active === 'dms' ? 'true' : 'false');
  if (tabRooms) tabRooms.setAttribute('aria-selected', active === 'rooms' ? 'true' : 'false');
  // Mobile behavior: show only the active section
  if (sectionDms && sectionRooms) {
    if (active === 'dms') {
      sectionDms.style.display = '';
      sectionRooms.style.display = 'none';
    } else {
      sectionDms.style.display = 'none';
      sectionRooms.style.display = '';
    }
  }
}

function toggleSection(el: HTMLElement | null) {
  if (!el) return;
  const expanded = el.getAttribute('aria-expanded') === 'true';
  el.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // Simple collapse by toggling list visibility
  const list = el.querySelector('ul');
  if (list) (list as HTMLElement).style.display = expanded ? 'none' : '';
  const empty = el.querySelector('.room-empty') as HTMLElement | null;
  if (empty) empty.style.display = expanded ? 'none' : (list && (list as HTMLElement).children.length ? 'none' : 'block');
}

function initRoomTabsAndCollapsers() {
  // Default: DMs active
  setTabs('dms');
  if (sectionRooms) sectionRooms.setAttribute('aria-expanded', 'false');
  if (sectionDms) sectionDms.setAttribute('aria-expanded', 'true');
  if (tabDms) tabDms.onclick = () => setTabs('dms');
  if (tabRooms) tabRooms.onclick = () => setTabs('rooms');
  if (toggleDms) toggleDms.onclick = () => toggleSection(sectionDms);
  if (toggleRooms) toggleRooms.onclick = () => toggleSection(sectionRooms);
}

// Initialize tabs/collapsers on load
try { initRoomTabsAndCollapsers(); } catch {}

const chatCard = document.getElementById("chat-card") as HTMLElement;
const chatWindow = document.getElementById("chat-window") as HTMLElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const messageInput = document.getElementById("message") as HTMLInputElement;

const closeChatBtn = document.getElementById("close-chat") as HTMLButtonElement | null;
const layoutContainer = document.querySelector('.chat-root.layout') as HTMLElement | null;
const selectedRoomTitle = document.getElementById("selected-room-title") as HTMLElement;
// Dynamic UI: typing banner just under the title
const typingBanner = document.createElement('div');
typingBanner.id = 'typing-banner';
typingBanner.style.fontSize = '12px';
typingBanner.style.color = '#888';
typingBanner.style.margin = '4px 0 8px 0';
try {
  selectedRoomTitle?.parentElement?.insertBefore(typingBanner, selectedRoomTitle.nextSibling);
} catch {}

// New UI elements
const userSearchForm = document.getElementById("user-search-form") as HTMLFormElement | null;
const userSearchInput = document.getElementById("user-search-input") as HTMLInputElement | null;
const userSearchResults = document.getElementById("user-search-results") as HTMLElement | null;
// New toolbar elements
const btnFriends = document.getElementById('btn-friends') as HTMLButtonElement | null;
const btnRequests = document.getElementById('btn-requests') as HTMLButtonElement | null;
const requestsBadge = document.getElementById('requests-badge') as HTMLElement | null;
const friendsDropdown = document.getElementById('friends-dropdown') as HTMLElement | null;
const requestsDropdown = document.getElementById('requests-dropdown') as HTMLElement | null;
const btnOpenRoomDrawer = document.getElementById('btn-open-room-drawer') as HTMLButtonElement | null;
const btnCloseRoomDrawer = document.getElementById('btn-close-room-drawer') as HTMLButtonElement | null;
const roomDrawer = document.getElementById('room-drawer') as HTMLElement | null;
// Deprecated in new UI but kept for compatibility
const friendsList = document.getElementById("friends-list") as HTMLElement | null;
const refreshFriendsBtn = document.getElementById("refresh-friends") as HTMLButtonElement | null;
const roomParticipants = document.getElementById("room-participants") as HTMLElement | null;

// Simple refresh action for friends list
if (refreshFriendsBtn) {
  refreshFriendsBtn.onclick = () => requestFriendList();
}

// Toggle private room invite block visibility
if (createRoomPrivate) {
  createRoomPrivate.addEventListener('change', () => {
    const inviteBlock = document.getElementById('private-room-invite') as HTMLElement | null;
    if (!inviteBlock) return;
    inviteBlock.style.display = createRoomPrivate.checked ? 'block' : 'none';
    if (createRoomPrivate.checked) {
      // Initialize invite UI when opening
      if (typeof renderInvitedUsers === 'function') {
        try { renderInvitedUsers(); } catch {}
      }
      if (inviteFriendInput && typeof runInviteSearch === 'function') {
        try { runInviteSearch(inviteFriendInput.value); } catch {}
      }
    }
  });
}

// Receive typing events for the current room
socket.on('typing', (payload: any) => {
  try {
    if (!payload || !selectedRoom || payload.roomId !== selectedRoom.id) return;
    const uid = String(payload.userId || '');
    if (!uid || (currentUser && uid === currentUser.id)) return; // ignore self
    if (payload.typing) typingUsers.add(uid); else typingUsers.delete(uid);
    renderTypingBanner();
  } catch {}
});

// State
let currentUser: { id: string, name: string } | null = null;
let selectedRoom: any = null;
let rooms: any[] = [];
let lastFriendItems: any[] = [];
let invitedUserIds: string[] = [];
// Track a DM we just initiated so we can auto-open when rooms refresh
let pendingDmTargetId: string | null = null;
// Unread counters by roomId
let unreadCounts: Record<string, number> = {};
// Typing state for current room
let typingUsers: Set<string> = new Set();
let typingStopTimer: number | null = null;
let lastTypingEmit = 0;
// Presence refresh timer for DM
let dmPresenceInterval: number | null = null;

// Persisted unread counts from server (after auth/getRooms)
socket.on("unreadCounts", (payload: any) => {
  try {
    const counts = (payload && typeof payload === 'object') ? (payload.counts || {}) : {};
    if (counts && typeof counts === 'object') {
      unreadCounts = { ...counts };
      renderRoomList();
    }
  } catch {}
});

// --- AUTH LOGIC dsiconnet all session user on all device ---
socket.on("forceLogout", function(data) {
  currentUser = null;
  document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  showAuthPanel(true);
  alert("Vous avez été déconnecté de tous vos appareils.");
});

// --- ROOM LIST LOGIC ---
function renderRoomList() {
  if (roomListAll) roomListAll.innerHTML = "";
  // Visibility: show public rooms, and private rooms if current user is a member or creator
  const visibleRooms = rooms.filter((room) => {
    if (room.isPublic === false) {
      const meId = currentUser?.id;
      if (!meId) return false;
      if (room.creatorId === meId) return true;
      const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
      return members.some((u) => u && u.id === meId);
    }
    return true; // public
  });
  // Empty state
  if (noRoomMsgAll) noRoomMsgAll.style.display = visibleRooms.length ? 'none' : 'block';
  // Render unified list
  visibleRooms.forEach((room) => {
    const li = document.createElement('li');
    li.className = 'room-list-item';
    // Label & type icon
    let label = room.name || (room.type === 'user' ? 'DM' : 'Room');
    if (room.type === 'user') {
      try {
        const meId = currentUser?.id;
        const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
        const other = meId ? members.find((u) => u && u.id !== meId) : null;
        if (other && other.name) label = other.name;
      } catch {}
    }
    const typeIcon = room.type === 'user' ? '👤' : '📁';
    const initial = (label || '?').trim().charAt(0).toUpperCase();
    li.innerHTML = `
      <div class="room-avatar" aria-hidden="true">${initial}</div>
      <span class="room-type-icon" aria-hidden="true">${typeIcon}</span>
      <span class="room-name">${label}</span>
      <span class="room-badge" hidden></span>
    `;
    li.style.cursor = 'pointer';
    li.onclick = () => joinRoom(room);
    if (selectedRoom && selectedRoom.id === room.id) li.classList.add('active');
    const badge = li.querySelector('.room-badge') as HTMLElement | null;
    const count = unreadCounts[room.id] || 0;
    if (badge) {
      if (count > 0) { badge.textContent = String(count); badge.hidden = false; }
      else { badge.hidden = true; }
    }
    roomListAll && roomListAll.appendChild(li);
  });
}

socket.on("rooms", (serverRooms: any[]) => {
  rooms = serverRooms;
  renderRoomList();
  // If we requested a DM creation, auto-open once it appears
  if (pendingDmTargetId && currentUser) {
    const dm = findExistingDm(pendingDmTargetId);
    if (dm) {
      pendingDmTargetId = null;
      joinRoom(dm);
    }
  }
});

// Realtime updates for friends list
socket.on('friendUpdated', () => {
  requestFriendList();
});

// --- ROOM CREATION ---
createRoomForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = createRoomName.value.trim();
  if (!name || !currentUser) return;
  const isPrivate = !!(createRoomPrivate && createRoomPrivate.checked);
  const isPublic = !isPrivate;
  const payload: any = { name, creatorId: currentUser.id, type: 'room', isPublic };
  if (isPrivate) {
    payload.invitedUserIds = invitedUserIds.slice();
  }
  socket.emit("createRoom", payload);
  createRoomName.value = "";
  // reset invites UI
  invitedUserIds = [];
  if (invitedUsersList) invitedUsersList.innerHTML = "";
});

// --- JOIN ROOM ---
function joinRoom(room: any) {
  if (!currentUser) return;
  selectedRoom = room;
  selectedRoomTitle.textContent = `💬 Room : ${room.name}`;
  // Reset typing banner and state
  typingUsers.clear();
  setTypingBanner("");
  // UI: responsive visibility
  syncLayoutVisibility();
  chatWindow.innerHTML = "";
  if (roomParticipants) roomParticipants.textContent = "";
  socket.emit("joinRoom", { roomId: room.id });
  // Reset unread counter when entering the room
  unreadCounts[room.id] = 0;
  try { renderRoomList(); } catch {}

  // If this is a DM, show presence of the other user and refresh periodically
  try {
    setupDmPresence(room);
  } catch {}
}

// Close chat (desktop/mobile)
if (closeChatBtn) {
  closeChatBtn.addEventListener('click', () => {
    try {
      selectedRoom = null;
      chatWindow.innerHTML = "";
      setTypingBanner("");
      if (dmPresenceInterval) { window.clearInterval(dmPresenceInterval); dmPresenceInterval = null; }
      syncLayoutVisibility();
    } catch {}
  });
}

// Gestion logout (WebSocket uniquement)
if (logoutBtn) {
  logoutBtn.onclick = function() {
    socket.emit('logout', {}, (res: any) => {
      // Peu importe la réponse, on réinitialise l'état
      currentUser = null;
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      showAuthPanel(true);
    });
  };
}
if (logoutAllBtn) {
  logoutAllBtn.onclick = function() {
    socket.emit('logoutAll', {}, (res: any) => {
      currentUser = null;
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      showAuthPanel(true);
    });
  };
}


// --- CHATBOX LOGIC (par room) ---
function getUserColorClass(authorName: string): string {
  let hash = 0;
  for (let i = 0; i < authorName.length; i++)
    hash = (hash + authorName.charCodeAt(i)) % 256;
  return "user-color-" + (1 + (hash % 8));
}

function renderMsg(msg: any) {
  const authorName = msg.author?.name || "???";
  const { content, timestamp } = msg;
  const div = document.createElement("div");
  const isMine = currentUser && authorName === currentUser.name;
  let classes = "message";
  if (isMine) {
    classes += " mine";
  } else {
    classes += " " + getUserColorClass(authorName);
  }
  div.className = classes;
  if (msg && msg.id != null) {
    try { (div as any).dataset.messageId = String(msg.id); } catch {}
  }
  const time = new Date(timestamp).toLocaleTimeString();
  // status badge for own messages only
  const status = String(msg.status || "sent");
  const statusText = ((): string => {
    if (!isMine) return "";
    if (status === "read") return "✓✓";
    if (status === "delivered") return "✓";
    return ""; // sent
  })();
  div.innerHTML = `
    <div class="msg-meta-row">
      <span class="msg-author">${authorName}</span>
      <span class="msg-time">${time}</span>
    </div>
    <div class="msg-content">${content}</div>
    ${isMine ? `<span class="msg-status" aria-label="status">${statusText}</span>` : ""}
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Historique de la room sélectionnée
socket.on("roomHistory", (data: any) => {
  if (!selectedRoom || data.roomId !== selectedRoom.id) return;
  chatWindow.innerHTML = "";
  data.messages.forEach(renderMsg);
  // Mark messages as delivered/read upon viewing history
  try {
    const now = Date.now();
    (data.messages || []).forEach((m: any) => {
      const authorName = m?.author?.name;
      const mine = currentUser && authorName === currentUser.name;
      const midStr = m?.id != null ? String(m.id) : "";
      const mid = parseInt(midStr, 10);
      if (!mine && Number.isFinite(mid)) {
        socket.emit("messageDelivered", { messageId: mid, roomId: data.roomId, timestamp: now });
        socket.emit("messageRead", { messageId: mid, roomId: data.roomId, timestamp: now });
      }
    });
  } catch {}
});

// Participants de la room
function renderParticipants(users: Array<{ id: string; name: string }>) {
  if (!roomParticipants) return;
  if (!users || users.length === 0) {
    roomParticipants.textContent = "";
    return;
  }
  const names = users.map((u) => u.name).join(", ");
  roomParticipants.textContent = `Participants: ${names}`;
}

socket.on("roomUsers", (payload: any) => {
  if (!selectedRoom || !payload || payload.roomId !== selectedRoom.id) return;
  renderParticipants(payload.users || []);
});

// Nouveau message dans la room
socket.on("message", (data: any) => {
  // If message is for the currently open room, render it
  if (selectedRoom && data.roomId === selectedRoom.id) {
    renderMsg(data.message);
    // Acknowledge delivery/read for messages from others in active room
    try {
      const m = data.message;
      const authorName = m?.author?.name;
      const mine = currentUser && authorName === currentUser.name;
      const mid = parseInt(String(m?.id ?? ''), 10);
      if (!mine && Number.isFinite(mid)) {
        const now = Date.now();
        socket.emit("messageDelivered", { messageId: mid, roomId: data.roomId, timestamp: now });
        socket.emit("messageRead", { messageId: mid, roomId: data.roomId, timestamp: now });
      }
    } catch {}
    return;
  }
  // Otherwise, increment unread counter (ignore own messages)
  try {
    const authorName = data?.message?.author?.name;
    if (!currentUser || authorName === currentUser.name) return;
    // Mark as delivered when message arrives for a room that's not active
    try {
      const mid = parseInt(String(data?.message?.id ?? ''), 10);
      if (Number.isFinite(mid)) {
        const now = Date.now();
        socket.emit("messageDelivered", { messageId: mid, roomId: data.roomId, timestamp: now });
      }
    } catch {}
    unreadCounts[data.roomId] = (unreadCounts[data.roomId] || 0) + 1;
    renderRoomList();
  } catch {}
});

// Gestion des erreurs serveur
socket.on("error", (err: any) => {
  if (authPanel.style.display !== "none") {
    authError.textContent = err.error || "Erreur serveur";
    authError.style.display = "block";
  } else {
    alert(err.error || "Erreur serveur");
  }
});

// Formulaire d'envoi de message (dans la room sélectionnée)
chatForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!selectedRoom || !currentUser) return;
  const content = messageInput.value.trim();
  if (!content) return;
  socket.emit("sendMessageToRoom", {
    roomId: selectedRoom.id,
    content,
    timestamp: Date.now(),
  });
  messageInput.value = "";
});

// Emit typingStart/typingStop based on input activity
messageInput.addEventListener('input', () => {
  if (!selectedRoom || !currentUser) return;
  const now = Date.now();
  if (now - lastTypingEmit > 3000) {
    try { socket.emit('typingStart', { roomId: selectedRoom.id }); } catch {}
    lastTypingEmit = now;
  }
  if (typingStopTimer) window.clearTimeout(typingStopTimer);
  typingStopTimer = window.setTimeout(() => {
    try { socket.emit('typingStop', { roomId: selectedRoom.id }); } catch {}
    typingStopTimer = null;
  }, 1500);
});
messageInput.addEventListener('blur', () => {
  if (!selectedRoom || !currentUser) return;
  try { socket.emit('typingStop', { roomId: selectedRoom.id }); } catch {}
});

// Update status UI when server notifies
socket.on("messageStatusUpdated", (evt: any) => {
  try {
    const mid = evt && evt.messageId != null ? String(evt.messageId) : "";
    if (!mid) return;
    const el = chatWindow.querySelector(`[data-message-id="${mid}"]`) as HTMLElement | null;
    if (!el) return;
    const statusEl = el.querySelector('.msg-status') as HTMLElement | null;
    if (!statusEl) return; // Only own messages render status
    const status = String(evt.status || '').toLowerCase();
    if (status === 'read') {
      statusEl.textContent = '✓✓';
    } else if (status === 'delivered') {
      // Only upgrade from blank to single tick if not already read
      if (statusEl.textContent !== '✓✓') statusEl.textContent = '✓';
    }
  } catch {}
});

// Affiche ou masque les panneaux selon l'état d'authentification
function showAuthPanel(show: boolean) {
  authPanel.style.display = show ? "block" : "none";
  // Defer panel visibility to responsive logic
  if (show) {
    showSidebar(false);
    showChat(false);
    if (layoutContainer) layoutContainer.style.display = 'none';
  } else {
    syncLayoutVisibility();
  }
  createRoomForm.style.display = show ? "none" : "flex";
  chatForm.style.display = show ? "none" : "flex";
  // Affiche les boutons logout uniquement si connecté
  if (userActions) userActions.style.display = show ? "none" : "block";
}

// --- Typing helpers ---
function renderTypingBanner() {
  try {
    const count = typingUsers.size;
    if (count <= 0) { setTypingBanner(""); return; }
    const text = count === 1 ? "Quelqu'un est en train d'écrire…" : "Plusieurs personnes écrivent…";
    setTypingBanner(text);
  } catch {}
}

function setTypingBanner(text: string) {
  try { (typingBanner as any).textContent = text || ""; } catch {}
}

// --- Presence helpers (DM only) ---
async function fetchPresence(userId: string): Promise<{ status: string; lastSeen: number | null } | null> {
  try {
    const res = await fetch(`/api/user/presence/${encodeURIComponent(userId)}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return { status: data?.status || 'offline', lastSeen: data?.lastSeen ?? null };
  } catch { return null; }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

async function setupDmPresence(room: any) {
  try {
    if (!room || room.type !== 'user' || !currentUser) {
      updatePresenceLabel("");
      if (dmPresenceInterval) { window.clearInterval(dmPresenceInterval); dmPresenceInterval = null; }
      return;
    }
    const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
    const other = members.find((u) => u && u.id !== currentUser!.id);
    if (!other) { updatePresenceLabel(""); return; }
    const renderOnce = async () => {
      const pr = await fetchPresence(other.id);
      if (!pr) { updatePresenceLabel(""); return; }
      if (pr.status === 'online') updatePresenceLabel('• en ligne');
      else if (pr.lastSeen) updatePresenceLabel(`• vu ${formatRelative(pr.lastSeen)}`);
      else updatePresenceLabel('• hors ligne');
    };
    await renderOnce();
    if (dmPresenceInterval) window.clearInterval(dmPresenceInterval);
    dmPresenceInterval = window.setInterval(renderOnce, 30_000);
  } catch {}
}

function updatePresenceLabel(text: string) {
  try {
    if (!selectedRoomTitle) return;
    const id = 'presence-label';
    let span = document.getElementById(id) as HTMLSpanElement | null;
    if (!span) {
      span = document.createElement('span');
      span.id = id;
      span.style.marginLeft = '8px';
      span.style.fontSize = '12px';
      span.style.color = '#888';
      selectedRoomTitle.appendChild(span);
    }
    span.textContent = text || '';
  } catch {}
}

// --- Auth automatique via cookie/sessionToken ---
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

const sessionToken = getCookie('session_token');
if (sessionToken) {
  socket.emit('authenticate', { token: sessionToken }, (res: any) => {
    if (res && res.success) {
      currentUser = { id: res.id, name: res.name };
      showAuthPanel(false);
      socket.emit("getRooms");
      requestFriendList();
      syncLayoutVisibility();
    } else {
      // Token invalide, afficher login
      showAuthPanel(true);
    }
  });
} else {
  showAuthPanel(true);
}

// Auth: login
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) return;
  socket.emit("login", { username, password }, (res: any) => {
    if (res && res.error) {
      authError.textContent = res.error;
      authError.style.display = "block";
      return;
    }
    currentUser = { id: res.id, name: res.name };
    // Stocke le token de session dans un cookie pour les futures requêtes HTTP (REST, etc.)
    if (res.token) {
      document.cookie = `session_token=${res.token}; path=/; SameSite=Lax`;
      // Pour la prod, ajouter 'Secure' si le site est servi en HTTPS :
      // document.cookie = `session_token=${res.token}; path=/; SameSite=Lax; Secure`;
    }
    authError.style.display = "none";
    showAuthPanel(false);
    socket.emit("getRooms");
    requestFriendList();
    syncLayoutVisibility();
  });
});

// Auth: register via REST
registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const username = registerUsername.value.trim();
  const password = registerPassword.value;
  const confirm = registerConfirm.value;
  if (!username || !password || !confirm) {
    authError.textContent = "Veuillez remplir tous les champs.";
    authError.style.display = "block";
    return;
  }
  try {
    const csrf = getCookie('X-XSRF-TOKEN') || '';
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrf,
      },
      credentials: 'include',
      body: JSON.stringify({ username, password, confirmPassword: confirm }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      authError.textContent = data?.error || 'Registration failed.';
      authError.style.display = 'block';
      return;
    }
    // Succès inscription : invite à se connecter
    authError.textContent = "Compte créé avec succès ! Connectez-vous.";
    authError.style.color = "#228b22";
    authError.style.background = "#f5fff5";
    authError.style.border = "1px solid #b8ffb8";
    authError.style.display = "block";
    showAuthTab("login");
    setTimeout(() => {
      authError.style.color = "#e23c3c";
      authError.style.background = "#fff5f5";
      authError.style.border = "1px solid #ffd4d4";
      authError.style.display = "none";
    }, 3000);
    registerUsername.value = "";
    registerPassword.value = "";
    registerConfirm.value = "";
  } catch (_err) {
    authError.textContent = 'Registration failed.';
    authError.style.display = 'block';
  }
});

// Initial : demander la liste des rooms (si non pushée automatiquement)
// (ne rien faire tant qu'on n'est pas authentifié)

// --- User search (REST) ---
async function searchUsers(query: string, limit = 20): Promise<Array<{ id: string; name: string }>> {
  const url = `/api/chat/users/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  // Support both formats: array or { users: [...] }
  if (Array.isArray(data)) return data;
  return data?.users || [];
}

// Simple debounce utility for live search
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

function renderSearchResults(users: Array<{ id: string; name: string }>) {
  if (!userSearchResults) return;
  userSearchResults.innerHTML = "";
  users
    .filter((u) => !currentUser || u.id !== currentUser.id)
    .forEach((u) => {
      const li = document.createElement('li');
      li.className = 'room-list-item';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = u.name;
      const actions = document.createElement('span');
      actions.style.float = 'right';
      const addBtn = document.createElement('button');
      addBtn.textContent = '+';
      addBtn.title = 'Ajouter ami';
      addBtn.className = 'chat-send-btn';
      addBtn.style.width = '32px';
      addBtn.style.padding = '4px 0';
      addBtn.onclick = () => {
        if (!currentUser) return;
        socket.emit('friendRequest', { targetUserId: u.id }, (resp: any) => {
          // Optionally give feedback
          requestFriendList();
        });
      };
      actions.appendChild(addBtn);
      li.appendChild(nameSpan);
      li.appendChild(actions);
      userSearchResults.appendChild(li);
    });
}

if (userSearchForm && userSearchInput) {
  // Hide the submit button; we trigger search on input
  const submitBtn = userSearchForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.style.display = 'none';
  // Prevent form submit navigation
  userSearchForm.addEventListener('submit', (e) => e.preventDefault());

  const runSearch = debounce(async () => {
    const q = userSearchInput.value.trim();
    if (!q) {
      if (userSearchResults) userSearchResults.innerHTML = '';
      return;
    }
    try {
      const items = await searchUsers(q, 20);
      renderSearchResults(items);
    } catch (_err) {
      if (userSearchResults) userSearchResults.innerHTML = '<li style="color:#888;">Recherche impossible</li>';
    }
  }, 300);

  userSearchInput.addEventListener('input', runSearch);
}

// Keep UI in sync on resize
try { window.addEventListener('resize', () => syncLayoutVisibility()); } catch {}

// Initial layout sync
try { syncLayoutVisibility(); } catch {}

// --- Friends via WebSocket ---
function renderFriends(items: any[]) {
  lastFriendItems = items || [];
  const accepted = items.filter((it: any) => it && it.status === 'accepted');
  const pending = items.filter((it: any) => it && (it.status === 'pending' || it.status === 'received'));

  // Update requests badge
  if (requestsBadge) {
    const n = pending.length;
    if (n > 0) { requestsBadge.textContent = String(n); requestsBadge.hidden = false; }
    else { requestsBadge.hidden = true; }
  }
  // If there are no pending requests, ensure the dropdown is closed
  if (pending.length === 0) {
    hideDropdown(requestsDropdown);
    btnRequests?.setAttribute('aria-expanded','false');
  }

  if (friendsDropdown) {
    friendsDropdown.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'room-list';
    accepted.forEach((it: any) => {
      const li = document.createElement('li');
      li.className = 'room-list-item';
      const name = it.name || 'inconnu';
      li.innerHTML = `<span>${name}</span>`;
      const msgBtn = document.createElement('button');
      msgBtn.textContent = 'Message';
      msgBtn.className = 'chat-send-btn';
      msgBtn.style.float = 'right';
      msgBtn.onclick = () => startDM(it.userId || it.id, name);
      li.appendChild(msgBtn);
      ul.appendChild(li);
    });
    friendsDropdown.appendChild(ul);
  }

  if (requestsDropdown) {
    requestsDropdown.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'room-list';
    pending.forEach((it: any) => {
      const li = document.createElement('li');
      li.className = 'room-list-item';
      const name = it.name || 'inconnu';
      const label = document.createElement('span');
      label.textContent = name;
      const actions = document.createElement('span');
      actions.style.float = 'right';
      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accepter';
      acceptBtn.className = 'chat-send-btn';
      acceptBtn.onclick = () => socket.emit('friendRespond', { otherUserId: it.userId, action: 'accept' }, () => requestFriendList());
      const declineBtn = document.createElement('button');
      declineBtn.textContent = 'Refuser';
      declineBtn.className = 'auth-btn';
      declineBtn.onclick = () => socket.emit('friendRespond', { otherUserId: it.userId, action: 'reject' }, () => requestFriendList());
      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);
      li.appendChild(label);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    requestsDropdown.appendChild(ul);
  }
}

// Toolbar toggles
function hideDropdown(el: HTMLElement | null) { if (el) el.hidden = true; }
function showDropdown(el: HTMLElement | null) { if (el) el.hidden = false; }

if (btnFriends) {
  btnFriends.addEventListener('click', () => {
    const expanded = btnFriends.getAttribute('aria-expanded') === 'true';
    btnFriends.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    if (expanded) hideDropdown(friendsDropdown); else { showDropdown(friendsDropdown); hideDropdown(requestsDropdown); btnRequests?.setAttribute('aria-expanded','false'); }
  });
}
if (btnRequests) {
  btnRequests.addEventListener('click', () => {
    // Only open if there are pending requests
    const hasPending = Array.isArray(lastFriendItems) && lastFriendItems.some((it: any) => it && (it.status === 'pending' || it.status === 'received'));
    const expanded = btnRequests.getAttribute('aria-expanded') === 'true';
    if (!expanded) {
      if (!hasPending) return; // do nothing when none pending
      btnRequests.setAttribute('aria-expanded', 'true');
      showDropdown(requestsDropdown);
      hideDropdown(friendsDropdown);
      btnFriends?.setAttribute('aria-expanded','false');
    } else {
      btnRequests.setAttribute('aria-expanded', 'false');
      hideDropdown(requestsDropdown);
    }
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const inFriends = friendsDropdown?.contains(t) || btnFriends?.contains(t);
  const inRequests = requestsDropdown?.contains(t) || btnRequests?.contains(t);
  if (!inFriends) { hideDropdown(friendsDropdown); btnFriends?.setAttribute('aria-expanded','false'); }
  if (!inRequests) { hideDropdown(requestsDropdown); btnRequests?.setAttribute('aria-expanded','false'); }
});

// Drawer open/close
function openRoomDrawer() { if (roomDrawer) roomDrawer.setAttribute('aria-hidden','false'); }
function closeRoomDrawer() { if (roomDrawer) roomDrawer.setAttribute('aria-hidden','true'); }
btnOpenRoomDrawer?.addEventListener('click', openRoomDrawer);
btnCloseRoomDrawer?.addEventListener('click', closeRoomDrawer);
roomDrawer?.addEventListener('click', (e) => { if (e.target === roomDrawer) closeRoomDrawer(); });

function requestFriendList() {
  if (!currentUser) return;
  socket.emit('friendList', {}, (resp: any) => {
    if (resp && resp.success) {
      renderFriends(resp.items || []);
      // Refresh invite UI if visible
      const inviteBlock = document.getElementById('private-room-invite') as HTMLElement | null;
      if (inviteBlock && inviteBlock.style.display !== 'none') {
        try { renderInvitedUsers(); } catch {}
        if (inviteFriendInput) try { runInviteSearch(inviteFriendInput.value); } catch {}
      }
    }
    // Open pending DM room if any
    if (pendingDmTargetId) {
      const friend = resp.items.find((it) => it.userId === pendingDmTargetId);
      if (friend && friend.status === 'accepted') {
        startDM(pendingDmTargetId, friend.name);
        pendingDmTargetId = null;
      }
    }
  });
}

// ---- Direct Message helpers ----
function findExistingDm(friendId: string): any | null {
  const meId = currentUser?.id;
  if (!meId) return null;
  return (
    rooms.find((r) => {
      if (r.type !== 'user') return false;
      const members: Array<{ id: string; name: string }> = Array.isArray(r.users) ? r.users : [];
      const ids = members.map((u) => u && u.id).filter(Boolean);
      // DM if both participants are present
      return ids.includes(meId) && ids.includes(friendId);
    }) || null
  );
}

function startDM(friendId: string, friendName: string) {
  if (!currentUser) return;
  const existing = findExistingDm(friendId);
  if (existing) {
    joinRoom(existing);
    return;
  }
  // Create a new private DM room
  pendingDmTargetId = friendId;
  const name = `${currentUser.name} ↔ ${friendName}`;
  socket.emit('createRoom', {
    name,
    type: 'user',
    isPublic: false,
    invitedUserIds: [friendId],
  });
}

// ---- Private room: invite friends live-search (from accepted friends) ----
function renderInvitedUsers() {
  if (!invitedUsersList) return;
  invitedUsersList.innerHTML = '';
  const acceptedFriends = lastFriendItems.filter((f) => f && (f.status === 'accepted'));
  invitedUserIds.forEach((id) => {
    const friend = acceptedFriends.find((f) => (f.userId || f.id) === id);
    const name = friend?.name || 'inconnu';
    const li = document.createElement('li');
    li.className = 'room-list-item';
    const label = document.createElement('span');
    label.textContent = name;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Retirer';
    removeBtn.className = 'auth-btn';
    removeBtn.style.float = 'right';
    removeBtn.onclick = () => {
      invitedUserIds = invitedUserIds.filter((x) => x !== id);
      renderInvitedUsers();
    };
    li.appendChild(label);
    li.appendChild(removeBtn);
    invitedUsersList.appendChild(li);
  });
}

function renderInviteFriendResults(matches: Array<{ id: string; name: string }>) {
  if (!inviteFriendResults) return;
  inviteFriendResults.innerHTML = '';
  matches.forEach((u) => {
    const li = document.createElement('li');
    li.className = 'room-list-item';
    const label = document.createElement('span');
    label.textContent = u.name;
    const addBtn = document.createElement('button');
    addBtn.textContent = invitedUserIds.includes(u.id) ? 'Ajouté' : 'Ajouter';
    addBtn.className = invitedUserIds.includes(u.id) ? 'auth-btn' : 'chat-send-btn';
    addBtn.style.float = 'right';
    addBtn.disabled = invitedUserIds.includes(u.id);
    addBtn.onclick = () => {
      if (!invitedUserIds.includes(u.id)) {
        invitedUserIds.push(u.id);
        renderInvitedUsers();
        renderInviteFriendResults(matches);
      }
    };
    li.appendChild(label);
    li.appendChild(addBtn);
    inviteFriendResults.appendChild(li);
  });
}

function runInviteSearch(query: string) {
  const q = (query || '').toLowerCase();
  const accepted = lastFriendItems.filter((f) => f && f.status === 'accepted');
  const mapped = accepted.map((f) => ({ id: f.userId || f.id, name: f.name || 'inconnu' }));
  const matches = mapped.filter((u) => u.name.toLowerCase().includes(q));
  renderInviteFriendResults(matches.slice(0, 30));
}

if (inviteFriendsForm && inviteFriendInput) {
  inviteFriendsForm.addEventListener('submit', (e) => e.preventDefault());
  inviteFriendInput.addEventListener('input', () => runInviteSearch(inviteFriendInput.value));
}
