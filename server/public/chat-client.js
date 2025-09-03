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
try {
    ensureTheme();
}
catch { }
// Elements
const userActions = document.getElementById("user-actions");
const logoutBtn = document.getElementById("logout-btn");
const logoutAllBtn = document.getElementById("logout-all-btn");
const authPanel = document.getElementById("auth-panel");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const registerForm = document.getElementById("register-form");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerConfirm = document.getElementById("register-confirm");
const authError = document.getElementById("auth-error");
// Onglets Connexion/Inscription
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
function showAuthTab(tab) {
    if (tab === "login") {
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        loginUsername.focus();
    }
    else {
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
const roomPanel = document.getElementById("room-panel");
const roomListRooms = document.getElementById("room-list-rooms");
const roomListDms = document.getElementById("room-list-dms");
const noRoomMsgRooms = document.getElementById("no-room-msg-rooms");
const noRoomMsgDms = document.getElementById("no-room-msg-dms");
const createRoomForm = document.getElementById("create-room-form");
const createRoomName = document.getElementById("create-room-name");
// Private room UI
const createRoomPrivate = document.getElementById("create-room-private");
const privateRoomInvite = document.getElementById("private-room-invite");
const inviteFriendsForm = document.getElementById("invite-friends-form");
const inviteFriendInput = document.getElementById("invite-friend-input");
const inviteFriendResults = document.getElementById("invite-friend-results");
const invitedUsersList = document.getElementById("invited-users");
// Tabs & collapsible sections (Messenger-like)
const tabDms = document.getElementById('tab-dms');
const tabRooms = document.getElementById('tab-rooms');
const sectionDms = document.getElementById('section-dms');
const sectionRooms = document.getElementById('section-rooms');
const toggleDms = document.getElementById('toggle-dms');
const toggleRooms = document.getElementById('toggle-rooms');
function setTabs(active) {
    if (tabDms)
        tabDms.setAttribute('aria-selected', active === 'dms' ? 'true' : 'false');
    if (tabRooms)
        tabRooms.setAttribute('aria-selected', active === 'rooms' ? 'true' : 'false');
    // Mobile behavior: show only the active section
    if (sectionDms && sectionRooms) {
        if (active === 'dms') {
            sectionDms.style.display = '';
            sectionRooms.style.display = 'none';
        }
        else {
            sectionDms.style.display = 'none';
            sectionRooms.style.display = '';
        }
    }
}
function toggleSection(el) {
    if (!el)
        return;
    const expanded = el.getAttribute('aria-expanded') === 'true';
    el.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    // Simple collapse by toggling list visibility
    const list = el.querySelector('ul');
    if (list)
        list.style.display = expanded ? 'none' : '';
    const empty = el.querySelector('.room-empty');
    if (empty)
        empty.style.display = expanded ? 'none' : (list && list.children.length ? 'none' : 'block');
}
function initRoomTabsAndCollapsers() {
    // Default: DMs active
    setTabs('dms');
    if (sectionRooms)
        sectionRooms.setAttribute('aria-expanded', 'false');
    if (sectionDms)
        sectionDms.setAttribute('aria-expanded', 'true');
    if (tabDms)
        tabDms.onclick = () => setTabs('dms');
    if (tabRooms)
        tabRooms.onclick = () => setTabs('rooms');
    if (toggleDms)
        toggleDms.onclick = () => toggleSection(sectionDms);
    if (toggleRooms)
        toggleRooms.onclick = () => toggleSection(sectionRooms);
}
// Initialize tabs/collapsers on load
try {
    initRoomTabsAndCollapsers();
}
catch { }
const chatCard = document.getElementById("chat-card");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const backToRoomsBtn = document.getElementById("back-to-rooms");
const selectedRoomTitle = document.getElementById("selected-room-title");
// New UI elements
const userSearchForm = document.getElementById("user-search-form");
const userSearchInput = document.getElementById("user-search-input");
const userSearchResults = document.getElementById("user-search-results");
const friendsList = document.getElementById("friends-list");
const refreshFriendsBtn = document.getElementById("refresh-friends");
const roomParticipants = document.getElementById("room-participants");
// Simple refresh action for friends list
if (refreshFriendsBtn) {
    refreshFriendsBtn.onclick = () => requestFriendList();
}
// Toggle private room invite block visibility
if (createRoomPrivate) {
    createRoomPrivate.addEventListener('change', () => {
        const inviteBlock = document.getElementById('private-room-invite');
        if (!inviteBlock)
            return;
        inviteBlock.style.display = createRoomPrivate.checked ? 'block' : 'none';
        if (createRoomPrivate.checked) {
            // Initialize invite UI when opening
            if (typeof renderInvitedUsers === 'function') {
                try {
                    renderInvitedUsers();
                }
                catch { }
            }
            if (inviteFriendInput && typeof runInviteSearch === 'function') {
                try {
                    runInviteSearch(inviteFriendInput.value);
                }
                catch { }
            }
        }
    });
}
// State
let currentUser = null;
let selectedRoom = null;
let rooms = [];
let lastFriendItems = [];
let invitedUserIds = [];
// Track a DM we just initiated so we can auto-open when rooms refresh
let pendingDmTargetId = null;
// Unread counters by roomId
let unreadCounts = {};
// --- AUTH LOGIC dsiconnet all session user on all device ---
socket.on("forceLogout", function (data) {
    currentUser = null;
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    showAuthPanel(true);
    alert("Vous avez été déconnecté de tous vos appareils.");
});
// --- ROOM LIST LOGIC ---
function renderRoomList() {
    if (roomListRooms)
        roomListRooms.innerHTML = "";
    if (roomListDms)
        roomListDms.innerHTML = "";
    // Visibility: show public rooms, and private rooms if current user is a member or creator
    const visibleRooms = rooms.filter((room) => {
        if (room.isPublic === false) {
            const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
            if (!meId)
                return false;
            if (room.creatorId === meId)
                return true;
            const members = Array.isArray(room.users) ? room.users : [];
            return members.some((u) => u && u.id === meId);
        }
        return true; // public
    });
    const groupRooms = visibleRooms.filter((r) => r.type !== 'user');
    const dmRooms = visibleRooms.filter((r) => r.type === 'user');
    // Empty states
    if (noRoomMsgRooms)
        noRoomMsgRooms.style.display = groupRooms.length ? 'none' : 'block';
    if (noRoomMsgDms)
        noRoomMsgDms.style.display = dmRooms.length ? 'none' : 'block';
    // Render groups
    groupRooms.forEach((room) => {
        const li = document.createElement("li");
        li.className = "room-list-item";
        const displayName = room.name || 'Room';
        const initial = (displayName || '?').trim().charAt(0).toUpperCase();
        li.innerHTML = `
      <div class="room-avatar" aria-hidden="true">${initial}</div>
      <span class="room-name">${displayName}</span>
      <span class="room-badge" hidden></span>
    `;
        li.style.cursor = "pointer";
        li.onclick = () => joinRoom(room);
        // Active state
        if (selectedRoom && selectedRoom.id === room.id)
            li.classList.add('active');
        // Unread badge
        const badge = li.querySelector('.room-badge');
        const count = unreadCounts[room.id] || 0;
        if (badge) {
            if (count > 0) {
                badge.textContent = String(count);
                badge.hidden = false;
            }
            else {
                badge.hidden = true;
            }
        }
        roomListRooms && roomListRooms.appendChild(li);
    });
    // Render DMs
    dmRooms.forEach((room) => {
        const li = document.createElement("li");
        li.className = "room-list-item";
        // Prefer showing other participant name if available
        let label = room.name || 'DM';
        try {
            const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
            const members = Array.isArray(room.users) ? room.users : [];
            const other = meId ? members.find((u) => u && u.id !== meId) : null;
            if (other && other.name)
                label = other.name;
        }
        catch { }
        const initial = (label || '?').trim().charAt(0).toUpperCase();
        li.innerHTML = `
      <div class="room-avatar" aria-hidden="true">${initial}</div>
      <span class="room-name">${label}</span>
      <span class="room-badge" hidden></span>
    `;
        li.style.cursor = "pointer";
        li.onclick = () => joinRoom(room);
        // Active state
        if (selectedRoom && selectedRoom.id === room.id)
            li.classList.add('active');
        // Unread badge
        const badge = li.querySelector('.room-badge');
        const count = unreadCounts[room.id] || 0;
        if (badge) {
            if (count > 0) {
                badge.textContent = String(count);
                badge.hidden = false;
            }
            else {
                badge.hidden = true;
            }
        }
        roomListDms && roomListDms.appendChild(li);
    });
}
socket.on("rooms", (serverRooms) => {
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
    if (!name || !currentUser)
        return;
    const isPrivate = !!(createRoomPrivate && createRoomPrivate.checked);
    const isPublic = !isPrivate;
    const payload = { name, creatorId: currentUser.id, type: 'room', isPublic };
    if (isPrivate) {
        payload.invitedUserIds = invitedUserIds.slice();
    }
    socket.emit("createRoom", payload);
    createRoomName.value = "";
    // reset invites UI
    invitedUserIds = [];
    if (invitedUsersList)
        invitedUsersList.innerHTML = "";
});
// --- JOIN ROOM ---
function joinRoom(room) {
    if (!currentUser)
        return;
    selectedRoom = room;
    selectedRoomTitle.textContent = `💬 Room : ${room.name}`;
    // UI : afficher la chatbox, masquer la liste des rooms
    roomPanel.style.display = "none";
    chatCard.style.display = "block";
    chatWindow.innerHTML = "";
    if (roomParticipants)
        roomParticipants.textContent = "";
    socket.emit("joinRoom", { roomId: room.id });
    // Reset unread counter when entering the room
    unreadCounts[room.id] = 0;
    try {
        renderRoomList();
    }
    catch { }
}
backToRoomsBtn.addEventListener("click", function () {
    selectedRoom = null;
    chatCard.style.display = "none";
    roomPanel.style.display = "block";
    chatWindow.innerHTML = "";
});
// Gestion logout (WebSocket uniquement)
if (logoutBtn) {
    logoutBtn.onclick = function () {
        socket.emit('logout', {}, (res) => {
            // Peu importe la réponse, on réinitialise l'état
            currentUser = null;
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
            showAuthPanel(true);
        });
    };
}
if (logoutAllBtn) {
    logoutAllBtn.onclick = function () {
        socket.emit('logoutAll', {}, (res) => {
            currentUser = null;
            document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
            showAuthPanel(true);
        });
    };
}
// --- CHATBOX LOGIC (par room) ---
function getUserColorClass(authorName) {
    let hash = 0;
    for (let i = 0; i < authorName.length; i++)
        hash = (hash + authorName.charCodeAt(i)) % 256;
    return "user-color-" + (1 + (hash % 8));
}
function renderMsg(msg) {
    var _a;
    const authorName = ((_a = msg.author) === null || _a === void 0 ? void 0 : _a.name) || "???";
    const { content, timestamp } = msg;
    const div = document.createElement("div");
    const isMine = currentUser && authorName === currentUser.name;
    let classes = "message";
    if (isMine) {
        classes += " mine";
    }
    else {
        classes += " " + getUserColorClass(authorName);
    }
    div.className = classes;
    if (msg && msg.id != null) {
        try {
            div.dataset.messageId = String(msg.id);
        }
        catch { }
    }
    const time = new Date(timestamp).toLocaleTimeString();
    // status badge for own messages only
    const status = String(msg.status || "sent");
    const statusText = (() => {
        if (!isMine)
            return "";
        if (status === "read")
            return "✓✓";
        if (status === "delivered")
            return "✓";
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
socket.on("roomHistory", (data) => {
    if (!selectedRoom || data.roomId !== selectedRoom.id)
        return;
    chatWindow.innerHTML = "";
    data.messages.forEach(renderMsg);
    // Mark messages as delivered/read upon viewing history
    try {
        const now = Date.now();
        (data.messages || []).forEach((m) => {
            var _a;
            const authorName = (_a = m === null || m === void 0 ? void 0 : m.author) === null || _a === void 0 ? void 0 : _a.name;
            const mine = currentUser && authorName === currentUser.name;
            const midStr = (m === null || m === void 0 ? void 0 : m.id) != null ? String(m.id) : "";
            const mid = parseInt(midStr, 10);
            if (!mine && Number.isFinite(mid)) {
                socket.emit("messageDelivered", { messageId: mid, roomId: data.roomId, timestamp: now });
                socket.emit("messageRead", { messageId: mid, roomId: data.roomId, timestamp: now });
            }
        });
    }
    catch { }
});
// Participants de la room
function renderParticipants(users) {
    if (!roomParticipants)
        return;
    if (!users || users.length === 0) {
        roomParticipants.textContent = "";
        return;
    }
    const names = users.map((u) => u.name).join(", ");
    roomParticipants.textContent = `Participants: ${names}`;
}
socket.on("roomUsers", (payload) => {
    if (!selectedRoom || !payload || payload.roomId !== selectedRoom.id)
        return;
    renderParticipants(payload.users || []);
});
// Nouveau message dans la room
socket.on("message", (data) => {
    var _a, _b, _c, _d;
    // If message is for the currently open room, render it
    if (selectedRoom && data.roomId === selectedRoom.id) {
        renderMsg(data.message);
        // Acknowledge delivery/read for messages from others in active room
        try {
            const m = data.message;
            const authorName = (_a = m === null || m === void 0 ? void 0 : m.author) === null || _a === void 0 ? void 0 : _a.name;
            const mine = currentUser && authorName === currentUser.name;
            const mid = parseInt(String((_b = m === null || m === void 0 ? void 0 : m.id) !== null && _b !== void 0 ? _b : ''), 10);
            if (!mine && Number.isFinite(mid)) {
                const now = Date.now();
                socket.emit("messageDelivered", { messageId: mid, roomId: data.roomId, timestamp: now });
                socket.emit("messageRead", { messageId: mid, roomId: data.roomId, timestamp: now });
            }
        }
        catch { }
        return;
    }
    // Otherwise, increment unread counter (ignore own messages)
    try {
        const authorName = (_d = (_c = data === null || data === void 0 ? void 0 : data.message) === null || _c === void 0 ? void 0 : _c.author) === null || _d === void 0 ? void 0 : _d.name;
        if (!currentUser || authorName === currentUser.name)
            return;
        unreadCounts[data.roomId] = (unreadCounts[data.roomId] || 0) + 1;
        renderRoomList();
    }
    catch { }
});
// Gestion des erreurs serveur
socket.on("error", (err) => {
    if (authPanel.style.display !== "none") {
        authError.textContent = err.error || "Erreur serveur";
        authError.style.display = "block";
    }
    else {
        alert(err.error || "Erreur serveur");
    }
});
// Formulaire d'envoi de message (dans la room sélectionnée)
chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selectedRoom || !currentUser)
        return;
    const content = messageInput.value.trim();
    if (!content)
        return;
    socket.emit("sendMessageToRoom", {
        roomId: selectedRoom.id,
        content,
        timestamp: Date.now(),
    });
    messageInput.value = "";
});
// Update status UI when server notifies
socket.on("messageStatusUpdated", (evt) => {
    try {
        const mid = evt && evt.messageId != null ? String(evt.messageId) : "";
        if (!mid)
            return;
        const el = chatWindow.querySelector(`[data-message-id="${mid}"]`);
        if (!el)
            return;
        const statusEl = el.querySelector('.msg-status');
        if (!statusEl)
            return; // Only own messages render status
        const status = String(evt.status || '').toLowerCase();
        if (status === 'read') {
            statusEl.textContent = '✓✓';
        }
        else if (status === 'delivered') {
            // Only upgrade from blank to single tick if not already read
            if (statusEl.textContent !== '✓✓')
                statusEl.textContent = '✓';
        }
    }
    catch { }
});
// Affiche ou masque les panneaux selon l'état d'authentification
function showAuthPanel(show) {
    authPanel.style.display = show ? "block" : "none";
    roomPanel.style.display = show ? "none" : "block";
    chatCard.style.display = "none";
    createRoomForm.style.display = show ? "none" : "flex";
    chatForm.style.display = show ? "none" : "flex";
    // Affiche les boutons logout uniquement si connecté
    if (userActions)
        userActions.style.display = show ? "none" : "block";
}
// --- Auth automatique via cookie/sessionToken ---
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}
const sessionToken = getCookie('session_token');
if (sessionToken) {
    socket.emit('authenticate', { token: sessionToken }, (res) => {
        if (res && res.success) {
            currentUser = { id: res.id, name: res.name };
            showAuthPanel(false);
            socket.emit("getRooms");
            requestFriendList();
        }
        else {
            // Token invalide, afficher login
            showAuthPanel(true);
        }
    });
}
else {
    showAuthPanel(true);
}
// Auth: login
loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    if (!username || !password)
        return;
    socket.emit("login", { username, password }, (res) => {
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
            authError.textContent = (data === null || data === void 0 ? void 0 : data.error) || 'Registration failed.';
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
    }
    catch (_err) {
        authError.textContent = 'Registration failed.';
        authError.style.display = 'block';
    }
});
// Initial : demander la liste des rooms (si non pushée automatiquement)
// (ne rien faire tant qu'on n'est pas authentifié)
// --- User search (REST) ---
async function searchUsers(query, limit = 20) {
    const url = `/api/chat/users/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok)
        throw new Error('Search failed');
    const data = await res.json();
    // Support both formats: array or { users: [...] }
    if (Array.isArray(data))
        return data;
    return (data === null || data === void 0 ? void 0 : data.users) || [];
}
// Simple debounce utility for live search
function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
        if (t)
            window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), wait);
    };
}
function renderSearchResults(users) {
    if (!userSearchResults)
        return;
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
            if (!currentUser)
                return;
            socket.emit('friendRequest', { targetUserId: u.id }, (resp) => {
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
    const submitBtn = userSearchForm.querySelector('button[type="submit"]');
    if (submitBtn)
        submitBtn.style.display = 'none';
    // Prevent form submit navigation
    userSearchForm.addEventListener('submit', (e) => e.preventDefault());
    const runSearch = debounce(async () => {
        const q = userSearchInput.value.trim();
        if (!q) {
            if (userSearchResults)
                userSearchResults.innerHTML = '';
            return;
        }
        try {
            const items = await searchUsers(q, 20);
            renderSearchResults(items);
        }
        catch (_err) {
            if (userSearchResults)
                userSearchResults.innerHTML = '<li style="color:#888;">Recherche impossible</li>';
        }
    }, 300);
    userSearchInput.addEventListener('input', runSearch);
}
// --- Friends via WebSocket ---
function renderFriends(items) {
    lastFriendItems = items || [];
    if (!friendsList)
        return;
    friendsList.innerHTML = '';
    // Layout container: two columns (left friends, right requests)
    const row = document.createElement('div');
    row.className = 'friend-sections';
    const colFriends = document.createElement('div');
    colFriends.className = 'friend-column';
    const hFriends = document.createElement('div');
    hFriends.textContent = 'Amis';
    hFriends.className = 'friend-column-title';
    const ulFriends = document.createElement('ul');
    ulFriends.className = 'friend-list';
    const colRequests = document.createElement('div');
    colRequests.className = 'friend-column';
    const hRequests = document.createElement('div');
    hRequests.textContent = 'Demandes';
    hRequests.className = 'friend-column-title';
    const ulRequests = document.createElement('ul');
    ulRequests.className = 'friend-list';
    // Separate accepted friends and incoming pending requests
    const accepted = lastFriendItems.filter((it) => it && it.status === 'accepted');
    const incoming = lastFriendItems.filter((it) => it && it.status === 'pending' && !it.isRequester);
    // Friends (accepted): name + Message button, no status label
    accepted.forEach((it) => {
        const otherName = it.name || 'inconnu';
        const li = document.createElement('li');
        li.className = 'room-list-item friend-item';
        const label = document.createElement('span');
        label.textContent = otherName;
        label.className = 'friend-item-name';
        const actions = document.createElement('span');
        actions.className = 'friend-actions';
        const msgBtn = document.createElement('button');
        msgBtn.textContent = 'Message';
        msgBtn.className = 'chat-send-btn';
        msgBtn.onclick = () => startDM(it.userId || it.id, otherName);
        actions.appendChild(msgBtn);
        li.appendChild(label);
        li.appendChild(actions);
        ulFriends.appendChild(li);
    });
    // Requests (incoming pending): name + Accept/Reject
    incoming.forEach((it) => {
        const otherName = it.name || 'inconnu';
        const li = document.createElement('li');
        li.className = 'room-list-item friend-item';
        const label = document.createElement('span');
        label.textContent = otherName;
        label.className = 'friend-item-name';
        const actions = document.createElement('span');
        actions.className = 'friend-actions';
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
        ulRequests.appendChild(li);
    });
    // Assemble columns
    colFriends.appendChild(hFriends);
    colFriends.appendChild(ulFriends);
    colRequests.appendChild(hRequests);
    colRequests.appendChild(ulRequests);
    row.appendChild(colFriends);
    row.appendChild(colRequests);
    friendsList.appendChild(row);
}
function requestFriendList() {
    if (!currentUser)
        return;
    socket.emit('friendList', {}, (resp) => {
        if (resp && resp.success) {
            renderFriends(resp.items || []);
            // Refresh invite UI if visible
            const inviteBlock = document.getElementById('private-room-invite');
            if (inviteBlock && inviteBlock.style.display !== 'none') {
                try {
                    renderInvitedUsers();
                }
                catch { }
                if (inviteFriendInput)
                    try {
                        runInviteSearch(inviteFriendInput.value);
                    }
                    catch { }
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
function findExistingDm(friendId) {
    const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
    if (!meId)
        return null;
    return (rooms.find((r) => {
        if (r.type !== 'user')
            return false;
        const members = Array.isArray(r.users) ? r.users : [];
        const ids = members.map((u) => u && u.id).filter(Boolean);
        // DM if both participants are present
        return ids.includes(meId) && ids.includes(friendId);
    }) || null);
}
function startDM(friendId, friendName) {
    if (!currentUser)
        return;
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
    if (!invitedUsersList)
        return;
    invitedUsersList.innerHTML = '';
    const acceptedFriends = lastFriendItems.filter((f) => f && (f.status === 'accepted'));
    invitedUserIds.forEach((id) => {
        const friend = acceptedFriends.find((f) => (f.userId || f.id) === id);
        const name = (friend === null || friend === void 0 ? void 0 : friend.name) || 'inconnu';
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
function renderInviteFriendResults(matches) {
    if (!inviteFriendResults)
        return;
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
function runInviteSearch(query) {
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
