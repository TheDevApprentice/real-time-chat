// core.ts - shared utilities and helpers (global functions, no modules)
// This file defines small, self-contained utilities used across the chat UI.
// It intentionally uses global function names to avoid changing existing call sites.
// Ensure a theme is set so CSS variables from base.css apply
function ensureTheme() {
    const root = document.documentElement;
    if (!root.getAttribute("data-theme")) {
        const prefersDark = window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
}
// Simple debounce utility for live search and other UI events
function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
        if (t)
            window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), wait);
    };
}
// Cookie helper
function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
}
// Relative time formatter used in presence labels
function formatRelative(ts) {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60)
        return `il y a ${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `il y a ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `il y a ${d}j`;
}
// dom.ts - DOM helpers and layout control (desktop-only test UI)
// Exposes global helpers used by other files, no modules/imports.
function getLayoutContainer() {
    return document.querySelector(".chat-root.layout");
}
function showSidebar(show) {
    try {
        const roomPanel = document.getElementById("room-panel");
        if (roomPanel)
            roomPanel.style.display = show ? "block" : "none";
    }
    catch { }
}
function showChat(show) {
    try {
        const chatCard = document.getElementById("chat-card");
        if (chatCard)
            chatCard.style.display = show ? "block" : "none";
    }
    catch { }
}
function syncLayoutVisibility() {
    const roomPanel = document.getElementById("room-panel");
    const chatCard = document.getElementById("chat-card");
    if (!roomPanel || !chatCard)
        return;
    const currentUser = window.currentUser;
    const selectedRoom = window.selectedRoom;
    const authed = !!currentUser;
    const layout = getLayoutContainer();
    if (layout)
        layout.style.display = authed ? "" : "none";
    // Desktop-only: always show sidebar; show chat only when a room is selected
    showSidebar(true);
    showChat(!!selectedRoom);
    // Expand sidebar to full width when no chat is selected
    if (layout) {
        try {
            if (!selectedRoom)
                layout.classList.add("no-chat");
            else
                layout.classList.remove("no-chat");
        }
        catch { }
    }
}
// Typing banner helpers
function ensureTypingBannerEl() {
    var _a;
    const title = document.getElementById("selected-room-title");
    if (!title)
        return null;
    let banner = document.getElementById("typing-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "typing-banner";
        banner.style.fontSize = "12px";
        banner.style.color = "#888";
        banner.style.margin = "4px 0 8px 0";
        try {
            (_a = title.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(banner, title.nextSibling);
        }
        catch { }
    }
    return banner;
}
function setTypingBanner(text) {
    const banner = ensureTypingBannerEl();
    if (!banner)
        return;
    try {
        banner.textContent = text || "";
    }
    catch { }
}
function renderTypingBanner() {
    try {
        const typingUsers = window.typingUsers;
        const count = typingUsers ? typingUsers.size : 0;
        if (!count || count <= 0) {
            setTypingBanner("");
            return;
        }
        const text = count === 1
            ? "Quelqu'un est en train d'écrire…"
            : "Plusieurs personnes écrivent…";
        setTypingBanner(text);
    }
    catch { }
}
// friends.ts - friends list, requests dropdown, badge, and DM helpers
// Depends on global state: currentUser, rooms, pendingDmTargetId, lastFriendItems
// Depends on socket (global)
// DOM references (queried here to decouple from chat-client.ts order)
const btnFriends = document.getElementById("btn-friends");
const btnRequests = document.getElementById("btn-requests");
const requestsBadge = document.getElementById("requests-badge");
const friendsDropdown = document.getElementById("friends-dropdown");
const requestsDropdown = document.getElementById("requests-dropdown");
function hideDropdown(el) {
    if (el)
        el.hidden = true;
}
function showDropdown(el) {
    if (el)
        el.hidden = false;
}
// Render friends and requests into dropdowns and update badge
function renderFriends(items) {
    window.lastFriendItems = items || [];
    const accepted = items.filter((it) => it && it.status === "accepted");
    const pending = items.filter((it) => it && (it.status === "pending" || it.status === "received"));
    // Badge
    if (requestsBadge) {
        const n = pending.length;
        if (n > 0) {
            requestsBadge.textContent = String(n);
            requestsBadge.hidden = false;
        }
        else {
            requestsBadge.hidden = true;
        }
    }
    // Auto-close requests dropdown when empty
    if (pending.length === 0) {
        hideDropdown(requestsDropdown);
        btnRequests === null || btnRequests === void 0 ? void 0 : btnRequests.setAttribute("aria-expanded", "false");
    }
    if (friendsDropdown) {
        friendsDropdown.innerHTML = "";
        const ul = document.createElement("ul");
        ul.className = "room-list";
        accepted.forEach((it) => {
            const li = document.createElement("li");
            li.className = "room-list-item";
            const name = it.name || "inconnu";
            li.innerHTML = `<span>${name}</span>`;
            const msgBtn = document.createElement("button");
            msgBtn.textContent = "Message";
            msgBtn.className = "chat-send-btn";
            msgBtn.style.float = "right";
            msgBtn.onclick = () => startDM(it.userId || it.id, name);
            li.appendChild(msgBtn);
            ul.appendChild(li);
        });
        friendsDropdown.appendChild(ul);
    }
    if (requestsDropdown) {
        requestsDropdown.innerHTML = "";
        const ul = document.createElement("ul");
        ul.className = "room-list";
        pending.forEach((it) => {
            const li = document.createElement("li");
            li.className = "room-list-item";
            const name = it.name || "inconnu";
            const label = document.createElement("span");
            label.textContent = name;
            const actions = document.createElement("span");
            actions.style.float = "right";
            const acceptBtn = document.createElement("button");
            acceptBtn.textContent = "Accepter";
            acceptBtn.className = "chat-send-btn";
            acceptBtn.onclick = () => socket.emit("friendRespond", { otherUserId: it.userId, action: "accept" }, () => requestFriendList());
            const declineBtn = document.createElement("button");
            declineBtn.textContent = "Refuser";
            declineBtn.className = "auth-btn";
            declineBtn.onclick = () => socket.emit("friendRespond", { otherUserId: it.userId, action: "reject" }, () => requestFriendList());
            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);
            li.appendChild(label);
            li.appendChild(actions);
            ul.appendChild(li);
        });
        requestsDropdown.appendChild(ul);
    }
}
function requestFriendList() {
    if (!window.currentUser)
        return;
    socket.emit("friendList", {}, (resp) => {
        if (resp && resp.success) {
            renderFriends(resp.items || []);
        }
        const pendingDmTargetId = window.pendingDmTargetId;
        if (pendingDmTargetId) {
            const friend = (resp.items || []).find((it) => it.userId === pendingDmTargetId);
            if (friend && friend.status === "accepted") {
                startDM(pendingDmTargetId, friend.name);
                window.pendingDmTargetId = null;
            }
        }
    });
}
// DM helpers
function findExistingDm(friendId) {
    var _a;
    const meId = (_a = window.currentUser) === null || _a === void 0 ? void 0 : _a.id;
    const rooms = window.rooms || [];
    if (!meId)
        return null;
    return (rooms.find((r) => {
        if (r.type !== "user")
            return false;
        const members = Array.isArray(r.users)
            ? r.users
            : [];
        const ids = members.map((u) => u && u.id).filter(Boolean);
        return ids.includes(meId) && ids.includes(friendId);
    }) || null);
}
function startDM(friendId, friendName) {
    const currentUser = window.currentUser;
    if (!currentUser)
        return;
    const existing = findExistingDm(friendId);
    if (existing) {
        window.joinRoom(existing);
        return;
    }
    window.pendingDmTargetId = friendId;
    const name = `${currentUser.name} ↔ ${friendName}`;
    socket.emit("createRoom", {
        name,
        type: "user",
        isPublic: false,
        invitedUserIds: [friendId],
    });
}
// Toolbar wiring
btnFriends === null || btnFriends === void 0 ? void 0 : btnFriends.addEventListener("click", () => {
    const expanded = btnFriends.getAttribute("aria-expanded") === "true";
    btnFriends.setAttribute("aria-expanded", expanded ? "false" : "true");
    if (expanded)
        hideDropdown(friendsDropdown);
    else {
        showDropdown(friendsDropdown);
        hideDropdown(requestsDropdown);
        btnRequests === null || btnRequests === void 0 ? void 0 : btnRequests.setAttribute("aria-expanded", "false");
    }
});
btnRequests === null || btnRequests === void 0 ? void 0 : btnRequests.addEventListener("click", () => {
    const last = window.lastFriendItems || [];
    const hasPending = last.some((it) => it && (it.status === "pending" || it.status === "received"));
    const expanded = btnRequests.getAttribute("aria-expanded") === "true";
    if (!expanded) {
        if (!hasPending)
            return;
        btnRequests.setAttribute("aria-expanded", "true");
        showDropdown(requestsDropdown);
        hideDropdown(friendsDropdown);
        btnFriends === null || btnFriends === void 0 ? void 0 : btnFriends.setAttribute("aria-expanded", "false");
    }
    else {
        btnRequests.setAttribute("aria-expanded", "false");
        hideDropdown(requestsDropdown);
    }
});
document.addEventListener("click", (e) => {
    const t = e.target;
    const inFriends = (friendsDropdown === null || friendsDropdown === void 0 ? void 0 : friendsDropdown.contains(t)) || (btnFriends === null || btnFriends === void 0 ? void 0 : btnFriends.contains(t));
    const inRequests = (requestsDropdown === null || requestsDropdown === void 0 ? void 0 : requestsDropdown.contains(t)) || (btnRequests === null || btnRequests === void 0 ? void 0 : btnRequests.contains(t));
    if (!inFriends) {
        hideDropdown(friendsDropdown);
        btnFriends === null || btnFriends === void 0 ? void 0 : btnFriends.setAttribute("aria-expanded", "false");
    }
    if (!inRequests) {
        hideDropdown(requestsDropdown);
        btnRequests === null || btnRequests === void 0 ? void 0 : btnRequests.setAttribute("aria-expanded", "false");
    }
});
// search.ts - user search bar behavior and rendering
// Depends on core.ts for debounce and fetch helpers
const userSearchForm = document.getElementById("user-search-form");
const userSearchInput = document.getElementById("user-search-input");
const userSearchResults = document.getElementById("user-search-results");
async function searchUsers(query, limit = 20) {
    const url = `/api/chat/users/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok)
        throw new Error("Search failed");
    const data = await res.json();
    if (Array.isArray(data))
        return data;
    return (data === null || data === void 0 ? void 0 : data.users) || [];
}
function renderSearchResults(users) {
    if (!userSearchResults)
        return;
    userSearchResults.innerHTML = "";
    const currentUser = window.currentUser;
    const socket = window.socket;
    users
        .filter((u) => !currentUser || u.id !== currentUser.id)
        .forEach((u) => {
        const li = document.createElement("li");
        li.className = "room-list-item";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = u.name;
        const actions = document.createElement("span");
        actions.style.float = "right";
        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.title = "Ajouter ami";
        addBtn.className = "chat-send-btn";
        addBtn.style.width = "32px";
        addBtn.style.padding = "4px 0";
        addBtn.onclick = () => {
            const me = window.currentUser;
            if (!me)
                return;
            socket.emit("friendRequest", { targetUserId: u.id }, (_resp) => {
                if (typeof window.requestFriendList === "function") {
                    try {
                        window.requestFriendList();
                    }
                    catch { }
                }
            });
        };
        actions.appendChild(addBtn);
        li.appendChild(nameSpan);
        li.appendChild(actions);
        userSearchResults.appendChild(li);
    });
}
(function initUserSearch() {
    if (!userSearchForm || !userSearchInput)
        return;
    const submitBtn = userSearchForm.querySelector('button[type="submit"]');
    if (submitBtn)
        submitBtn.style.display = "none";
    userSearchForm.addEventListener("submit", (e) => e.preventDefault());
    const runSearch = debounce(async () => {
        const q = userSearchInput.value.trim();
        if (!q) {
            if (userSearchResults)
                userSearchResults.innerHTML = "";
            return;
        }
        try {
            const items = await searchUsers(q, 20);
            renderSearchResults(items);
        }
        catch (_err) {
            if (userSearchResults)
                userSearchResults.innerHTML =
                    '<li style="color:#888;">Recherche impossible</li>';
        }
    }, 300);
    userSearchInput.addEventListener("input", runSearch);
})();
// rooms.ts - unified room list rendering and room join helpers
// Works with global state kept on window (no modules).
(function () {
    const w = window;
    if (w.__rooms_ts_initialized__)
        return; // idempotent
    w.__rooms_ts_initialized__ = true;
    // Provide helpers on window only if not already present
    if (!w.renderRoomList)
        w.renderRoomList = function renderRoomList() {
            const roomListAll = document.getElementById("room-list-all");
            const noRoomMsgAll = document.getElementById("no-room-msg-all");
            const rooms = w.rooms || [];
            const currentUser = w.currentUser;
            const selectedRoom = w.selectedRoom;
            const unreadCounts = w.unreadCounts || {};
            if (roomListAll)
                roomListAll.innerHTML = "";
            const visibleRooms = rooms.filter((room) => {
                if (room.isPublic === false) {
                    const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
                    if (!meId)
                        return false;
                    if (room.creatorId === meId)
                        return true;
                    const members = Array.isArray(room.users)
                        ? room.users
                        : [];
                    return members.some((u) => u && u.id === meId);
                }
                return true; // public
            });
            if (noRoomMsgAll)
                noRoomMsgAll.style.display = visibleRooms.length ? "none" : "block";
            visibleRooms.forEach((room) => {
                const li = document.createElement("li");
                li.className = "room-list-item";
                let label = room.name || (room.type === "user" ? "DM" : "Room");
                if (room.type === "user") {
                    try {
                        const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
                        const members = Array.isArray(room.users)
                            ? room.users
                            : [];
                        const other = meId ? members.find((u) => u && u.id !== meId) : null;
                        if (other && other.name)
                            label = other.name;
                    }
                    catch { }
                }
                const typeIcon = room.type === "user" ? "👤" : "📁";
                const initial = (label || "?").trim().charAt(0).toUpperCase();
                li.innerHTML = `
        <div class="room-avatar" aria-hidden="true">${initial}</div>
        <span class="room-type-icon" aria-hidden="true">${typeIcon}</span>
        <span class="room-name">${label}</span>
        <span class="room-badge" hidden></span>
      `;
                li.style.cursor = "pointer";
                li.onclick = () => (w.joinRoom ? w.joinRoom(room) : undefined);
                if (selectedRoom && selectedRoom.id === room.id)
                    li.classList.add("active");
                const badge = li.querySelector(".room-badge");
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
                roomListAll && roomListAll.appendChild(li);
            });
        };
    if (!w.renderParticipants)
        w.renderParticipants = function renderParticipants(users) {
            const roomParticipants = document.getElementById("room-participants");
            if (!roomParticipants)
                return;
            if (!users || users.length === 0) {
                roomParticipants.textContent = "";
                return;
            }
            const names = users.map((u) => u.name).join(", ");
            roomParticipants.textContent = `Participants: ${names}`;
        };
    if (!w.joinRoom)
        w.joinRoom = function joinRoom(room) {
            const currentUser = w.currentUser;
            if (!currentUser)
                return;
            w.selectedRoom = room;
            const selectedRoomTitle = document.getElementById("selected-room-title");
            if (selectedRoomTitle)
                selectedRoomTitle.textContent = `💬 Room : ${room.name}`;
            // Reset typing banner and state
            if (w.typingUsers && typeof w.typingUsers.clear === "function")
                w.typingUsers.clear();
            if (typeof w.setTypingBanner === "function")
                try {
                    w.setTypingBanner("");
                }
                catch { }
            // UI: responsive visibility
            if (typeof w.syncLayoutVisibility === "function")
                w.syncLayoutVisibility();
            const chatWindow = document.getElementById("chat-window");
            if (chatWindow)
                chatWindow.innerHTML = "";
            const roomParticipants = document.getElementById("room-participants");
            if (roomParticipants)
                roomParticipants.textContent = "";
            const socket = w.socket;
            socket.emit("joinRoom", { roomId: room.id });
            // Reset unread counter
            w.unreadCounts = w.unreadCounts || {};
            w.unreadCounts[room.id] = 0;
            try {
                if (typeof w.renderRoomList === "function")
                    w.renderRoomList();
            }
            catch { }
            try {
                if (typeof w.setupDmPresence === "function")
                    w.setupDmPresence(room);
            }
            catch { }
        };
})();
// messaging.ts - message rendering, send form, typing indicators
(function () {
    const w = window;
    if (w.__messaging_ts_initialized__)
        return;
    w.__messaging_ts_initialized__ = true;
    function getChatWindow() {
        return document.getElementById("chat-window");
    }
    function getChatForm() {
        return document.getElementById("chat-form");
    }
    function getMessageInput() {
        return document.getElementById("message");
    }
    function getUserColorClass(authorName) {
        let hash = 0;
        for (let i = 0; i < authorName.length; i++)
            hash = (hash + authorName.charCodeAt(i)) % 256;
        return "user-color-" + (1 + (hash % 8));
    }
    // Expose renderer globally
    w.renderMsg = function renderMsg(msg) {
        var _a;
        const chatWindow = getChatWindow();
        if (!chatWindow)
            return;
        const currentUser = w.currentUser;
        const authorName = ((_a = msg.author) === null || _a === void 0 ? void 0 : _a.name) || "???";
        const { content, timestamp } = msg;
        const div = document.createElement("div");
        const isMine = currentUser && authorName === currentUser.name;
        let classes = "message";
        if (isMine)
            classes += " mine";
        else
            classes += " " + getUserColorClass(authorName);
        div.className = classes;
        if (msg && msg.id != null) {
            try {
                div.dataset.messageId = String(msg.id);
            }
            catch { }
        }
        const time = new Date(timestamp).toLocaleTimeString();
        const status = String(msg.status || "sent");
        const statusText = (() => {
            if (!isMine)
                return "";
            if (status === "read")
                return "✓✓";
            if (status === "delivered")
                return "✓";
            return "";
        })();
        div.innerHTML = `
      <div class="msg-meta-row">
        <span class="msg-author">${authorName}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-content">${content}</div>
      ${isMine
            ? `<span class="msg-status" aria-label="status">${statusText}</span>`
            : ""}
   `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };
    // Send form
    const chatForm = getChatForm();
    const messageInput = getMessageInput();
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const selectedRoom = w.selectedRoom;
            const currentUser = w.currentUser;
            if (!selectedRoom || !currentUser)
                return;
            const content = ((messageInput === null || messageInput === void 0 ? void 0 : messageInput.value) || "").trim();
            if (!content)
                return;
            w.socket.emit("sendMessageToRoom", {
                roomId: selectedRoom.id,
                content,
                timestamp: Date.now(),
            });
            if (messageInput)
                messageInput.value = "";
        });
    }
    // Typing
    let typingStopTimer = null;
    let lastTypingEmit = 0;
    if (messageInput) {
        messageInput.addEventListener("input", () => {
            const selectedRoom = w.selectedRoom;
            const currentUser = w.currentUser;
            if (!selectedRoom || !currentUser)
                return;
            const now = Date.now();
            if (now - lastTypingEmit > 3000) {
                try {
                    w.socket.emit("typingStart", { roomId: selectedRoom.id });
                }
                catch { }
                lastTypingEmit = now;
            }
            if (typingStopTimer)
                window.clearTimeout(typingStopTimer);
            typingStopTimer = window.setTimeout(() => {
                try {
                    w.socket.emit("typingStop", { roomId: selectedRoom.id });
                }
                catch { }
                typingStopTimer = null;
            }, 1500);
        });
        messageInput.addEventListener("blur", () => {
            const selectedRoom = w.selectedRoom;
            const currentUser = w.currentUser;
            if (!selectedRoom || !currentUser)
                return;
            try {
                w.socket.emit("typingStop", { roomId: selectedRoom.id });
            }
            catch { }
        });
    }
})();
// room_creation.ts - drawer + create room + private invites
(function () {
    const w = window;
    if (w.__room_creation_ts_initialized__)
        return;
    w.__room_creation_ts_initialized__ = true;
    const btnOpenRoomDrawer = document.getElementById("btn-open-room-drawer");
    const btnCloseRoomDrawer = document.getElementById("btn-close-room-drawer");
    const roomDrawer = document.getElementById("room-drawer");
    function openRoomDrawer() {
        if (roomDrawer)
            roomDrawer.setAttribute("aria-hidden", "false");
    }
    function closeRoomDrawer() {
        if (roomDrawer)
            roomDrawer.setAttribute("aria-hidden", "true");
    }
    btnOpenRoomDrawer === null || btnOpenRoomDrawer === void 0 ? void 0 : btnOpenRoomDrawer.addEventListener("click", openRoomDrawer);
    btnCloseRoomDrawer === null || btnCloseRoomDrawer === void 0 ? void 0 : btnCloseRoomDrawer.addEventListener("click", closeRoomDrawer);
    roomDrawer === null || roomDrawer === void 0 ? void 0 : roomDrawer.addEventListener("click", (e) => {
        if (e.target === roomDrawer)
            closeRoomDrawer();
    });
    // Create room form + private toggle + invite
    const createRoomForm = document.getElementById("create-room-form");
    const createRoomName = document.getElementById("create-room-name");
    const createRoomPrivate = document.getElementById("create-room-private");
    const inviteBlock = document.getElementById("private-room-invite");
    const inviteFriendsForm = document.getElementById("invite-friends-form");
    const inviteFriendInput = document.getElementById("invite-friend-input");
    const inviteFriendResults = document.getElementById("invite-friend-results");
    const invitedUsersList = document.getElementById("invited-users");
    w.invitedUserIds = w.invitedUserIds || [];
    w.lastFriendItems = w.lastFriendItems || [];
    function renderInvitedUsers() {
        if (!invitedUsersList)
            return;
        invitedUsersList.innerHTML = "";
        const acceptedFriends = (w.lastFriendItems || []).filter((f) => f && f.status === "accepted");
        w.invitedUserIds.forEach((id) => {
            const friend = acceptedFriends.find((f) => (f.userId || f.id) === id);
            const name = (friend === null || friend === void 0 ? void 0 : friend.name) || "inconnu";
            const li = document.createElement("li");
            li.className = "room-list-item";
            const label = document.createElement("span");
            label.textContent = name;
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Retirer";
            removeBtn.className = "auth-btn";
            removeBtn.style.float = "right";
            removeBtn.onclick = () => {
                w.invitedUserIds = w.invitedUserIds.filter((x) => x !== id);
                renderInvitedUsers();
            };
            li.appendChild(label);
            li.appendChild(removeBtn);
            invitedUsersList.appendChild(li);
        });
    }
    w.renderInvitedUsers = renderInvitedUsers;
    function renderInviteFriendResults(matches) {
        if (!inviteFriendResults)
            return;
        inviteFriendResults.innerHTML = "";
        matches.forEach((u) => {
            const li = document.createElement("li");
            li.className = "room-list-item";
            const label = document.createElement("span");
            label.textContent = u.name;
            const addBtn = document.createElement("button");
            const already = w.invitedUserIds.includes(u.id);
            addBtn.textContent = already ? "Ajouté" : "Ajouter";
            addBtn.className = already ? "auth-btn" : "chat-send-btn";
            addBtn.style.float = "right";
            addBtn.disabled = already;
            addBtn.onclick = () => {
                if (!w.invitedUserIds.includes(u.id)) {
                    w.invitedUserIds.push(u.id);
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
        const q = (query || "").toLowerCase();
        const accepted = (w.lastFriendItems || []).filter((f) => f && f.status === "accepted");
        const mapped = accepted.map((f) => ({
            id: f.userId || f.id,
            name: f.name || "inconnu",
        }));
        const matches = mapped.filter((u) => u.name.toLowerCase().includes(q));
        renderInviteFriendResults(matches.slice(0, 30));
    }
    w.runInviteSearch = runInviteSearch;
    if (createRoomPrivate && inviteBlock) {
        createRoomPrivate.addEventListener("change", () => {
            inviteBlock.style.display = createRoomPrivate.checked ? "block" : "none";
            if (createRoomPrivate.checked) {
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
        });
    }
    if (inviteFriendsForm && inviteFriendInput) {
        inviteFriendsForm.addEventListener("submit", (e) => e.preventDefault());
        inviteFriendInput.addEventListener("input", () => runInviteSearch(inviteFriendInput.value));
    }
    if (createRoomForm) {
        createRoomForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const currentUser = w.currentUser;
            const socket = w.socket;
            const name = ((createRoomName === null || createRoomName === void 0 ? void 0 : createRoomName.value) || "").trim();
            if (!name || !currentUser)
                return;
            const isPrivate = !!(createRoomPrivate && createRoomPrivate.checked);
            const isPublic = !isPrivate;
            const payload = {
                name,
                creatorId: currentUser.id,
                type: "room",
                isPublic,
            };
            if (isPrivate)
                payload.invitedUserIds = w.invitedUserIds.slice();
            socket.emit("createRoom", payload);
            if (createRoomName)
                createRoomName.value = "";
            w.invitedUserIds = [];
            if (invitedUsersList)
                invitedUsersList.innerHTML = "";
        });
    }
})();
// sockets.ts - WebSocket setup and event wiring (global, no modules)
// Assumes other helpers are available globally (renderRoomList, renderMsg, renderParticipants, requestFriendList)
// and DOM helpers (showAuthPanel, syncLayoutVisibility, setTypingBanner, renderTypingBanner).
// Create a single global socket and expose it
var socket = window.socket || io();
window.socket = socket;
(function () {
    const w = window;
    if (w.__sockets_ts_initialized__)
        return;
    w.__sockets_ts_initialized__ = true;
    // Shared state on window
    w.currentUser = w.currentUser || null;
    w.selectedRoom = w.selectedRoom || null;
    w.rooms = w.rooms || [];
    w.unreadCounts = w.unreadCounts || {};
    w.typingUsers = w.typingUsers || new Set();
    w.dmPresenceInterval = w.dmPresenceInterval || null;
    // --- AUTH ON LOAD via cookie ---
    try {
        const token = typeof getCookie === "function" ? getCookie("session_token") : null;
        if (token) {
            socket.emit("authenticate", { token }, (res) => {
                if (res && res.success) {
                    w.currentUser = { id: res.id, name: res.name };
                    if (typeof showAuthPanel === "function")
                        showAuthPanel(false);
                    socket.emit("getRooms");
                    if (typeof requestFriendList === "function")
                        requestFriendList();
                    if (typeof syncLayoutVisibility === "function")
                        syncLayoutVisibility();
                }
                else {
                    if (typeof showAuthPanel === "function")
                        showAuthPanel(true);
                }
            });
        }
        else {
            if (typeof showAuthPanel === "function")
                showAuthPanel(true);
        }
    }
    catch { }
    // --- SERVER-PUSHED UNREAD COUNTS ---
    socket.on("unreadCounts", (payload) => {
        try {
            const counts = payload && typeof payload === "object" ? payload.counts || {} : {};
            if (counts && typeof counts === "object") {
                w.unreadCounts = { ...counts };
                if (typeof w.renderRoomList === "function")
                    w.renderRoomList();
            }
        }
        catch { }
    });
    // --- FORCE LOGOUT ACROSS DEVICES ---
    socket.on("forceLogout", function () {
        w.currentUser = null;
        document.cookie =
            "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        if (typeof showAuthPanel === "function")
            showAuthPanel(true);
        alert("Vous avez été déconnecté de tous vos appareils.");
    });
    // --- ROOMS LIST ---
    socket.on("rooms", (serverRooms) => {
        w.rooms = serverRooms || [];
        if (typeof w.renderRoomList === "function")
            w.renderRoomList();
        // If we requested a DM creation, auto-open once it appears
        if (w.pendingDmTargetId && w.currentUser) {
            try {
                const meId = w.currentUser.id;
                const dm = w.rooms.find((r) => {
                    if (r.type !== "user")
                        return false;
                    const members = Array.isArray(r.users)
                        ? r.users
                        : [];
                    const ids = members.map((u) => u && u.id).filter(Boolean);
                    return ids.includes(meId) && ids.includes(w.pendingDmTargetId);
                });
                if (dm) {
                    w.pendingDmTargetId = null;
                    if (typeof w.joinRoom === "function")
                        w.joinRoom(dm);
                }
            }
            catch { }
        }
    });
    // --- PARTICIPANTS IN ROOM ---
    socket.on("roomUsers", (payload) => {
        if (!w.selectedRoom || !payload || payload.roomId !== w.selectedRoom.id)
            return;
        if (typeof w.renderParticipants === "function")
            w.renderParticipants(payload.users || []);
        try {
            // If this is a DM, use the user list from the event to compute presence
            const users = Array.isArray(payload.users) ? payload.users : [];
            if ((w.selectedRoom && w.selectedRoom.type === "user") &&
                typeof w.setupDmPresence === "function") {
                w.setupDmPresence({ type: "user", users });
            }
        }
        catch { }
    });
    // --- ROOM HISTORY ---
    socket.on("roomHistory", (data) => {
        if (!w.selectedRoom || data.roomId !== w.selectedRoom.id)
            return;
        const chatWindow = document.getElementById("chat-window");
        if (chatWindow)
            chatWindow.innerHTML = "";
        (data.messages || []).forEach((m) => {
            if (typeof w.renderMsg === "function")
                w.renderMsg(m);
        });
        // Mark as delivered/read upon viewing history
        try {
            const now = Date.now();
            (data.messages || []).forEach((m) => {
                var _a;
                const authorName = (_a = m === null || m === void 0 ? void 0 : m.author) === null || _a === void 0 ? void 0 : _a.name;
                const mine = w.currentUser && authorName === w.currentUser.name;
                const midStr = (m === null || m === void 0 ? void 0 : m.id) != null ? String(m.id) : "";
                const mid = parseInt(midStr, 10);
                if (!mine && Number.isFinite(mid)) {
                    socket.emit("messageDelivered", {
                        messageId: mid,
                        roomId: data.roomId,
                        timestamp: now,
                    });
                    socket.emit("messageRead", {
                        messageId: mid,
                        roomId: data.roomId,
                        timestamp: now,
                    });
                }
            });
        }
        catch { }
    });
    // --- INCOMING MESSAGE ---
    socket.on("message", (data) => {
        var _a, _b, _c, _d, _e, _f;
        if (w.selectedRoom && data.roomId === w.selectedRoom.id) {
            if (typeof w.renderMsg === "function")
                w.renderMsg(data.message);
            // Acknowledge delivery/read for messages from others in active room
            try {
                const m = data.message;
                const authorName = (_a = m === null || m === void 0 ? void 0 : m.author) === null || _a === void 0 ? void 0 : _a.name;
                const mine = w.currentUser && authorName === w.currentUser.name;
                const mid = parseInt(String((_b = m === null || m === void 0 ? void 0 : m.id) !== null && _b !== void 0 ? _b : ""), 10);
                if (!mine && Number.isFinite(mid)) {
                    const now = Date.now();
                    socket.emit("messageDelivered", {
                        messageId: mid,
                        roomId: data.roomId,
                        timestamp: now,
                    });
                    socket.emit("messageRead", {
                        messageId: mid,
                        roomId: data.roomId,
                        timestamp: now,
                    });
                }
            }
            catch { }
            return;
        }
        // Otherwise, increment unread counter (ignore own messages)
        try {
            const authorName = (_d = (_c = data === null || data === void 0 ? void 0 : data.message) === null || _c === void 0 ? void 0 : _c.author) === null || _d === void 0 ? void 0 : _d.name;
            if (!w.currentUser || authorName === w.currentUser.name)
                return;
            // Mark as delivered when message arrives for a room that's not active
            try {
                const mid = parseInt(String((_f = (_e = data === null || data === void 0 ? void 0 : data.message) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : ""), 10);
                if (Number.isFinite(mid)) {
                    const now = Date.now();
                    socket.emit("messageDelivered", {
                        messageId: mid,
                        roomId: data.roomId,
                        timestamp: now,
                    });
                }
            }
            catch { }
            w.unreadCounts[data.roomId] = (w.unreadCounts[data.roomId] || 0) + 1;
            if (typeof w.renderRoomList === "function")
                w.renderRoomList();
        }
        catch { }
    });
    // --- MESSAGE STATUS UPDATES ---
    socket.on("messageStatusUpdated", (evt) => {
        try {
            const chatWindow = document.getElementById("chat-window");
            const mid = evt && evt.messageId != null ? String(evt.messageId) : "";
            if (!mid || !chatWindow)
                return;
            const el = chatWindow.querySelector(`[data-message-id="${mid}"]`);
            if (!el)
                return;
            const statusEl = el.querySelector(".msg-status");
            if (!statusEl)
                return;
            const status = String(evt.status || "").toLowerCase();
            if (status === "read")
                statusEl.textContent = "✓✓";
            else if (status === "delivered") {
                if (statusEl.textContent !== "✓✓")
                    statusEl.textContent = "✓";
            }
        }
        catch { }
    });
    // --- FRIENDS REALTIME ---
    socket.on("friendUpdated", () => {
        if (typeof requestFriendList === "function")
            requestFriendList();
    });
    // --- TYPING RECEIVED ---
    socket.on("typing", (payload) => {
        try {
            if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
                return;
            const uid = String(payload.userId || "");
            if (!uid || (w.currentUser && uid === w.currentUser.id))
                return;
            if (payload.typing)
                w.typingUsers.add(uid);
            else
                w.typingUsers.delete(uid);
            if (typeof renderTypingBanner === "function")
                renderTypingBanner();
        }
        catch { }
    });
    // --- GENERIC ERROR ---
    socket.on("error", (err) => {
        const authPanel = document.getElementById("auth-panel");
        const authError = document.getElementById("auth-error");
        if (authPanel && authPanel.style.display !== "none" && authError) {
            authError.textContent = (err === null || err === void 0 ? void 0 : err.error) || "Erreur serveur";
            authError.style.display = "block";
        }
        else {
            alert((err === null || err === void 0 ? void 0 : err.error) || "Erreur serveur");
        }
    });
})();
var _a;
// Utilities are now provided by core.ts (ensureTheme, debounce, getCookie, formatRelative)
try {
    ensureTheme();
}
catch { }
// Expose helpers for other modules
window.setupDmPresence = setupDmPresence;
window.fetchPresence = fetchPresence;
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
// Responsive helpers are provided by dom.ts (showSidebar, showChat, syncLayoutVisibility)
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
// Unified room list
const roomListAll = document.getElementById("room-list-all");
const noRoomMsgAll = document.getElementById("no-room-msg-all");
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
const tabDms = document.getElementById("tab-dms");
const tabRooms = document.getElementById("tab-rooms");
const sectionDms = document.getElementById("section-dms");
const sectionRooms = document.getElementById("section-rooms");
const toggleDms = document.getElementById("toggle-dms");
const toggleRooms = document.getElementById("toggle-rooms");
function setTabs(active) {
    if (tabDms)
        tabDms.setAttribute("aria-selected", active === "dms" ? "true" : "false");
    if (tabRooms)
        tabRooms.setAttribute("aria-selected", active === "rooms" ? "true" : "false");
    // Mobile behavior: show only the active section
    if (sectionDms && sectionRooms) {
        if (active === "dms") {
            sectionDms.style.display = "";
            sectionRooms.style.display = "none";
        }
        else {
            sectionDms.style.display = "none";
            sectionRooms.style.display = "";
        }
    }
}
function toggleSection(el) {
    if (!el)
        return;
    const expanded = el.getAttribute("aria-expanded") === "true";
    el.setAttribute("aria-expanded", expanded ? "false" : "true");
    // Simple collapse by toggling list visibility
    const list = el.querySelector("ul");
    if (list)
        list.style.display = expanded ? "none" : "";
    const empty = el.querySelector(".room-empty");
    if (empty)
        empty.style.display = expanded
            ? "none"
            : list && list.children.length
                ? "none"
                : "block";
}
function initRoomTabsAndCollapsers() {
    // Default: DMs active
    setTabs("dms");
    if (sectionRooms)
        sectionRooms.setAttribute("aria-expanded", "false");
    if (sectionDms)
        sectionDms.setAttribute("aria-expanded", "true");
    if (tabDms)
        tabDms.onclick = () => setTabs("dms");
    if (tabRooms)
        tabRooms.onclick = () => setTabs("rooms");
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
const closeChatBtn = document.getElementById("close-chat");
const layoutContainer = document.querySelector(".chat-root.layout");
const selectedRoomTitle = document.getElementById("selected-room-title");
// Dynamic UI: typing banner just under the title
const typingBanner = document.createElement("div");
typingBanner.id = "typing-banner";
typingBanner.style.fontSize = "12px";
typingBanner.style.color = "#888";
typingBanner.style.margin = "4px 0 8px 0";
try {
    (_a = selectedRoomTitle === null || selectedRoomTitle === void 0 ? void 0 : selectedRoomTitle.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(typingBanner, selectedRoomTitle.nextSibling);
}
catch { }
// New UI elements (search moved to search.ts)
// New toolbar elements (friends/requests moved to friends.ts)
const btnOpenRoomDrawer = document.getElementById("btn-open-room-drawer");
const btnCloseRoomDrawer = document.getElementById("btn-close-room-drawer");
const roomDrawer = document.getElementById("room-drawer");
// Deprecated in new UI but kept for compatibility
const friendsList = document.getElementById("friends-list");
const refreshFriendsBtn = document.getElementById("refresh-friends");
const roomParticipants = document.getElementById("room-participants");
// Simple refresh action for friends list
if (refreshFriendsBtn) {
    refreshFriendsBtn.onclick = () => requestFriendList();
}
// Private room toggle and invite search handled in room_creation.ts
// Typing receive is handled in sockets.ts
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
// Typing state for current room
let typingUsers = new Set();
let typingStopTimer = null;
let lastTypingEmit = 0;
// Presence refresh timer for DM
let dmPresenceInterval = null;
// Unread counts handled in sockets.ts
// forceLogout handled in sockets.ts
// Room list rendering handled in rooms.ts
// Rooms event handled in sockets.ts
// friendUpdated handled in sockets.ts
// Room creation handled in room_creation.ts
// joinRoom implemented in rooms.ts
// Close chat (desktop/mobile)
if (closeChatBtn) {
    closeChatBtn.addEventListener("click", () => {
        try {
            window.selectedRoom = null;
            chatWindow.innerHTML = "";
            setTypingBanner("");
            if (dmPresenceInterval) {
                window.clearInterval(dmPresenceInterval);
                dmPresenceInterval = null;
            }
            syncLayoutVisibility();
        }
        catch { }
    });
}
// Gestion logout (WebSocket uniquement)
if (logoutBtn) {
    logoutBtn.onclick = function () {
        socket.emit("logout", {}, (res) => {
            // Peu importe la réponse, on réinitialise l'état
            currentUser = null;
            document.cookie =
                "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            showAuthPanel(true);
        });
    };
}
if (logoutAllBtn) {
    logoutAllBtn.onclick = function () {
        socket.emit("logoutAll", {}, (res) => {
            currentUser = null;
            document.cookie =
                "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
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
    ${isMine
        ? `<span class="msg-status" aria-label="status">${statusText}</span>`
        : ""}
  `;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
// Room history handled in sockets.ts
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
// roomUsers handled in sockets.ts
// Incoming message handled in sockets.ts
// Generic error handled in sockets.ts
// Message send and typing handlers are implemented in messaging.ts
// Message status updates handled in sockets.ts
// Affiche ou masque les panneaux selon l'état d'authentification
function showAuthPanel(show) {
    authPanel.style.display = show ? "block" : "none";
    // Defer panel visibility to responsive logic
    if (show) {
        showSidebar(false);
        showChat(false);
        if (layoutContainer)
            layoutContainer.style.display = "none";
    }
    else {
        syncLayoutVisibility();
    }
    createRoomForm.style.display = show ? "none" : "flex";
    chatForm.style.display = show ? "none" : "flex";
    // Affiche les boutons logout uniquement si connecté
    if (userActions)
        userActions.style.display = show ? "none" : "block";
}
// Typing banner helpers are provided by dom.ts (renderTypingBanner, setTypingBanner)
// --- Presence helpers (DM only) ---
async function fetchPresence(userId) {
    var _a;
    try {
        const res = await fetch(`/api/user/presence/${encodeURIComponent(userId)}`, { credentials: 'include' });
        if (!res.ok)
            return null;
        const data = await res.json();
        return { status: (data === null || data === void 0 ? void 0 : data.status) || 'offline', lastSeen: (_a = data === null || data === void 0 ? void 0 : data.lastSeen) !== null && _a !== void 0 ? _a : null };
    }
    catch {
        return null;
    }
}
window.fetchPresence = fetchPresence;
async function setupDmPresence(room) {
    try {
        const w = window;
        const me = w.currentUser;
        if (!room || room.type !== "user" || !me) {
            updatePresenceLabel("");
            if (dmPresenceInterval) {
                window.clearInterval(dmPresenceInterval);
                dmPresenceInterval = null;
            }
            return;
        }
        const members = Array.isArray(room.users) ? room.users : [];
        const other = members.find((u) => u && u.id !== me.id);
        if (!other) {
            updatePresenceLabel("");
            return;
        }
        const renderOnce = async () => {
            const pr = await fetchPresence(other.id);
            if (!pr) {
                updatePresenceLabel("");
                return;
            }
            if (pr.status === "online")
                updatePresenceLabel("• en ligne");
            else if (pr.lastSeen)
                updatePresenceLabel(`• vu ${formatRelative(pr.lastSeen)}`);
            else
                updatePresenceLabel("• hors ligne");
        };
        await renderOnce();
        if (dmPresenceInterval)
            window.clearInterval(dmPresenceInterval);
        dmPresenceInterval = window.setInterval(renderOnce, 30000);
    }
    catch { }
}
function updatePresenceLabel(text) {
    try {
        if (!selectedRoomTitle)
            return;
        const id = "presence-label";
        let span = document.getElementById(id);
        if (!span) {
            span = document.createElement("span");
            span.id = id;
            span.style.marginLeft = "8px";
            span.style.fontSize = "12px";
            span.style.color = "#888";
            selectedRoomTitle.appendChild(span);
        }
        span.textContent = text || "";
    }
    catch { }
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
        const csrf = getCookie("X-XSRF-TOKEN") || "";
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": csrf,
            },
            credentials: "include",
            body: JSON.stringify({ username, password, confirmPassword: confirm }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            authError.textContent = (data === null || data === void 0 ? void 0 : data.error) || "Registration failed.";
            authError.style.display = "block";
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
        authError.textContent = "Registration failed.";
        authError.style.display = "block";
    }
});
// Initial : demander la liste des rooms (si non pushée automatiquement)
// (ne rien faire tant qu'on n'est pas authentifié)
// Search logic is implemented in search.ts
// Keep UI in sync on resize
try {
    window.addEventListener("resize", () => syncLayoutVisibility());
}
catch { }
// Initial layout sync
try {
    syncLayoutVisibility();
}
catch { }
// Friends UI moved to friends.ts (renderFriends, requestFriendList, toolbar wiring)
// Drawer logic lives in room_creation.ts
// requestFriendList is defined in friends.ts
// DM helpers are defined in friends.ts
// Invite renderers live in room_creation.ts
// Invite search renderers moved to room_creation.ts
// runInviteSearch lives in room_creation.ts
// Invite listeners moved to room_creation.ts
// refs.ts - TypeScript build entry for chat UI (desktop-only)
// Build to a single bundle (no modules) with:
//   npx tsc --target ES2019 --module none --outFile chat-client.js refs.ts
// This file lists all source files in dependency order using triple-slash references.
// Initially we only include chat-client.ts. We will split concerns into multiple
// files (core.ts, dom.ts, auth.ts, rooms.ts, friends.ts, room_creation.ts,
// search.ts, messaging.ts, sockets.ts) and add them here step-by-step.
/// <reference path="./core.ts" />
/// <reference path="./dom.ts" />
/// <reference path="./friends.ts" />
/// <reference path="./search.ts" />
/// <reference path="./rooms.ts" />
/// <reference path="./messaging.ts" />
/// <reference path="./room_creation.ts" />
/// <reference path="./sockets.ts" />
/// <reference path="./chat-client.ts" />
