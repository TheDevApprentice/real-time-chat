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
const roomListRooms = document.getElementById("room-list-rooms") as HTMLElement;
const roomListDms = document.getElementById("room-list-dms") as HTMLElement;
const noRoomMsgRooms = document.getElementById("no-room-msg-rooms") as HTMLElement;
const noRoomMsgDms = document.getElementById("no-room-msg-dms") as HTMLElement;
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
const backToRoomsBtn = document.getElementById("back-to-rooms") as HTMLButtonElement;
const selectedRoomTitle = document.getElementById("selected-room-title") as HTMLElement;
// New UI elements
const userSearchForm = document.getElementById("user-search-form") as HTMLFormElement | null;
const userSearchInput = document.getElementById("user-search-input") as HTMLInputElement | null;
const userSearchResults = document.getElementById("user-search-results") as HTMLElement | null;
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

// State
let currentUser: { id: string, name: string } | null = null;
let selectedRoom: any = null;
let rooms: any[] = [];
let lastFriendItems: any[] = [];
let invitedUserIds: string[] = [];
// Track a DM we just initiated so we can auto-open when rooms refresh
let pendingDmTargetId: string | null = null;

// --- AUTH LOGIC dsiconnet all session user on all device ---
socket.on("forceLogout", function(data) {
  currentUser = null;
  document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  showAuthPanel(true);
  alert("Vous avez été déconnecté de tous vos appareils.");
});

// --- ROOM LIST LOGIC ---
function renderRoomList() {
  if (roomListRooms) roomListRooms.innerHTML = "";
  if (roomListDms) roomListDms.innerHTML = "";
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
  const groupRooms = visibleRooms.filter((r) => r.type !== 'user');
  const dmRooms = visibleRooms.filter((r) => r.type === 'user');

  // Empty states
  if (noRoomMsgRooms) noRoomMsgRooms.style.display = groupRooms.length ? 'none' : 'block';
  if (noRoomMsgDms) noRoomMsgDms.style.display = dmRooms.length ? 'none' : 'block';

  // Render groups
  groupRooms.forEach((room) => {
    const li = document.createElement("li");
    li.className = "room-list-item";
    const displayName: string = room.name || 'Room';
    const initial = (displayName || '?').trim().charAt(0).toUpperCase();
    li.innerHTML = `
      <div class="room-avatar" aria-hidden="true">${initial}</div>
      <span class="room-name">${displayName}</span>
      <span class="room-badge" hidden></span>
    `;
    li.style.cursor = "pointer";
    li.onclick = () => joinRoom(room);
    roomListRooms && roomListRooms.appendChild(li);
  });

  // Render DMs
  dmRooms.forEach((room) => {
    const li = document.createElement("li");
    li.className = "room-list-item";
    // Prefer showing other participant name if available
    let label = room.name || 'DM';
    try {
      const meId = currentUser?.id;
      const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
      const other = meId ? members.find((u) => u && u.id !== meId) : null;
      if (other && other.name) label = other.name;
    } catch {}
    const initial = (label || '?').trim().charAt(0).toUpperCase();
    li.innerHTML = `
      <div class="room-avatar" aria-hidden="true">${initial}</div>
      <span class="room-name">${label}</span>
      <span class="room-badge" hidden></span>
    `;
    li.style.cursor = "pointer";
    li.onclick = () => joinRoom(room);
    roomListDms && roomListDms.appendChild(li);
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
  // UI : afficher la chatbox, masquer la liste des rooms
  roomPanel.style.display = "none";
  chatCard.style.display = "block";
  chatWindow.innerHTML = "";
  if (roomParticipants) roomParticipants.textContent = "";
  socket.emit("joinRoom", { roomId: room.id });
}

backToRoomsBtn.addEventListener("click", function () {
  selectedRoom = null;
  chatCard.style.display = "none";
  roomPanel.style.display = "block";
  chatWindow.innerHTML = "";
});

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
  const time = new Date(timestamp).toLocaleTimeString();
  div.innerHTML = `
    <div class="msg-meta-row">
      <span class="msg-author">${authorName}</span>
      <span class="msg-time">${time}</span>
    </div>
    <div class="msg-content">${content}</div>
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Historique de la room sélectionnée
socket.on("roomHistory", (data: any) => {
  if (!selectedRoom || data.roomId !== selectedRoom.id) return;
  chatWindow.innerHTML = "";
  data.messages.forEach(renderMsg);
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
  if (!selectedRoom || data.roomId !== selectedRoom.id) return;
  renderMsg(data.message);
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

// Affiche ou masque les panneaux selon l'état d'authentification
function showAuthPanel(show: boolean) {
  authPanel.style.display = show ? "block" : "none";
  roomPanel.style.display = show ? "none" : "block";
  chatCard.style.display = "none";
  createRoomForm.style.display = show ? "none" : "flex";
  chatForm.style.display = show ? "none" : "flex";
  // Affiche les boutons logout uniquement si connecté
  if (userActions) userActions.style.display = show ? "none" : "block";
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

// --- Friends via WebSocket ---
function renderFriends(items: any[]) {
  lastFriendItems = items || [];
  if (!friendsList) return;
  friendsList.innerHTML = '';
  lastFriendItems.forEach((it) => {
    // it: { id, userId, name, status, isRequester }
    const otherName = it.name || 'inconnu';
    const li = document.createElement('li');
    li.className = 'room-list-item';
    const label = document.createElement('span');
    label.textContent = `${otherName} — ${it.status}`;
    const actions = document.createElement('span');
    actions.style.float = 'right';
    // Show accept/reject only for incoming pending requests (i.e., not requester)
    if (it.status === 'pending' && !it.isRequester) {
      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accepter';
      acceptBtn.className = 'chat-send-btn';
      acceptBtn.onclick = () => socket.emit('friendRespond', { otherUserId: it.userId, action: 'accept' }, () => requestFriendList());
      const declineBtn = document.createElement('button');
      declineBtn.textContent = 'Refuser';
      declineBtn.className = 'auth-btn';
      declineBtn.style.marginLeft = '6px';
      declineBtn.onclick = () => socket.emit('friendRespond', { otherUserId: it.userId, action: 'reject' }, () => requestFriendList());
      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);
    }
    // For accepted friends, allow starting a DM
    if (it.status === 'accepted') {
      const msgBtn = document.createElement('button');
      msgBtn.textContent = 'Message';
      msgBtn.className = 'chat-send-btn';
      msgBtn.style.marginLeft = '6px';
      msgBtn.onclick = () => startDM(it.userId || it.id, otherName);
      actions.appendChild(msgBtn);
    }
    li.appendChild(label);
    li.appendChild(actions);
    friendsList.appendChild(li);
  });
}

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
