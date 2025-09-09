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
// Token helper built on top of getCookie
function getToken(name = "session_token") {
    return getCookie(name);
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
// Expose helpers on window for cross-file usage
try {
    window.showToast = showToast;
}
catch { }
// Presence/online small label next to the title
function updatePresenceLabel(text) {
    try {
        const selectedRoomTitle = document.getElementById("selected-room-title");
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
// Simple toast helper (global) for success/info messages
function showToast(message, durationMs = 2200) {
    try {
        let host = document.getElementById("toast-host");
        if (!host) {
            host = document.createElement("div");
            host.id = "toast-host";
            host.style.position = "fixed";
            host.style.right = "16px";
            host.style.bottom = "16px";
            host.style.display = "flex";
            host.style.flexDirection = "column";
            host.style.gap = "8px";
            host.style.zIndex = "9999";
            document.body.appendChild(host);
        }
        const el = document.createElement("div");
        el.textContent = message || "";
        el.style.background = "linear-gradient(45deg, #7f5af0, #9b5de5)";
        el.style.color = "#fff";
        el.style.padding = "10px 14px";
        el.style.borderRadius = "8px";
        el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
        el.style.fontSize = "13px";
        el.style.maxWidth = "340px";
        el.style.pointerEvents = "none";
        host.appendChild(el);
        window.setTimeout(() => {
            try {
                host === null || host === void 0 ? void 0 : host.removeChild(el);
            }
            catch { }
        }, Math.max(800, durationMs));
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
            const actions = document.createElement("span");
            actions.style.float = "right";
            const callAudioBtn = document.createElement("button");
            callAudioBtn.textContent = "Call (Audio)";
            callAudioBtn.className = "chat-send-btn";
            callAudioBtn.style.marginLeft = "8px";
            callAudioBtn.onclick = () => {
                var _a, _b;
                try {
                    (_b = (_a = window).startCallAudio) === null || _b === void 0 ? void 0 : _b.call(_a, it.userId || it.id);
                }
                catch { }
            };
            const callVideoBtn = document.createElement("button");
            callVideoBtn.textContent = "Call (Video)";
            callVideoBtn.className = "chat-send-btn";
            callVideoBtn.style.marginLeft = "6px";
            callVideoBtn.onclick = () => {
                var _a, _b;
                try {
                    (_b = (_a = window).startCallVideo) === null || _b === void 0 ? void 0 : _b.call(_a, it.userId || it.id);
                }
                catch { }
            };
            const msgBtn = document.createElement("button");
            msgBtn.textContent = "Message";
            msgBtn.className = "chat-send-btn";
            msgBtn.style.marginLeft = "6px";
            msgBtn.onclick = () => startDM(it.userId || it.id, name);
            actions.appendChild(callAudioBtn);
            actions.appendChild(callVideoBtn);
            actions.appendChild(msgBtn);
            li.appendChild(actions);
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
    // ---- Pins & Filters state (persisted) ----
    try {
        const raw = localStorage.getItem('rt:pins');
        w.__rt_pins = new Set(raw ? JSON.parse(raw) : []);
    }
    catch {
        w.__rt_pins = new Set();
    }
    try {
        if (typeof w.__rt_room_query !== 'string')
            w.__rt_room_query = localStorage.getItem('rt:roomQuery') || '';
    }
    catch { }
    try {
        if (w.__rt_sort_mode !== 'recent' && w.__rt_sort_mode !== 'unread')
            w.__rt_sort_mode = localStorage.getItem('rt:roomSort') || 'recent';
    }
    catch {
        w.__rt_sort_mode = 'recent';
    }
    try {
        if (typeof w.__rt_pinned_only !== 'boolean')
            w.__rt_pinned_only = localStorage.getItem('rt:pinnedOnly') === '1';
    }
    catch { }
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
            // Ensure filter bar exists above the list (search + pinned-only + sort)
            (function ensureFilterBar() {
                try {
                    const host = document.getElementById('room-list-section');
                    if (!host)
                        return;
                    let bar = document.getElementById('room-filter-bar');
                    if (!bar) {
                        bar = document.createElement('div');
                        bar.id = 'room-filter-bar';
                        bar.style.display = 'flex';
                        bar.style.alignItems = 'center';
                        bar.style.gap = '8px';
                        bar.style.margin = '8px 8px 4px 8px';
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.id = 'room-search-input';
                        input.placeholder = 'Search rooms or users…';
                        input.value = String(w.__rt_room_query || '');
                        input.style.flex = '1';
                        input.oninput = () => { var _a; try {
                            w.__rt_room_query = input.value || '';
                            localStorage.setItem('rt:roomQuery', String(w.__rt_room_query));
                        }
                        catch { } ; try {
                            (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                        }
                        catch { } };
                        input.onkeydown = (ev) => {
                            var _a;
                            if (ev.key === 'Escape' || ev.key === 'Esc') {
                                try {
                                    ev.preventDefault();
                                }
                                catch { }
                                try {
                                    w.__rt_room_query = '';
                                    localStorage.setItem('rt:roomQuery', '');
                                    input.value = '';
                                }
                                catch { }
                                try {
                                    (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                                }
                                catch { }
                            }
                        };
                        const clearBtn = document.createElement('button');
                        clearBtn.type = 'button';
                        clearBtn.className = 'icon-btn';
                        clearBtn.textContent = '✕';
                        clearBtn.title = 'Clear search';
                        clearBtn.onclick = () => { var _a; try {
                            w.__rt_room_query = '';
                            localStorage.setItem('rt:roomQuery', '');
                            input.value = '';
                            (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                        }
                        catch { } };
                        const poBtn = document.createElement('button');
                        poBtn.type = 'button';
                        poBtn.className = 'icon-btn';
                        const setPoText = () => poBtn.textContent = `Pinned Only: ${w.__rt_pinned_only ? 'On' : 'Off'}`;
                        setPoText();
                        poBtn.onclick = () => { var _a; try {
                            w.__rt_pinned_only = !w.__rt_pinned_only;
                            localStorage.setItem('rt:pinnedOnly', w.__rt_pinned_only ? '1' : '0');
                            setPoText();
                            (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                        }
                        catch { } };
                        const sortBtn = document.createElement('button');
                        sortBtn.type = 'button';
                        sortBtn.className = 'icon-btn';
                        const setSortBtnText = () => sortBtn.textContent = `Sort: ${w.__rt_sort_mode === 'unread' ? 'Unread' : (w.__rt_sort_mode === 'unreadFirst' ? 'Unread First' : 'Recent')}`;
                        setSortBtnText();
                        sortBtn.onclick = () => {
                            var _a;
                            try {
                                w.__rt_sort_mode = (w.__rt_sort_mode === 'recent') ? 'unread' : (w.__rt_sort_mode === 'unread' ? 'unreadFirst' : 'recent');
                                localStorage.setItem('rt:roomSort', w.__rt_sort_mode);
                                setSortBtnText();
                                (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                            }
                            catch { }
                        };
                        bar.appendChild(input);
                        bar.appendChild(clearBtn);
                        bar.appendChild(poBtn);
                        bar.appendChild(sortBtn);
                        // Insert before UL
                        const ul = document.getElementById('room-list-all');
                        if (ul === null || ul === void 0 ? void 0 : ul.parentElement)
                            ul.parentElement.insertBefore(bar, ul);
                        else
                            host.appendChild(bar);
                    }
                }
                catch { }
            })();
            let visibleRooms = rooms.filter((room) => {
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
            // Apply text search filter
            try {
                const q = String(w.__rt_room_query || '').trim().toLowerCase();
                if (q) {
                    visibleRooms = visibleRooms.filter((room) => {
                        let label = room.name || (room.type === 'user' ? 'DM' : 'Room');
                        if (room.type === 'user') {
                            const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
                            const members = Array.isArray(room.users) ? room.users : [];
                            const other = meId ? members.find((u) => u && u.id !== meId) : null;
                            if (other === null || other === void 0 ? void 0 : other.name)
                                label = other.name;
                        }
                        return String(label || '').toLowerCase().includes(q);
                    });
                }
            }
            catch { }
            // Apply unread-only filter if enabled (set by UI quickbar)
            try {
                if (w.__rt_unread_only) {
                    visibleRooms = visibleRooms.filter((r) => (unreadCounts && unreadCounts[r.id] > 0));
                }
            }
            catch { }
            // Pins set (used for both optional filter and sorting)
            const pins = (w.__rt_pins instanceof Set) ? w.__rt_pins : new Set();
            // Apply pinned-only filter if enabled
            try {
                if (w.__rt_pinned_only) {
                    visibleRooms = visibleRooms.filter((r) => pins.has(String(r.id)));
                }
            }
            catch { }
            // Sorting: pinned first, then by selected mode (recent, unread, unreadFirst)
            function lastTsFor(room) {
                var _a;
                try {
                    const cache = (_a = w.roomLastMsgCache) === null || _a === void 0 ? void 0 : _a[String(room.id)];
                    if (cache && typeof cache.lastTs === 'number')
                        return cache.lastTs;
                }
                catch { }
                return 0;
            }
            const pinnedRooms = visibleRooms.filter(r => pins.has(String(r.id)));
            const otherRooms = visibleRooms.filter(r => !pins.has(String(r.id)));
            const sortMode = (w.__rt_sort_mode === 'unread' || w.__rt_sort_mode === 'unreadFirst') ? w.__rt_sort_mode : 'recent';
            const sorter = (a, b) => {
                if (sortMode === 'unread' || sortMode === 'unreadFirst') {
                    const ua = unreadCounts[a.id] || 0;
                    const ub = unreadCounts[b.id] || 0;
                    if (ub !== ua)
                        return ub - ua;
                    const ta = lastTsFor(a);
                    const tb = lastTsFor(b);
                    return tb - ta;
                }
                else {
                    const ta = lastTsFor(a);
                    const tb = lastTsFor(b);
                    if (tb !== ta)
                        return tb - ta;
                    const ua = unreadCounts[a.id] || 0;
                    const ub = unreadCounts[b.id] || 0;
                    return ub - ua;
                }
            };
            pinnedRooms.sort(sorter);
            otherRooms.sort(sorter);
            // Render headers and groups
            if (noRoomMsgAll)
                noRoomMsgAll.style.display = (pinnedRooms.length + otherRooms.length) ? "none" : "block";
            // simple cache { [roomId]: { text, cachedAt, lastTs } }
            w.roomLastMsgCache = w.roomLastMsgCache || {};
            function appendHeader(text) {
                try {
                    if (!roomListAll)
                        return;
                    const h = document.createElement('li');
                    h.className = 'room-list-header';
                    h.textContent = text;
                    roomListAll.appendChild(h);
                }
                catch { }
            }
            let idx = 0;
            if (pinnedRooms.length)
                appendHeader('Pinned');
            const renderOrder = [...pinnedRooms, ...otherRooms];
            renderOrder.forEach((room) => {
                if (idx === pinnedRooms.length && pinnedRooms.length && otherRooms.length)
                    appendHeader('Others');
                idx++;
                const li = document.createElement("li");
                li.className = "room-list-item";
                try {
                    if (room && room.id)
                        li.dataset.roomId = String(room.id);
                }
                catch { }
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
        <span class="presence-dot presence-offline" aria-hidden="true"></span>
        <span class="room-name">${label}</span>
        <span class="room-lastmsg-inline" style="color:#888;font-size:12px;margin-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%;display:inline-block;vertical-align:middle;"></span>
        <span class="room-badge" hidden></span>
        <button type="button" class="icon-btn" style="margin-left:auto" aria-label="Pin" title="Pin/Unpin" data-pin="1">${pins.has(String(room.id)) ? '★' : '☆'}</button>
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
                // Highlight search match in name
                try {
                    const q = String(w.__rt_room_query || '').trim().toLowerCase();
                    if (q) {
                        const nameEl = li.querySelector('.room-name');
                        if (nameEl) {
                            const src = String(nameEl.textContent || '');
                            const i = src.toLowerCase().indexOf(q);
                            if (i >= 0) {
                                const before = src.slice(0, i);
                                const mid = src.slice(i, i + q.length);
                                const after = src.slice(i + q.length);
                                nameEl.innerHTML = `${before}<span class="rt-hl">${mid}</span>${after}`;
                            }
                        }
                    }
                }
                catch { }
                // Pin toggle
                try {
                    const pinBtn = li.querySelector('button[data-pin]');
                    if (pinBtn) {
                        pinBtn.onclick = (ev) => {
                            var _a;
                            try {
                                ev.stopPropagation();
                                ev.preventDefault();
                            }
                            catch { }
                            const id = String(room.id);
                            if (pins.has(id))
                                pins.delete(id);
                            else
                                pins.add(id);
                            try {
                                localStorage.setItem('rt:pins', JSON.stringify(Array.from(pins)));
                            }
                            catch { }
                            w.__rt_pins = pins; // update global
                            try {
                                (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                            }
                            catch { }
                        };
                    }
                }
                catch { }
                // Presence dot for DMs only
                if (room.type === "user") {
                    try {
                        const presEl = li.querySelector('.presence-dot');
                        const meId = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id;
                        const members = Array.isArray(room.users) ? room.users : [];
                        const other = meId ? members.find((u) => u && u.id !== meId) : null;
                        if (presEl && other && typeof (w.fetchPresence) === 'function') {
                            w.fetchPresence(other.id).then((pr) => {
                                try {
                                    presEl.classList.remove('presence-online', 'presence-offline');
                                    if (pr && pr.status === 'online')
                                        presEl.classList.add('presence-online');
                                    else
                                        presEl.classList.add('presence-offline');
                                }
                                catch { }
                            }).catch(() => undefined);
                        }
                    }
                    catch { }
                }
                // Helpers for media-only preview detection
                function isMediaUrl(u) {
                    const s = String(u || '').toLowerCase();
                    if (!/^https?:\/\//.test(s))
                        return false;
                    return /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.mp4|\.webm|\.ogg)(\?.*)?$/.test(s);
                }
                function previewFromContent(content) {
                    try {
                        const lines = String(content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                        if (lines.length > 0 && lines.every((l) => isMediaUrl(l)))
                            return '[Pièce jointe]';
                        const text = String(content || '').slice(0, 80);
                        return text;
                    }
                    catch {
                        return String(content || '').slice(0, 80);
                    }
                }
                // Fill last message preview inline (cached 15s)
                try {
                    const previewEl = li.querySelector('.room-lastmsg-inline');
                    if (previewEl) {
                        const cacheKey = String(room.id || '');
                        const now = Date.now();
                        const cache = w.roomLastMsgCache[cacheKey];
                        if (cache && now - (cache.cachedAt || 0) < 15000) {
                            previewEl.textContent = cache.text ? ` – ${cache.text}` : '';
                        }
                        else if (typeof w.getRoomLastMessage === 'function') {
                            w.getRoomLastMessage(cacheKey).then((res) => {
                                try {
                                    const msg = (res && res.success) ? res.message : null;
                                    const text = msg ? previewFromContent(String(msg.content || '')) : '';
                                    previewEl.textContent = text ? ` – ${text}` : '';
                                    const lastTs = msg && typeof msg.timestamp === 'number' ? Number(msg.timestamp) : Date.now();
                                    w.roomLastMsgCache[cacheKey] = { text, cachedAt: Date.now(), lastTs };
                                }
                                catch { }
                            }).catch(() => undefined);
                        }
                    }
                }
                catch { }
            });
        };
    // Real-time update helper for last message preview
    if (!w.updateRoomLastMsgPreview)
        w.updateRoomLastMsgPreview = function updateRoomLastMsgPreview(roomId, text) {
            try {
                if (!roomId)
                    return;
                w.roomLastMsgCache = w.roomLastMsgCache || {};
                const isMediaOnly = (() => {
                    try {
                        const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                        if (lines.length === 0)
                            return false;
                        return lines.every((l) => (/^https?:\/\//.test(l) && /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.mp4|\.webm|\.ogg)(\?.*)?$/.test(l.toLowerCase())));
                    }
                    catch {
                        return false;
                    }
                })();
                const preview = isMediaOnly ? '[Pièce jointe]' : (text || '').slice(0, 80);
                // Cache with fresh timestamps (we don't have message ts here, fallback to now)
                w.roomLastMsgCache[String(roomId)] = { text: preview, cachedAt: Date.now(), lastTs: Date.now() };
                // Update DOM if present
                const roomListAll = document.getElementById("room-list-all");
                if (roomListAll) {
                    const li = roomListAll.querySelector(`li.room-list-item[data-room-id="${CSS.escape(String(roomId))}"]`);
                    const el = li === null || li === void 0 ? void 0 : li.querySelector(".room-lastmsg-inline");
                    if (el)
                        el.textContent = preview ? ` – ${preview}` : '';
                }
            }
            catch { }
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
    function isMediaUrl(url) {
        const u = String(url || '').toLowerCase();
        if (!/^https?:\/\//.test(u))
            return { kind: null };
        if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)(\?.*)?$/.test(u))
            return { kind: 'image' };
        if (/(\.mp4|\.webm|\.ogg)(\?.*)?$/.test(u))
            return { kind: 'video' };
        return { kind: null };
    }
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    // Persisted edited-flag helpers (client-side hint)
    const EDITED_LS_PREFIX = 'edited:'; // edited:{messageId} => 1
    function setEditedFlag(messageId) {
        try {
            localStorage.setItem(EDITED_LS_PREFIX + String(messageId), '1');
        }
        catch { }
    }
    function clearEditedFlag(messageId) {
        try {
            localStorage.removeItem(EDITED_LS_PREFIX + String(messageId));
        }
        catch { }
    }
    function isEditedFlag(messageId) {
        try {
            return localStorage.getItem(EDITED_LS_PREFIX + String(messageId)) === '1';
        }
        catch {
            return false;
        }
    }
    // --- Undo eligibility tracking (client-side hint) ---
    // Track which messages this user just edited/deleted so the Undo button shows
    // locally for up to 10 minutes. Server remains the source of truth.
    const UNDO_WINDOW_MS = 10 * 60 * 1000;
    const undoEligible = {};
    function isUndoEligible(messageId) {
        const mid = String(messageId);
        const exp = undoEligible[mid];
        return typeof exp === 'number' && exp > Date.now();
    }
    function toggleUndoButtonFor(messageId) {
        try {
            const chatWindow = getChatWindow();
            if (!chatWindow)
                return;
            const midStr = String(messageId);
            const bubble = chatWindow.querySelector(`div.message[data-message-id="${CSS.escape(midStr)}"]`);
            if (!bubble)
                return;
            const btn = bubble.querySelector('.action-undo');
            if (!btn)
                return;
            btn.style.display = isUndoEligible(midStr) ? '' : 'none';
        }
        catch { }
    }
    function setUndoEligible(messageId, ttlMs = UNDO_WINDOW_MS) {
        const mid = String(messageId);
        undoEligible[mid] = Date.now() + Math.max(1000, ttlMs);
        // Auto-expire locally (visual hint only)
        window.setTimeout(() => { try {
            delete undoEligible[mid];
            toggleUndoButtonFor(mid);
        }
        catch { } }, Math.max(1000, ttlMs));
        toggleUndoButtonFor(mid);
    }
    function clearUndoEligible(messageId) {
        const mid = String(messageId);
        delete undoEligible[mid];
        toggleUndoButtonFor(mid);
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
        // Dedup guard: skip if this message id already exists in DOM (optimistic ack + broadcast)
        try {
            const midStr = msg && msg.id != null ? String(msg.id) : '';
            if (midStr) {
                const existing = chatWindow.querySelector(`[data-message-id="${CSS.escape(midStr)}"]`);
                if (existing)
                    return;
            }
            // Fallback dedup when id is missing: author|timestamp|content hash
            const rawKey = `${authorName}|${String(timestamp !== null && timestamp !== void 0 ? timestamp : '')}|${String(content !== null && content !== void 0 ? content : '')}`;
            const hash = String(rawKey);
            const dup = chatWindow.querySelector(`[data-msg-hash="${CSS.escape(hash)}"]`);
            if (dup)
                return;
        }
        catch { }
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
        try {
            div.dataset.msgHash = `${authorName}|${String(timestamp !== null && timestamp !== void 0 ? timestamp : '')}|${String(content !== null && content !== void 0 ? content : '')}`;
        }
        catch { }
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
        const contentContainer = document.createElement('div');
        contentContainer.className = 'msg-content';
        try {
            const lines = String(content || '').split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                const kind = isMediaUrl(trimmed).kind;
                if (kind === 'image') {
                    const img = document.createElement('img');
                    img.src = trimmed;
                    img.alt = 'image';
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '6px';
                    img.style.display = 'block';
                    img.style.margin = '6px 0';
                    contentContainer.appendChild(img);
                }
                else if (kind === 'video') {
                    const video = document.createElement('video');
                    video.src = trimmed;
                    video.controls = true;
                    video.preload = 'metadata';
                    video.style.maxWidth = '100%';
                    video.style.borderRadius = '6px';
                    video.style.display = 'block';
                    video.style.margin = '6px 0';
                    contentContainer.appendChild(video);
                }
                else {
                    const p = document.createElement('div');
                    p.innerHTML = escapeHtml(trimmed);
                    contentContainer.appendChild(p);
                }
            }
        }
        catch {
            contentContainer.textContent = String(content || '');
        }
        const meta = document.createElement('div');
        meta.className = 'msg-meta-row';
        meta.innerHTML = `<span class="msg-author">${authorName}</span><span class="msg-time">${time}</span>`;
        div.appendChild(meta);
        // If message was edited (client-side persisted), append tag
        try {
            if (msg && msg.id != null && isEditedFlag(String(msg.id))) {
                const edited = document.createElement('span');
                edited.className = 'edited-flag';
                edited.style.marginLeft = '6px';
                edited.style.fontSize = '11px';
                edited.style.color = '#6b7280';
                edited.textContent = '(edited)';
                meta.appendChild(edited);
            }
        }
        catch { }
        div.appendChild(contentContainer);
        if (isMine) {
            const st = document.createElement('span');
            st.className = 'msg-status';
            st.setAttribute('aria-label', 'status');
            st.textContent = statusText;
            div.appendChild(st);
            try {
                addOwnerActions(div, msg);
            }
            catch { }
        }
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };
    function addOwnerActions(div, msg) {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => {
            // Enter edit mode
            const contentContainer = div.querySelector('.msg-content');
            const textarea = document.createElement('textarea');
            textarea.value = msg.content;
            contentContainer.innerHTML = '';
            contentContainer.appendChild(textarea);
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.onclick = () => {
                // Send edit request via WS
                const room = window.selectedRoom;
                if (!room)
                    return;
                const newContent = String(textarea.value || '');
                try {
                    window.socket.emit('messageEdit', {
                        roomId: room.id,
                        messageId: Number(msg.id),
                        newContent,
                    }, (res) => {
                        var _a, _b;
                        if (res && res.success) {
                            // Optimistic update; server will also broadcast messageEdited
                            renderContentInto(contentContainer, newContent);
                            // Mark Undo available locally for this message
                            setUndoEligible(msg.id);
                            // Persistent snackbar synced to server TTL
                            try {
                                startPersistentUndo(String(room.id), Number(msg.id));
                            }
                            catch { }
                        }
                        else if (res && res.error) {
                            (_b = (_a = window).showToast) === null || _b === void 0 ? void 0 : _b.call(_a, String(res.error));
                        }
                    });
                }
                catch { }
            };
            contentContainer.appendChild(saveButton);
        };
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => {
            // Send delete request via WS
            const room = window.selectedRoom;
            if (!room)
                return;
            try {
                window.socket.emit('messageDelete', { roomId: room.id, messageId: Number(msg.id) }, (res) => {
                    var _a, _b;
                    if (res && res.success) {
                        // Optimistically mark as deleted; server will broadcast messageDeleted
                        markMessageDeleted(msg.id);
                        // Mark Undo available locally for this message
                        setUndoEligible(msg.id);
                        // Persistent snackbar synced to server TTL
                        try {
                            startPersistentUndo(String(room.id), Number(msg.id));
                        }
                        catch { }
                    }
                    else if (res && res.error) {
                        (_b = (_a = window).showToast) === null || _b === void 0 ? void 0 : _b.call(_a, String(res.error));
                    }
                });
            }
            catch { }
        };
        const undoButton = document.createElement('button');
        undoButton.textContent = 'Undo';
        undoButton.className = 'action-undo';
        undoButton.onclick = () => {
            // Send undo request
            w.requestUndo(msg.id);
        };
        const actions = document.createElement('div');
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        actions.appendChild(undoButton);
        div.appendChild(actions);
        // Initial visibility based on local eligibility state
        if (!isUndoEligible(msg.id))
            undoButton.style.display = 'none';
    }
    // Send form
    const chatForm = getChatForm();
    const messageInput = getMessageInput();
    function genClientMsgId() {
        var _a;
        try {
            if ((_a = window.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID)
                return window.crypto.randomUUID();
        }
        catch { }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    let pendingItems = [];
    function getAttachInput() {
        return document.getElementById('attach-input');
    }
    function getAttachBar() {
        return document.getElementById('attach-bar');
    }
    async function deletePendingTemps() {
        var _a;
        const keys = pendingItems.filter(it => it.key && it.status === 'ready').map(it => it.key);
        if (!keys.length)
            return;
        try {
            const csrf = (typeof window.getCookie === 'function' ? window.getCookie('X-XSRF-TOKEN') : '') || '';
            await fetch('/api/upload', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
                body: JSON.stringify({ keys })
            });
        }
        catch { }
        // Abort uploads and clear all items
        for (const it of pendingItems) {
            try {
                (_a = it.xhr) === null || _a === void 0 ? void 0 : _a.abort();
            }
            catch { }
            try {
                if (it.thumbUrl) {
                    URL.revokeObjectURL(it.thumbUrl);
                }
            }
            catch { }
        }
        pendingItems = [];
        renderAttachBar();
    }
    function removeItemAt(idx) {
        var _a;
        const it = pendingItems[idx];
        if (!it)
            return;
        // If uploading, abort
        try {
            (_a = it.xhr) === null || _a === void 0 ? void 0 : _a.abort();
        }
        catch { }
        // If ready (has key), delete on server
        if (it.key) {
            const csrf = (typeof window.getCookie === 'function' ? window.getCookie('X-XSRF-TOKEN') : '') || '';
            fetch('/api/upload', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
                body: JSON.stringify({ keys: [it.key] })
            }).catch(() => undefined);
        }
        try {
            if (it.thumbUrl) {
                URL.revokeObjectURL(it.thumbUrl);
            }
        }
        catch { }
        pendingItems.splice(idx, 1);
        renderAttachBar();
    }
    function renderAttachBar() {
        const bar = getAttachBar();
        if (!bar)
            return;
        bar.innerHTML = '';
        if (pendingItems.length === 0) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = '';
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '8px';
        const count = document.createElement('span');
        count.textContent = `${pendingItems.length} pièce(s) jointe(s)`;
        count.style.fontSize = '12px';
        count.style.color = '#666';
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'icon-btn';
        clear.textContent = '✕';
        clear.title = 'Supprimer les pièces jointes';
        clear.onclick = () => deletePendingTemps();
        header.appendChild(count);
        header.appendChild(clear);
        bar.appendChild(header);
        // List of items
        const list = document.createElement('div');
        list.style.marginTop = '6px';
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '6px';
        pendingItems.forEach((it, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.minHeight = '40px';
            // Thumbnail (images only)
            if (it.thumbUrl) {
                const th = document.createElement('img');
                th.src = it.thumbUrl;
                th.alt = it.name;
                th.style.width = '40px';
                th.style.height = '40px';
                th.style.objectFit = 'cover';
                th.style.borderRadius = '6px';
                row.appendChild(th);
            }
            else {
                const ph = document.createElement('div');
                ph.textContent = '📄';
                ph.style.width = '40px';
                ph.style.height = '40px';
                ph.style.display = 'flex';
                ph.style.alignItems = 'center';
                ph.style.justifyContent = 'center';
                ph.style.border = '1px solid #e5e5e5';
                ph.style.borderRadius = '6px';
                row.appendChild(ph);
            }
            const name = document.createElement('span');
            name.style.fontSize = '12px';
            name.style.flex = '1';
            name.textContent = it.name;
            row.appendChild(name);
            // Progress / status
            const box = document.createElement('div');
            box.style.flex = '2';
            box.style.minWidth = '120px';
            if (it.status === 'uploading') {
                const barOuter = document.createElement('div');
                barOuter.style.height = '6px';
                barOuter.style.background = '#eee';
                barOuter.style.borderRadius = '4px';
                barOuter.style.overflow = 'hidden';
                barOuter.style.position = 'relative';
                const barInner = document.createElement('div');
                barInner.style.height = '6px';
                barInner.style.borderRadius = '4px';
                barInner.style.background = '#7f5af0';
                barInner.style.width = `${Math.max(0, Math.min(100, it.percent))}%`;
                // animated shimmer
                const shimmer = document.createElement('div');
                shimmer.style.position = 'absolute';
                shimmer.style.left = '0';
                shimmer.style.top = '0';
                shimmer.style.bottom = '0';
                shimmer.style.width = '30%';
                shimmer.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)';
                shimmer.style.animation = 'attachShimmer 1.2s infinite';
                document.attachShimmerStyleInjected || (function () {
                    const st = document.createElement('style');
                    st.textContent = '@keyframes attachShimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }';
                    document.head.appendChild(st);
                    document.attachShimmerStyleInjected = true;
                })();
                barOuter.appendChild(barInner);
                barOuter.appendChild(shimmer);
                box.appendChild(barOuter);
            }
            else if (it.status === 'ready') {
                const ok = document.createElement('span');
                ok.textContent = 'Prêt';
                ok.style.color = '#0a7';
                ok.style.fontSize = '12px';
                box.appendChild(ok);
            }
            else if (it.status === 'error') {
                const err = document.createElement('span');
                err.textContent = it.errorMsg || 'Erreur';
                err.style.color = '#c00';
                err.style.fontSize = '12px';
                box.appendChild(err);
            }
            else {
                const t = document.createElement('span');
                t.textContent = it.status;
                t.style.fontSize = '12px';
                box.appendChild(t);
            }
            row.appendChild(box);
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'icon-btn';
            rm.textContent = '🗑️';
            rm.title = 'Retirer';
            rm.onclick = () => removeItemAt(idx);
            row.appendChild(rm);
            list.appendChild(row);
        });
        bar.appendChild(list);
    }
    function ensureAttachUI() {
        var _a;
        const form = getChatForm();
        if (!form)
            return;
        // Attach bar (above form)
        let bar = getAttachBar();
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'attach-bar';
            bar.style.display = 'none';
            bar.style.margin = '6px 0';
            bar.style.display = 'none';
            const chatWindow = getChatWindow();
            (_a = chatWindow === null || chatWindow === void 0 ? void 0 : chatWindow.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(bar, form);
        }
        // File input (hidden) + button
        let input = getAttachInput();
        if (!input) {
            input = document.createElement('input');
            input.id = 'attach-input';
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*';
            // Hide off-screen to allow programmatic clicks across browsers
            input.style.position = 'fixed';
            input.style.left = '-9999px';
            input.style.width = '0';
            input.style.height = '0';
            input.style.opacity = '0';
            document.body.appendChild(input);
        }
        // Always (re)bind the existing attach button
        const btn = document.getElementById('attach-btn');
        if (btn) {
            // Ensure it sits before the message input (left side)
            const inputMsg = form.querySelector('#message');
            if (inputMsg && btn.parentElement === form && btn.nextElementSibling !== inputMsg) {
                form.insertBefore(btn, inputMsg);
            }
            // Clean old inline handler and bind fresh listeners
            try {
                btn.onclick = null;
            }
            catch { }
            const handler = (ev) => {
                try {
                    ev.preventDefault();
                    ev.stopPropagation();
                }
                catch { }
                const f = getAttachInput();
                if (f) {
                    try {
                        f.click();
                    }
                    catch {
                        setTimeout(() => { try {
                            f.click();
                        }
                        catch { } }, 0);
                    }
                }
                return false;
            };
            // Capture first, then bubble (max chance to run)
            try {
                btn.addEventListener('click', handler, { capture: true });
            }
            catch {
                btn.addEventListener('click', handler, true);
            }
            try {
                btn.addEventListener('click', handler, false);
            }
            catch { }
        }
        function uploadWithProgress(file, roomId) {
            const it = {
                id: Math.random().toString(36).slice(2),
                name: file.name,
                size: file.size,
                mime: file.type,
                percent: 0,
                status: 'uploading',
            };
            try {
                if (file.type && file.type.startsWith('image/')) {
                    it.thumbUrl = URL.createObjectURL(file);
                }
            }
            catch { }
            pendingItems.push(it);
            renderAttachBar();
            const fd = new FormData();
            fd.append('file', file);
            const xhr = new XMLHttpRequest();
            it.xhr = xhr;
            xhr.open('POST', `/api/upload?temp=1&roomId=${encodeURIComponent(String(roomId))}`);
            xhr.withCredentials = true;
            try {
                const csrf = (typeof window.getCookie === 'function' ? window.getCookie('X-XSRF-TOKEN') : '') || '';
                if (csrf)
                    xhr.setRequestHeader('X-XSRF-TOKEN', csrf);
            }
            catch { }
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    it.percent = Math.round((e.loaded / e.total) * 100);
                    renderAttachBar();
                }
            };
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    try {
                        const data = JSON.parse(xhr.responseText || '{}');
                        if (xhr.status >= 200 && xhr.status < 300 && (data === null || data === void 0 ? void 0 : data.key)) {
                            it.key = String(data.key);
                            it.status = 'ready';
                            it.percent = 100;
                        }
                        else {
                            it.status = 'error';
                            it.errorMsg = (data === null || data === void 0 ? void 0 : data.error) || `HTTP ${xhr.status}`;
                        }
                    }
                    catch {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            it.status = 'ready';
                            it.percent = 100;
                        }
                        else {
                            it.status = 'error';
                            it.errorMsg = `HTTP ${xhr.status}`;
                        }
                    }
                    renderAttachBar();
                }
            };
            xhr.onerror = () => {
                it.status = 'error';
                it.errorMsg = 'Erreur réseau';
                renderAttachBar();
            };
            xhr.onabort = () => {
                it.status = 'canceled';
                renderAttachBar();
            };
            xhr.send(fd);
        }
        input.onchange = async () => {
            var _a, _b;
            const files = Array.from(input.files || []);
            if (!files.length)
                return;
            const room = w.selectedRoom;
            if (!room) {
                try {
                    (_b = (_a = window).showToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Aucune room sélectionnée');
                }
                catch { }
                return;
            }
            for (const file of files)
                uploadWithProgress(file, String(room.id));
            input.value = '';
        };
    }
    ensureAttachUI();
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            var _a, _b;
            e.preventDefault();
            const selectedRoom = w.selectedRoom;
            const currentUser = w.currentUser;
            if (!selectedRoom || !currentUser)
                return;
            const content = ((messageInput === null || messageInput === void 0 ? void 0 : messageInput.value) || "").trim();
            const readyKeys = pendingItems.filter(it => it.key && it.status === 'ready').map(it => it.key);
            if (!content && readyKeys.length === 0)
                return;
            const payload = {
                roomId: selectedRoom.id,
                content,
                timestamp: Date.now(),
                clientMsgId: genClientMsgId(),
                attachments: readyKeys,
            };
            w.socket.emit("sendMessageToRoom", payload, (res) => {
                var _a, _b, _c;
                try {
                    if (res && res.success) {
                        if (res.message && typeof w.renderMsg === 'function') {
                            w.renderMsg(res.message);
                        }
                        // Optimistic: update last message preview inline in room list
                        try {
                            if (typeof w.updateRoomLastMsgPreview === "function")
                                w.updateRoomLastMsgPreview(String(selectedRoom.id), ((_a = res.message) === null || _a === void 0 ? void 0 : _a.content) || content || (res.finalUrls || []).join('\n') || '');
                        }
                        catch { }
                    }
                    else if (res && res.error) {
                        (_c = (_b = window).showToast) === null || _c === void 0 ? void 0 : _c.call(_b, String(res.error));
                    }
                }
                catch { }
            });
            // Stats: count outgoing message
            try {
                (_b = (_a = window).statsOnMessage) === null || _b === void 0 ? void 0 : _b.call(_a, String(selectedRoom.id));
            }
            catch { }
            if (messageInput)
                messageInput.value = "";
            pendingItems = [];
            renderAttachBar();
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
    // Cleanup temp attachments if user leaves/reloads without sending
    try {
        window.addEventListener('beforeunload', (ev) => {
            const keys = pendingItems.filter(it => it.key && it.status === 'ready').map(it => it.key);
            if (keys.length > 0) {
                navigator.sendBeacon && navigator.sendBeacon('/api/upload', new Blob([JSON.stringify({ keys })], { type: 'application/json' }));
            }
        });
    }
    catch { }
    // --- Real-time updates: edit/delete/undo wiring ---
    function renderContentInto(el, content) {
        try {
            el.innerHTML = '';
            const parts = String(content || '').split(/\r?\n/);
            for (const p of parts) {
                const line = document.createElement('div');
                const urls = String(p || '').split(/\s+/).filter(Boolean);
                if (urls.length === 1 && isMediaUrl(urls[0]).kind === 'image') {
                    const img = document.createElement('img');
                    img.src = urls[0];
                    img.alt = 'image';
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '6px';
                    line.appendChild(img);
                }
                else if (urls.length === 1 && isMediaUrl(urls[0]).kind === 'video') {
                    const v = document.createElement('video');
                    v.src = urls[0];
                    v.controls = true;
                    v.preload = 'metadata';
                    v.style.maxWidth = '100%';
                    v.style.borderRadius = '6px';
                    line.appendChild(v);
                }
                else {
                    line.textContent = p;
                }
                el.appendChild(line);
            }
        }
        catch {
            el.textContent = String(content || '');
        }
    }
    function updateMessageBubbleContent(messageId, content) {
        const chatWindow = getChatWindow();
        if (!chatWindow)
            return;
        const midStr = String(messageId);
        const bubble = chatWindow.querySelector(`div.message[data-message-id="${CSS.escape(midStr)}"]`);
        if (!bubble)
            return;
        const contentEl = bubble.querySelector('.msg-content');
        if (!contentEl)
            return;
        renderContentInto(contentEl, content);
    }
    function markMessageDeleted(messageId) {
        updateMessageBubbleContent(messageId, '[deleted]');
    }
    // Expose a simple undo helper callable from UI
    if (!w.requestUndo)
        w.requestUndo = function requestUndo(messageId) {
            const room = w.selectedRoom;
            if (!room)
                return;
            try {
                w.socket.emit('messageUndo', { roomId: room.id, messageId: Number(messageId) }, (res) => {
                    var _a, _b, _c, _d;
                    if (res && res.success) {
                        (_b = (_a = window).showToast) === null || _b === void 0 ? void 0 : _b.call(_a, 'Modification reverted');
                        clearUndoEligible(messageId);
                        // Clear persistent snackbar state
                        try {
                            clearUndoPersist(String((w.currentUser || {}).id || ''), String(messageId));
                        }
                        catch { }
                        try {
                            hideUndoSnackbar(String(messageId));
                        }
                        catch { }
                    }
                    else if (res && res.error) {
                        (_d = (_c = window).showToast) === null || _d === void 0 ? void 0 : _d.call(_c, String(res.error));
                    }
                });
            }
            catch { }
        };
    // --- Persistent Undo snackbar (localStorage + WS TTL sync) ---
    const UNDO_LS_PREFIX = 'undo:'; // undo:{userId}:{messageId} => { roomId, messageId, expiresAt }
    const CLIENT_ID_KEY = 'rtc:clientId';
    function getClientId() {
        try {
            let id = localStorage.getItem(CLIENT_ID_KEY);
            if (!id) {
                id = genClientMsgId();
                localStorage.setItem(CLIENT_ID_KEY, id);
            }
            return id;
        }
        catch {
            return 'client';
        }
    }
    function lsKey(userId, messageId) { return `${UNDO_LS_PREFIX}${userId}:${messageId}`; }
    function saveUndoPersist(userId, roomId, messageId, expiresAt) {
        try {
            localStorage.setItem(lsKey(userId, messageId), JSON.stringify({ roomId, messageId, expiresAt, clientId: getClientId() }));
        }
        catch { }
    }
    function loadUndoPersist(userId, messageId) {
        try {
            const raw = localStorage.getItem(lsKey(userId, messageId));
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    }
    function clearUndoPersist(userId, messageId) {
        try {
            localStorage.removeItem(lsKey(userId, messageId));
        }
        catch { }
    }
    function ensureUndoSnackbar() {
        let sb = document.getElementById('undo-snackbar');
        if (!sb) {
            sb = document.createElement('div');
            sb.id = 'undo-snackbar';
            sb.style.position = 'fixed';
            sb.style.left = '50%';
            sb.style.transform = 'translateX(-50%)';
            sb.style.bottom = '20px';
            sb.style.background = '#1f2937';
            sb.style.color = 'white';
            sb.style.padding = '10px 14px';
            sb.style.borderRadius = '8px';
            sb.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
            sb.style.display = 'none';
            sb.style.zIndex = '10000';
            sb.innerHTML = '<button class="undo-close" style="position:absolute;right:6px;top:4px;background:transparent;color:#fff;border:none;font-weight:bold;cursor:pointer">×</button><span class="undo-text"></span> <button class="undo-btn" style="margin-left:12px;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer">Annuler</button>';
            document.body.appendChild(sb);
        }
        return sb;
    }
    const undoTimers = {};
    function showUndoSnackbar(roomId, messageId, ttlSeconds) {
        const currentUser = w.currentUser || {};
        const uid = String(currentUser.id || '');
        const mid = String(messageId);
        const sb = ensureUndoSnackbar();
        const txt = sb.querySelector('.undo-text');
        const btn = sb.querySelector('.undo-btn');
        const close = sb.querySelector('.undo-close');
        let remaining = Math.max(0, Math.floor(ttlSeconds));
        const updateText = () => { txt.textContent = `Vous pouvez annuler cette modification pendant ${remaining}s`; };
        updateText();
        sb.style.display = '';
        try {
            if (undoTimers[mid])
                window.clearInterval(undoTimers[mid]);
        }
        catch { }
        undoTimers[mid] = window.setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                hideUndoSnackbar(mid);
                clearUndoPersist(uid, mid);
            }
            else
                updateText();
        }, 1000);
        btn.onclick = () => { try {
            w.requestUndo(mid);
        }
        catch { } };
        if (close)
            close.onclick = () => { hideUndoSnackbar(mid); try {
                clearUndoPersist(uid, mid);
            }
            catch { } };
    }
    function hideUndoSnackbar(messageId) {
        const sb = document.getElementById('undo-snackbar');
        if (sb)
            sb.style.display = 'none';
        try {
            if (undoTimers[messageId]) {
                window.clearInterval(undoTimers[messageId]);
                delete undoTimers[messageId];
            }
        }
        catch { }
    }
    async function startPersistentUndo(roomId, messageId) {
        try {
            const mid = Number(messageId);
            const uid = String((w.currentUser || {}).id || '');
            if (!uid)
                return; // do not persist for anonymous/unknown user
            const res = await new Promise((resolve) => {
                try {
                    w.socket.emit('getUndoTTL', { roomId, messageId: mid }, (r) => resolve(r));
                }
                catch {
                    resolve(null);
                }
            });
            const ttl = (res && res.success && typeof res.ttlSeconds === 'number') ? res.ttlSeconds : 0;
            if (ttl > 0) {
                const expiresAt = Date.now() + ttl * 1000;
                saveUndoPersist(uid, String(roomId), String(messageId), expiresAt);
                showUndoSnackbar(String(roomId), String(messageId), ttl);
            }
        }
        catch { }
    }
    // Restore snackbar on load if present
    (function restoreUndoSnackbar() {
        try {
            const uid = String((w.currentUser || {}).id || '');
            if (!uid)
                return;
            // Find any stored undo key for this user (iterate localStorage keys)
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || !k.startsWith(UNDO_LS_PREFIX + uid + ':'))
                    continue;
                try {
                    const val = localStorage.getItem(k);
                    const obj = val ? JSON.parse(val) : null;
                    if (!obj || typeof obj.expiresAt !== 'number')
                        continue;
                    // Only show if this browser initiated the change
                    if (obj.clientId && obj.clientId !== getClientId())
                        continue;
                    const remainMs = obj.expiresAt - Date.now();
                    if (remainMs > 1000) {
                        showUndoSnackbar(String(obj.roomId), String(obj.messageId), Math.floor(remainMs / 1000));
                        // Ensure inline Undo button is visible again
                        try {
                            setUndoEligible(String(obj.messageId), remainMs);
                        }
                        catch { }
                    }
                    else {
                        clearUndoPersist(uid, String(obj.messageId));
                    }
                }
                catch { }
            }
        }
        catch { }
    })();
    // Also expose a callable restore in case currentUser/socket becomes available later
    function restoreUndoSnackbarNow() {
        try {
            const uid = String((w.currentUser || {}).id || '');
            if (!uid)
                return;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || !k.startsWith(UNDO_LS_PREFIX + uid + ':'))
                    continue;
                try {
                    const val = localStorage.getItem(k);
                    const obj = val ? JSON.parse(val) : null;
                    if (!obj || typeof obj.expiresAt !== 'number')
                        continue;
                    if (obj.clientId && obj.clientId !== getClientId())
                        continue;
                    const remainMs = obj.expiresAt - Date.now();
                    if (remainMs > 1000) {
                        showUndoSnackbar(String(obj.roomId), String(obj.messageId), Math.floor(remainMs / 1000));
                        // Also ensure inline Undo button is visible again
                        try {
                            setUndoEligible(String(obj.messageId), remainMs);
                        }
                        catch { }
                    }
                    else {
                        clearUndoPersist(uid, String(obj.messageId));
                    }
                }
                catch { }
            }
        }
        catch { }
    }
    // Register WS listeners once (even if socket is created later)
    function attachWsHandlers() {
        try {
            if (!w.socket || w.__msg_edit_delete_handlers__)
                return;
            w.__msg_edit_delete_handlers__ = true;
            w.socket.on('messageEdited', (payload) => {
                try {
                    const selectedRoom = w.selectedRoom;
                    if (!selectedRoom || String(selectedRoom.id) !== String(payload.roomId))
                        return;
                    updateMessageBubbleContent(payload.messageId, payload.content);
                    // Update inline preview
                    try {
                        typeof w.updateRoomLastMsgPreview === 'function' && w.updateRoomLastMsgPreview(String(payload.roomId), payload.content || '');
                    }
                    catch { }
                    // Add '(edited)' tag in meta row
                    try {
                        const midStr = String(payload.messageId);
                        // Only set edited badge if not a restoration from delete
                        if (!payload.restored)
                            setEditedFlag(midStr);
                        const bubble = document.querySelector(`div.message[data-message-id="${CSS.escape(midStr)}"]`);
                        if (bubble) {
                            let meta = bubble.querySelector('.msg-meta-row');
                            if (meta) {
                                let edited = meta.querySelector('.edited-flag');
                                if (!payload.restored && !edited) {
                                    edited = document.createElement('span');
                                    edited.className = 'edited-flag';
                                    edited.style.marginLeft = '6px';
                                    edited.style.fontSize = '11px';
                                    edited.style.color = '#6b7280';
                                    edited.textContent = '(edited)';
                                    meta.appendChild(edited);
                                }
                                else if (payload.restored && edited) {
                                    // If restored, remove the edited badge if present
                                    try {
                                        edited.remove();
                                    }
                                    catch { }
                                    try {
                                        clearEditedFlag(midStr);
                                    }
                                    catch { }
                                }
                            }
                        }
                    }
                    catch { }
                }
                catch { }
            });
            w.socket.on('messageDeleted', (payload) => {
                try {
                    const selectedRoom = w.selectedRoom;
                    if (!selectedRoom || String(selectedRoom.id) !== String(payload.roomId))
                        return;
                    markMessageDeleted(payload.messageId);
                    try {
                        typeof w.updateRoomLastMsgPreview === 'function' && w.updateRoomLastMsgPreview(String(payload.roomId), '[deleted]');
                    }
                    catch { }
                }
                catch { }
            });
            // After handlers attach, attempt to restore any pending Undo snackbar
            try {
                restoreUndoSnackbarNow();
            }
            catch { }
            // Re-attach after reconnect if needed and restore snackbar
            try {
                w.socket.on('connect', () => { w.__msg_edit_delete_handlers__ = false; attachWsHandlers(); try {
                    restoreUndoSnackbarNow();
                }
                catch { } });
            }
            catch { }
        }
        catch { }
    }
    // Try immediately and then retry a few times if socket is not ready yet
    attachWsHandlers();
    (function retryAttach(attempt = 0) {
        if (w.__msg_edit_delete_handlers__)
            return;
        if (attempt > 20)
            return; // ~10s max (with 500ms intervals)
        setTimeout(() => { attachWsHandlers(); retryAttach(attempt + 1); }, 500);
    })();
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
// invites.ts - simple UI to create/consume invite tokens via REST
(function () {
    const w = window;
    if (w.__invites_ts_initialized__)
        return;
    w.__invites_ts_initialized__ = true;
    function ensureToolbar() {
        const panel = document.getElementById("room-panel");
        if (!panel)
            return null;
        let bar = document.getElementById("invite-toolbar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "invite-toolbar";
            bar.style.margin = "8px 0";
            bar.style.display = "flex";
            bar.style.gap = "8px";
            bar.style.alignItems = "center";
            bar.innerHTML = `
        <input id="invite-token-input" type="text" placeholder="Coller un token pour rejoindre" style="flex:1; min-width:200px;"/>
        <button id="btn-consume-invite" class="chat-send-btn" title="Rejoindre">Rejoindre</button>
      `;
            // Insert toolbar at the bottom of the room panel
            panel.appendChild(bar);
        }
        return bar;
    }
    async function createInviteForCurrentRoom() {
        var _a, _b, _c;
        const selectedRoom = w.selectedRoom;
        const currentUser = w.currentUser;
        if (!selectedRoom || !currentUser) {
            alert('Sélectionnez une room avant de créer une invitation.');
            return;
        }
        if (selectedRoom && selectedRoom.type === 'user') {
            alert('Impossible de partager une conversation privée (DM).');
            return;
        }
        try {
            const csrf = (typeof getCookie === 'function' ? getCookie('X-XSRF-TOKEN') : '') || '';
            const res = await fetch('/api/chat/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrf,
                },
                credentials: 'include',
                body: JSON.stringify({ roomId: selectedRoom.id })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !(data === null || data === void 0 ? void 0 : data.token)) {
                alert((data === null || data === void 0 ? void 0 : data.error) || 'Impossible de créer une invitation');
                return;
            }
            // Copy a full shareable URL (so the recipient hits the same backend)
            const shareUrl = `${location.origin}/api/chat/invite/${encodeURIComponent(String(data.token))}`;
            try {
                (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(shareUrl);
            }
            catch { }
            try {
                (_c = (_b = window).showToast) === null || _c === void 0 ? void 0 : _c.call(_b, "Lien d'invitation copié dans le presse-papiers");
            }
            catch {
                alert('Lien d\'invitation (URL) copié dans le presse-papiers.');
            }
            try {
                showSharePanel(shareUrl);
            }
            catch { }
        }
        catch {
            alert('Erreur réseau');
        }
    }
    async function consumeInviteToken() {
        var _a, _b, _c;
        const inp = document.getElementById('invite-token-input');
        const btn = document.getElementById('btn-consume-invite');
        const raw = ((inp === null || inp === void 0 ? void 0 : inp.value) || '').trim();
        if (!raw)
            return;
        if (btn) {
            btn.disabled = true;
            try {
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
            }
            catch { }
        }
        // Accept either full URL or bare token; support signed tokens with dots/underscores
        let token = raw;
        try {
            if (/^https?:\/\//i.test(raw)) {
                const u = new URL(raw);
                const parts = u.pathname.split('/').filter(Boolean);
                token = parts[parts.length - 1] || raw;
            }
        }
        catch {
            token = raw;
        }
        try {
            const res = await fetch(`/api/chat/invite/${encodeURIComponent(token)}`, { credentials: 'include' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !((_a = data === null || data === void 0 ? void 0 : data.payload) === null || _a === void 0 ? void 0 : _a.roomId)) {
                alert((data === null || data === void 0 ? void 0 : data.error) || 'Invitation invalide ou expirée');
                return;
            }
            const roomId = data.payload.roomId;
            // Try to join immediately; UI will update via sockets
            w.socket.emit('joinRoom', { roomId });
            try {
                (_c = (_b = window).showToast) === null || _c === void 0 ? void 0 : _c.call(_b, 'Rejoint avec succès');
            }
            catch { }
            // Optionally, if room already in list, open it
            try {
                const r = (w.rooms || []).find((x) => x && x.id === roomId);
                if (r && typeof w.joinRoom === 'function')
                    w.joinRoom(r);
                else
                    w.socket.emit('getRooms');
            }
            catch { }
        }
        catch {
            alert('Erreur lors de la consommation du token');
        }
        finally {
            if (btn) {
                btn.disabled = false;
                try {
                    btn.style.opacity = '';
                    btn.style.cursor = '';
                }
                catch { }
            }
        }
    }
    function wireToolbar() {
        const bar = ensureToolbar();
        if (!bar)
            return;
        const btnConsume = document.getElementById('btn-consume-invite');
        if (btnConsume) {
            const inp = document.getElementById('invite-token-input');
            const syncDisabled = () => {
                const v = ((inp === null || inp === void 0 ? void 0 : inp.value) || '').trim();
                btnConsume.disabled = !v;
                try {
                    btnConsume.style.opacity = btnConsume.disabled ? '0.6' : '';
                    btnConsume.style.cursor = btnConsume.disabled ? 'not-allowed' : '';
                }
                catch { }
            };
            btnConsume.onclick = () => consumeInviteToken();
            inp === null || inp === void 0 ? void 0 : inp.addEventListener('input', syncDisabled);
            syncDisabled();
        }
    }
    // --- Share panel (URL + Copy) ---
    function ensureSharePanel() {
        let panel = document.getElementById('invite-share-panel');
        if (panel)
            return panel;
        const parent = document.body;
        panel = document.createElement('div');
        panel.id = 'invite-share-panel';
        panel.style.position = 'fixed';
        panel.style.right = '16px';
        panel.style.top = '84px';
        panel.style.background = '#fff';
        panel.style.border = '1px solid #ddd';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        panel.style.padding = '10px';
        panel.style.zIndex = '9998';
        panel.style.minWidth = '320px';
        panel.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <input id="share-url-input" type="text" readonly style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;" />
        <button id="btn-share-copy" class="auth-btn" type="button">Copier</button>
        <button id="btn-share-close" class="icon-btn" type="button" title="Fermer">✕</button>
      </div>
    `;
        parent.appendChild(panel);
        const close = panel.querySelector('#btn-share-close');
        if (close)
            close.onclick = () => { try {
                panel.style.display = 'none';
            }
            catch { } };
        const copy = panel.querySelector('#btn-share-copy');
        if (copy)
            copy.onclick = async () => {
                var _a, _b, _c;
                try {
                    const inp = panel.querySelector('#share-url-input');
                    const val = ((inp === null || inp === void 0 ? void 0 : inp.value) || '').trim();
                    if (val)
                        await ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(val));
                    (_c = (_b = window).showToast) === null || _c === void 0 ? void 0 : _c.call(_b, 'Lien copié');
                }
                catch { }
            };
        return panel;
    }
    function showSharePanel(url) {
        const panel = ensureSharePanel();
        if (!panel)
            return;
        panel.style.display = '';
        const inp = panel.querySelector('#share-url-input');
        if (inp) {
            inp.value = url || '';
            try {
                inp.select();
            }
            catch { }
        }
    }
    // Wire on load
    try {
        wireToolbar();
    }
    catch { }
    // Expose for other components (e.g., header button)
    try {
        window.createInviteForCurrentRoom = createInviteForCurrentRoom;
    }
    catch { }
})();
// sockets.ts - WebSocket setup and event wiring (global, no modules)
// Assumes other helpers are available globally (renderRoomList, renderMsg, renderParticipants, requestFriendList)
// and DOM helpers (showAuthPanel, syncLayoutVisibility, setTypingBanner, renderTypingBanner).
// Create a single global socket and expose it
// Include CSRF token in the handshake auth for defense-in-depth
var socket = window.socket ||
    io({
        auth: {
            csrf: typeof getCookie === "function" ? getCookie("X-XSRF-TOKEN") : undefined,
        },
    });
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
            // --- Room online counter updates ---
            socket.on("roomOnline", (payload) => {
                var _a, _b, _c;
                try {
                    const rid = String((payload === null || payload === void 0 ? void 0 : payload.roomId) || '');
                    const count = Number((_a = payload === null || payload === void 0 ? void 0 : payload.count) !== null && _a !== void 0 ? _a : 0) || 0;
                    (_c = (_b = window).statsOnOnline) === null || _c === void 0 ? void 0 : _c.call(_b, rid, count);
                }
                catch { }
            });
            // --- AGGREGATED TYPING COUNT ---
            socket.on("typingCount", (payload) => {
                try {
                    if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
                        return;
                    const count = Number(payload.count || 0);
                    if (typeof setTypingBanner === "function") {
                        if (count <= 0)
                            setTypingBanner("");
                        else if (count === 1)
                            setTypingBanner("Quelqu'un est en train d'écrire…");
                        else
                            setTypingBanner(`${count} personnes écrivent…`);
                    }
                }
                catch { }
            });
            // --- ROOM ONLINE COUNT ---
            socket.on("roomOnline", (payload) => {
                try {
                    if (!payload || !w.selectedRoom || payload.roomId !== w.selectedRoom.id)
                        return;
                    // For DM, presence label is handled by setupDmPresence; for groups show online count
                    if (w.selectedRoom && w.selectedRoom.type !== "user") {
                        const n = Number(payload.count || 0);
                        if (typeof updatePresenceLabel === "function")
                            updatePresenceLabel(`• ${n} en ligne`);
                    }
                }
                catch { }
            });
            // --- EXPOSE WS AGGREGATION HELPERS ---
            w.getTopActiveRooms = function getTopActiveRooms(limit = 10) {
                return new Promise((resolve) => {
                    try {
                        socket.emit("getTopActiveRooms", { limit }, (res) => resolve(res));
                    }
                    catch {
                        resolve({ success: false });
                    }
                });
            };
            w.getRoomLastMessage = function getRoomLastMessage(roomId) {
                return new Promise((resolve) => {
                    try {
                        socket.emit("getRoomLastMessage", { roomId }, (res) => resolve(res));
                    }
                    catch {
                        resolve({ success: false });
                    }
                });
            };
            w.getRoomMessageCounts = function getRoomMessageCounts(roomId, range = 'hour', from, to) {
                return new Promise((resolve) => {
                    try {
                        socket.emit("getRoomMessageCounts", { roomId, range, from, to }, (res) => resolve(res));
                    }
                    catch {
                        resolve({ success: false });
                    }
                });
            };
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        // Stats: count message for the room
        try {
            (_b = (_a = window).statsOnMessage) === null || _b === void 0 ? void 0 : _b.call(_a, String((data === null || data === void 0 ? void 0 : data.roomId) || ''));
        }
        catch { }
        if (w.selectedRoom && data.roomId === w.selectedRoom.id) {
            if (typeof w.renderMsg === "function")
                w.renderMsg(data.message);
            // Update inline last message preview for this room
            try {
                if (typeof w.updateRoomLastMsgPreview === 'function')
                    w.updateRoomLastMsgPreview(String(data.roomId || ''), String(((_c = data === null || data === void 0 ? void 0 : data.message) === null || _c === void 0 ? void 0 : _c.content) || ''));
            }
            catch { }
            // Acknowledge delivery/read for messages from others in active room
            try {
                const m = data.message;
                const authorName = (_d = m === null || m === void 0 ? void 0 : m.author) === null || _d === void 0 ? void 0 : _d.name;
                const mine = w.currentUser && authorName === w.currentUser.name;
                const mid = parseInt(String((_e = m === null || m === void 0 ? void 0 : m.id) !== null && _e !== void 0 ? _e : ""), 10);
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
            const authorName = (_g = (_f = data === null || data === void 0 ? void 0 : data.message) === null || _f === void 0 ? void 0 : _f.author) === null || _g === void 0 ? void 0 : _g.name;
            if (!w.currentUser || authorName === w.currentUser.name)
                return;
            // Update list last message preview for the room
            try {
                if (typeof w.updateRoomLastMsgPreview === 'function')
                    w.updateRoomLastMsgPreview(String(data.roomId || ''), String(((_h = data === null || data === void 0 ? void 0 : data.message) === null || _h === void 0 ? void 0 : _h.content) || ''));
            }
            catch { }
            // Mark as delivered when message arrives for a room that's not active
            try {
                const mid = parseInt(String((_k = (_j = data === null || data === void 0 ? void 0 : data.message) === null || _j === void 0 ? void 0 : _j.id) !== null && _k !== void 0 ? _k : ""), 10);
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
// analytics.ts - Top Active Rooms panel and last-message previews
(function () {
    const w = window;
    if (w.__analytics_ts_initialized__)
        return;
    w.__analytics_ts_initialized__ = true;
    function ensurePanel() {
        const panel = document.getElementById("room-panel");
        if (!panel)
            return null;
        let sec = document.getElementById("top-active-rooms");
        if (!sec) {
            sec = document.createElement("section");
            sec.id = "top-active-rooms";
            sec.className = "top-active-block";
            sec.style.margin = "12px 0";
            sec.innerHTML = `
        <ul id="top-active-list" class="room-list" style="max-height:160px; overflow:auto; margin:0; padding:0;"></ul>
      `;
            panel.appendChild(sec);
        }
        return sec;
    }
    function el(id) {
        return document.getElementById(id);
    }
    async function renderTopActive(limit = 8) {
        const sec = ensurePanel();
        const ul = el('top-active-list');
        if (!ul || !sec)
            return;
        ul.innerHTML = '';
        try {
            const res = await (w.getTopActiveRooms ? w.getTopActiveRooms(limit) : Promise.resolve({ success: false }));
            if (!res || !res.success)
                return;
            const items = Array.isArray(res.items) ? res.items : [];
            for (const room of items) {
                const li = document.createElement('li');
                li.className = 'room-list-item';
                const name = (room === null || room === void 0 ? void 0 : room.name) || ((room === null || room === void 0 ? void 0 : room.type) === 'user' ? 'DM' : 'Room');
                const initial = (name || '?').trim().charAt(0).toUpperCase();
                const typeIcon = (room === null || room === void 0 ? void 0 : room.type) === 'user' ? '👤' : '📁';
                li.innerHTML = `
          <div class="room-avatar" aria-hidden="true">${initial}</div>
          <span class="room-type-icon" aria-hidden="true">${typeIcon}</span>
          <span class="room-name">${name}</span>
          <span class="room-lastmsg" style="display:block;color:#888;font-size:12px;margin-left:28px;"></span>
        `;
                li.style.cursor = 'pointer';
                li.onclick = () => {
                    try {
                        if (typeof w.joinRoom === 'function')
                            w.joinRoom(room);
                        else if (w.socket)
                            w.socket.emit('joinRoom', { roomId: room.id });
                    }
                    catch { }
                };
                ul.appendChild(li);
                // Fetch last message preview
                try {
                    const lastRes = await (w.getRoomLastMessage ? w.getRoomLastMessage(room.id) : Promise.resolve(null));
                    const span = li.querySelector('.room-lastmsg');
                    if (span && lastRes && lastRes.success && lastRes.message) {
                        const preview = String(lastRes.message.content || '').slice(0, 80);
                        span.textContent = preview ? preview : '';
                    }
                }
                catch { }
            }
        }
        catch { }
    }
    function wirePanel() {
        ensurePanel();
        const btn = document.getElementById('btn-refresh-top');
        if (btn)
            btn.onclick = () => renderTopActive(8);
        // Auto-render once on load
        renderTopActive(8).catch(() => undefined);
    }
    try {
        wirePanel();
    }
    catch { }
    // ================= Header Buttons (Share + Stats) =================
    function ensureHeaderButtons() {
        try {
            const title = document.getElementById('selected-room-title');
            if (!title)
                return;
            const selected = window.selectedRoom;
            // Share button
            let btnShare = document.getElementById('btn-share-room');
            if (!btnShare) {
                btnShare = document.createElement('button');
                btnShare.id = 'btn-share-room';
                btnShare.className = 'auth-btn';
                btnShare.style.marginLeft = '8px';
                btnShare.textContent = 'Partager';
                btnShare.title = 'Créer une invitation';
                btnShare.onclick = () => {
                    try {
                        (w.createInviteForCurrentRoom || (() => { }))();
                    }
                    catch { }
                };
                title.appendChild(btnShare);
            }
            // Hide/disable for DM rooms
            try {
                if (selected && selected.type === 'user') {
                    btnShare.style.display = 'none';
                }
                else {
                    btnShare.style.display = '';
                }
            }
            catch { }
            // Stats button
            let btnStats = document.getElementById('btn-room-stats');
            if (!btnStats) {
                btnStats = document.createElement('button');
                btnStats.id = 'btn-room-stats';
                btnStats.className = 'auth-btn';
                btnStats.style.marginLeft = '6px';
                btnStats.textContent = 'Stats';
                btnStats.title = 'Afficher les statistiques';
                btnStats.onclick = () => toggleStatsPanel();
                title.appendChild(btnStats);
            }
        }
        catch { }
    }
    function ensureStatsContainer() {
        var _a;
        const title = document.getElementById('selected-room-title');
        if (!title)
            return null;
        let container = document.getElementById('room-stats-panel');
        if (!container) {
            container = document.createElement('div');
            container.id = 'room-stats-panel';
            container.style.fontSize = '12px';
            container.style.color = '#555';
            container.style.border = '1px dashed #ddd';
            container.style.borderRadius = '6px';
            container.style.padding = '8px';
            container.style.margin = '8px 0';
            container.style.display = 'none';
            (_a = title.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(container, title.nextSibling);
        }
        return container;
    }
    function toggleStatsPanel() {
        const container = ensureStatsContainer();
        if (!container)
            return;
        if (container.style.display === 'none') {
            container.style.display = '';
            renderRoomStats(container).catch(() => undefined);
        }
        else {
            container.style.display = 'none';
        }
    }
    async function renderRoomStats(container) {
        try {
            const selectedRoom = w.selectedRoom;
            if (!selectedRoom) {
                container.textContent = 'Aucune room sélectionnée.';
                return;
            }
            const to = Date.now();
            const from = to - 24 * 3600 * 1000; // 24h
            const res = await (w.getRoomMessageCounts ? w.getRoomMessageCounts(selectedRoom.id, 'hour', from, to) : Promise.resolve(null));
            if (!res || !res.success) {
                container.textContent = 'Impossible de charger les stats.';
                return;
            }
            const items = Array.isArray(res.items) ? res.items : [];
            const total = items.reduce((acc, it) => acc + (Number(it === null || it === void 0 ? void 0 : it.count) || 0), 0);
            // Simple render: total + list of last 8 buckets
            const last = items.slice(-8);
            container.innerHTML = `
        <div style="margin-bottom:6px;">Messages (24h): <b>${total}</b></div>
        <ul style="margin:0; padding-left:16px; max-height:120px; overflow:auto;">
          ${last.map((it) => `<li>${it.bucket} — ${it.count}</li>`).join('')}
        </ul>
      `;
        }
        catch {
            container.textContent = 'Erreur lors du rendu des stats.';
        }
    }
    // Wrap joinRoom to inject buttons when a room is opened
    try {
        const originalJoin = w.joinRoom;
        if (typeof originalJoin === 'function') {
            w.joinRoom = function wrappedJoinRoom(room) {
                originalJoin(room);
                try {
                    ensureHeaderButtons();
                }
                catch { }
                const panel = document.getElementById('room-stats-panel');
                if (panel)
                    panel.style.display = 'none';
            };
        }
        else {
            // Fallback: try once on load
            ensureHeaderButtons();
        }
    }
    catch { }
})();
// calls.ts - Basic signaling UI for Phase 1 (ringing only)
(function () {
    const w = window;
    let currentCallId = null;
    let pc = null;
    let localStream = null;
    let remoteAudio = null;
    let audioGate = null;
    let iceServers = null;
    let addedTracks = false;
    let makingOffer = false;
    let requestedMedia = 'audio';
    let localVideo = null;
    let remoteVideo = null;
    let permissionsReady = false;
    let remoteRenderStream = null;
    let pendingAddLocal = false;
    let statsInterval = null;
    let lastBytes = {};
    let hist = [];
    let agg = null;
    // Basic logger to the Calls panel list
    function log(msg) {
        try {
            const ul = document.getElementById('call-log');
            if (!ul)
                return;
            const li = document.createElement('li');
            li.textContent = String(msg || '');
            ul.appendChild(li);
        }
        catch { }
    }
    // ---- Stats helpers (top-level) ----
    function getStatsBox() { return document.getElementById('call-stats'); }
    function showStats(show) { const el = getStatsBox(); if (el)
        el.style.display = show ? '' : 'none'; }
    function getCanvas() { return document.getElementById('call-stats-canvas'); }
    function resizeCanvas() {
        var _a;
        const c = getCanvas();
        if (!c)
            return;
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const cssW = (((_a = c.parentElement) === null || _a === void 0 ? void 0 : _a.clientWidth) || c.clientWidth || 600);
        const cssH = 100; // fixed CSS height
        if (c.width !== cssW * dpr || c.height !== cssH * dpr) {
            c.width = Math.max(300, Math.floor(cssW * dpr));
            c.height = Math.floor(cssH * dpr);
            const ctx = c.getContext('2d');
            if (ctx)
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }
    function setQualityDot(score) {
        const box = getStatsBox();
        if (!box)
            return;
        const dot = box.querySelector('.quality-dot');
        if (!dot)
            return;
        let color = '#9ca3af';
        if (score === 'Excellent')
            color = '#10b981';
        else if (score === 'Good')
            color = '#f59e0b';
        else if (score === 'Fair')
            color = '#f97316';
        else if (score === 'Poor')
            color = '#ef4444';
        dot.style.background = color;
    }
    function drawHistory() {
        const c = getCanvas();
        if (!c)
            return;
        resizeCanvas();
        const ctx = c.getContext('2d');
        if (!ctx)
            return;
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const W = Math.floor((c.width || 0) / dpr);
        const H = Math.floor((c.height || 0) / dpr);
        ctx.clearRect(0, 0, W, H);
        // Axes/background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const y = i * H / 5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        // Map last 30s
        const now = Date.now();
        const windowMs = 30000;
        const pts = hist.filter(p => now - p.t <= windowMs);
        // Scales
        const rttMax = 500; // ms
        const lossMax = 20; // %
        const brMax = 2500; // kbps total recv
        function xOf(t) { return W - ((now - t) / windowMs) * W; }
        function yOf(v, max) { return H - Math.max(0, Math.min(1, v / max)) * H; }
        // Draw lines
        function drawLine(getV, max, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            let first = true;
            for (const p of pts) {
                const x = xOf(p.t), y = yOf(getV(p), max);
                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                }
                else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        drawLine(p => p.rtt, rttMax, '#0ea5e9'); // blue
        drawLine(p => p.lossPct, lossMax, '#ef4444'); // red
        drawLine(p => p.brRecv, brMax, '#10b981'); // green
        drawLine(p => p.brSend, brMax, '#8b5cf6'); // purple
        // Optionally render fpsOut scaled to lossMax axis for a rough overlay
        drawLine(p => p.fpsOut, 60, '#f59e0b'); // orange (0-60fps)
        // Draw dots for visibility when sample count is small
        function drawDots(getV, max, color) {
            ctx.fillStyle = color;
            for (const p of pts) {
                const x = xOf(p.t), y = yOf(getV(p), max);
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        drawDots(p => p.rtt, rttMax, '#0ea5e9');
        drawDots(p => p.lossPct, lossMax, '#ef4444');
        drawDots(p => p.brRecv, brMax, '#10b981');
        drawDots(p => p.brSend, brMax, '#8b5cf6');
        drawDots(p => p.fpsOut, 60, '#f59e0b');
    }
    async function sampleStats() {
        try {
            if (!pc)
                return;
            const report = await pc.getStats();
            let rtt = 0;
            let lossA = 0;
            let lossV = 0;
            let jitterA = 0;
            let jitterV = 0;
            let bytesRecvA = 0;
            let bytesRecvV = 0;
            let bytesSentA = 0;
            let bytesSentV = 0;
            let pktsRecvA = 0;
            let pktsRecvV = 0;
            let fps = 0;
            let w = 0;
            let h = 0;
            let fpsOut = 0;
            let now = Date.now();
            report.forEach((s) => {
                if (s.type === 'candidate-pair' && s.nominated) {
                    rtt = Math.round((s.currentRoundTripTime || s.totalRoundTripTime || 0) * 1000);
                }
                if (s.type === 'inbound-rtp') {
                    if (s.kind === 'audio') {
                        lossA = s.packetsLost || 0;
                        jitterA = Math.round((s.jitter || 0) * 1000);
                        bytesRecvA = s.bytesReceived || 0;
                        pktsRecvA = s.packetsReceived || 0;
                    }
                    if (s.kind === 'video') {
                        lossV = s.packetsLost || 0;
                        jitterV = Math.round((s.jitter || 0) * 1000);
                        bytesRecvV = s.bytesReceived || 0;
                        pktsRecvV = s.packetsReceived || 0;
                        fps = s.framesPerSecond || fps;
                        w = s.frameWidth || w;
                        h = s.frameHeight || h;
                    }
                }
                if (s.type === 'outbound-rtp') {
                    if (s.kind === 'audio') {
                        bytesSentA = s.bytesSent || 0;
                    }
                    if (s.kind === 'video') {
                        bytesSentV = s.bytesSent || 0;
                        fpsOut = s.framesPerSecond || fpsOut;
                    }
                }
            });
            const dt = Math.max(1, now - (lastBytes.t || now));
            const brRecvA = lastBytes.aRecv != null ? Math.round(((bytesRecvA - (lastBytes.aRecv || 0)) * 8) / dt) : 0;
            const brRecvV = lastBytes.vRecv != null ? Math.round(((bytesRecvV - (lastBytes.vRecv || 0)) * 8) / dt) : 0;
            const brSendA = lastBytes.aSend != null ? Math.round(((bytesSentA - (lastBytes.aSend || 0)) * 8) / dt) : 0;
            const brSendV = lastBytes.vSend != null ? Math.round(((bytesSentV - (lastBytes.vSend || 0)) * 8) / dt) : 0;
            const brRecv = brRecvA + brRecvV;
            const brSend = brSendA + brSendV;
            // Loss percentage over last interval
            const lostNow = (lossA + lossV);
            const pktsNow = (pktsRecvA + pktsRecvV);
            const dLost = lastBytes.aLost != null ? (lostNow - ((lastBytes.aLost || 0) + (lastBytes.vLost || 0))) : 0;
            const dPkts = lastBytes.aPkts != null ? (pktsNow - ((lastBytes.aPkts || 0) + (lastBytes.vPkts || 0))) : 0;
            const lossPct = dPkts > 0 ? Math.max(0, Math.min(100, (dLost / dPkts) * 100)) : 0;
            lastBytes = { aRecv: bytesRecvA, vRecv: bytesRecvV, aSend: bytesSentA, vSend: bytesSentV, t: now, aPkts: pktsRecvA, vPkts: pktsRecvV, aLost: lossA, vLost: lossV };
            const qScore = (() => {
                const lossPct = Math.min(100, ((lossA + lossV) / 200) * 100);
                const r = rtt;
                const br = brRecvA + brRecvV;
                if (r < 80 && lossPct < 1 && br > 400)
                    return 'Excellent';
                if (r < 150 && lossPct < 3 && br > 200)
                    return 'Good';
                if (r < 300 && lossPct < 8)
                    return 'Fair';
                return 'Poor';
            })();
            if (agg) {
                agg.sumRtt += rtt;
                agg.sumLoss += lossPct;
                agg.sumBrRecv += brRecv;
                agg.sumBrSend += brSend;
                agg.cnt += 1;
                agg.lastQuality = qScore;
            }
            const statsBox = getStatsBox();
            if (statsBox) {
                const q = statsBox.querySelector('.quality');
                const r = statsBox.querySelector('.rtt');
                const l = statsBox.querySelector('.loss');
                const brR = statsBox.querySelector('.br-recv');
                const brS = statsBox.querySelector('.br-send');
                const j = statsBox.querySelector('.jitter');
                const fr = statsBox.querySelector('.fps-res');
                if (q)
                    q.textContent = qScore;
                if (r)
                    r.textContent = `${rtt} ms`;
                if (l)
                    l.textContent = `${(lossPct).toFixed(1)}%`;
                if (brR)
                    brR.textContent = `${brRecvA} + ${brRecvV} kbps`;
                if (brS)
                    brS.textContent = `${brSendA} + ${brSendV} kbps`;
                if (j)
                    j.textContent = `${jitterA}/${jitterV} ms`;
                if (fr)
                    fr.textContent = fps ? `${fps} fps ${w}x${h}` : '-';
                setQualityDot(qScore);
            }
            // Push history and trim 30s
            hist.push({ t: now, rtt, lossPct, brRecv, brSend, fpsOut });
            const cutoff = now - 30000;
            while (hist.length && hist[0].t < cutoff)
                hist.shift();
            drawHistory();
        }
        catch { }
    }
    function attachCanvasEvents() {
        const c = getCanvas();
        const tip = document.getElementById('call-stats-tip');
        if (!c || !tip)
            return;
        c.onmousemove = (e) => {
            const rect = c.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const W = c.width;
            const now = Date.now();
            const windowMs = 30000;
            const tAtX = now - ((W - x) / W) * windowMs;
            let best = null;
            let bestDt = Infinity;
            for (const p of hist) {
                const d = Math.abs(p.t - tAtX);
                if (d < bestDt) {
                    best = p;
                    bestDt = d;
                }
            }
            if (best) {
                tip.style.display = '';
                tip.textContent = `t-${Math.round((now - best.t) / 1000)}s | RTT ${best.rtt}ms | Loss ${best.lossPct.toFixed(1)}% | Recv ${best.brRecv} kbps | Send ${best.brSend} kbps | FPSout ${best.fpsOut}`;
            }
        };
        c.onmouseleave = () => { if (tip)
            tip.style.display = 'none'; };
    }
    function startStats() { if (statsInterval)
        return; lastBytes = {}; hist = []; agg = { start: Date.now(), sumRtt: 0, sumLoss: 0, sumBrRecv: 0, sumBrSend: 0, cnt: 0, lastQuality: '-' }; resizeCanvas(); statsInterval = window.setInterval(sampleStats, 1000); showStats(true); drawHistory(); attachCanvasEvents(); window.addEventListener('resize', resizeCanvas); }
    function stopStats() { if (statsInterval) {
        window.clearInterval(statsInterval);
        statsInterval = null;
    } showStats(false); hist = []; drawHistory(); window.removeEventListener('resize', resizeCanvas); }
    // UI elements
    function ensureCallsPanel() {
        let panel = document.getElementById('calls-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'calls-panel';
            panel.style.marginTop = '10px';
            panel.style.padding = '10px';
            panel.style.border = '1px solid #e5e7eb';
            panel.style.borderRadius = '8px';
            panel.style.background = '#fff';
            panel.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <strong>Calls (test)</strong>
        </div>
        <div id="active-call" style="display:none;margin-top:8px;padding:8px;border-radius:6px;background:#f3f4f6;color:#111;">
          <span class="status">Call active</span>
          <button class="mute" style="margin-left:10px;padding:4px 8px;border:none;border-radius:6px;background:#6b7280;color:#fff;cursor:pointer;">Mute</button>
          <button class="hangup" style="margin-left:6px;padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;">Hang up</button>
          <button class="toggle-stats" style="margin-left:6px;padding:4px 8px;border:none;border-radius:6px;background:#0ea5e9;color:#fff;cursor:pointer;">Stats</button>
        </div>
        <div id="video-area" style="display:none;margin-top:8px;gap:8px;align-items:center;justify-content:center;">
          <video id="webrtc-local-video" autoplay muted playsinline style="max-width:48%;border-radius:8px;background:#111;aspect-ratio:16/9"></video>
          <video id="webrtc-remote-video" autoplay playsinline style="max-width:48%;border-radius:8px;background:#111;aspect-ratio:16/9"></video>
        </div>
        <div id="call-stats" style="display:none;margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#111;">
          <div style="font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <span class="quality-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9ca3af"></span>
            <span>Quality</span>
          </div>
          <div class="quality" style="margin-bottom:6px;">-</div>
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;font-size:12px;">
            <div>RTT: <span class="rtt">-</span></div>
            <div>Loss: <span class="loss">-</span></div>
            <div>Bitrate recv A/V: <span class="br-recv">-</span></div>
            <div>Bitrate send A/V: <span class="br-send">-</span></div>
            <div>Jitter A/V: <span class="jitter">-</span></div>
            <div>FPS/Res recv: <span class="fps-res">-</span></div>
          </div>
          <div class="legend" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;font-size:12px;align-items:center;">
            <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#0ea5e9"></span>RTT</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#ef4444"></span>Loss %</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#10b981"></span>Recv kbps</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#8b5cf6"></span>Send kbps</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#f59e0b"></span>Outbound FPS</span>
          </div>
          <canvas id="call-stats-canvas" width="600" height="100" style="width:100%;height:100px;margin-top:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;"></canvas>
          <div id="call-stats-tip" style="position:relative;font-size:12px;color:#374151;margin-top:4px;display:none;"></div>
        </div>
        <ul id="call-log" style="list-style:disc;margin:8px 0 0 16px;"></ul>
      `;
            const chat = document.getElementById('chat') || document.body;
            chat.appendChild(panel);
        }
        return panel;
    }
    function ensureCallsButton() {
        let btn = document.getElementById('calls-fab');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'calls-fab';
            btn.textContent = 'Appels';
            btn.style.position = 'fixed';
            btn.style.right = '16px';
            btn.style.bottom = '16px';
            btn.style.padding = '10px 14px';
            btn.style.border = 'none';
            btn.style.borderRadius = '9999px';
            btn.style.background = '#8b5cf6';
            btn.style.color = '#fff';
            btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
            btn.style.cursor = 'pointer';
            // btn.onclick = () => {
            //   const panel = ensureCallsPanel();
            //   panel.style.display = panel.style.display === 'none' ? '' : (panel.style.display || '') === '' ? 'none' : '';
            // };
            document.body.appendChild(btn);
        }
        return btn;
    }
    function ensureIncomingOverlay() {
        let overlay = document.getElementById('incoming-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'incoming-overlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.55)';
            overlay.style.display = 'none';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '10000';
            const card = document.createElement('div');
            card.style.background = '#ffffff';
            card.style.borderRadius = '12px';
            card.style.padding = '16px';
            card.style.minWidth = '320px';
            card.style.textAlign = 'center';
            card.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px;font-size:16px;">Incoming call</div>
        <div class="txt" style="margin-bottom:10px;color:#374151"></div>
        <div class="perm" style="font-size:12px;color:#6b7280;margin-bottom:10px;">
          Permissions: mic${(navigator === null || navigator === void 0 ? void 0 : navigator.mediaDevices) ? '' : ' (not supported)'}<span class="vonly" style="display:none;"> + camera</span>
          <button class="grant" style="margin-left:8px;padding:4px 8px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;">Grant</button>
          <span class="pstat" style="margin-left:6px;color:#ef4444;">Waiting…</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
          <button class="accept" disabled style="padding:8px 14px;border:none;border-radius:9999px;background:#10b981;color:#fff;cursor:not-allowed;opacity:0.7;">Accept</button>
          <button class="decline" style="padding:8px 14px;border:none;border-radius:9999px;background:#ef4444;color:#fff;cursor:pointer;">Decline</button>
        </div>
      `;
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        }
        return overlay;
    }
    // --- Active call overlay (video/voice) ---
    let coOriginalVideoParent = null;
    function ensureCallOverlay() {
        let ov = document.getElementById('call-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'call-overlay';
            ov.style.position = 'fixed';
            ov.style.inset = '0';
            ov.style.zIndex = '9999';
            ov.style.display = 'none';
            ov.style.background = 'linear-gradient(180deg,#eef2ff,#faf5ff)';
            ov.innerHTML = `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px">
          <div id="co-video" style="display:none;width:100%;max-width:980px;grid-template-columns:1fr 1fr;gap:12px;align-items:center;justify-content:center;">
            <div id="co-remote-host" style="position:relative;background:#0b1020;border-radius:12px;aspect-ratio:16/9;overflow:hidden">
              <div class="avatar remote-avatar" style="position:absolute;inset:0;z-index:2;pointer-events:none;display:flex;align-items:center;justify-content:center">
                <div style="width:96px;height:96px;border-radius:9999px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:32px">R</div>
              </div>
            </div>
            <div id="co-local-host" style="position:relative;background:#0b1020;border-radius:12px;aspect-ratio:16/9;overflow:hidden">
              <div class="avatar local-avatar" style="position:absolute;inset:0;z-index:2;pointer-events:none;display:flex;align-items:center;justify-content:center">
                <div style="width:96px;height:96px;border-radius:9999px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:32px">Y</div>
              </div>
            </div>
          </div>
          <div id="co-audio" style="display:none;width:100%;max-width:600px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;justify-content:center;">
            <div style="background:#0b1020;color:#e5e7eb;border-radius:12px;padding:24px;text-align:center">
              <div class="name-remote" style="font-size:18px;font-weight:700">Remote</div>
            </div>
            <div style="background:#0b1020;color:#e5e7eb;border-radius:12px;padding:24px;text-align:center">
              <div class="name-me" style="font-size:18px;font-weight:700">You</div>
            </div>
          </div>
          <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:24px;display:flex;gap:12px;align-items:center;justify-content:center">
            <button id="co-mute" style="padding:10px 14px;border:none;border-radius:9999px;background:#111827;color:#fff;cursor:pointer">Mute</button>
            <button id="co-cam" style="padding:10px 14px;border:none;border-radius:9999px;background:#374151;color:#fff;cursor:pointer">Camera Off</button>
            <button id="co-hang" style="padding:10px 14px;border:none;border-radius:9999px;background:#ef4444;color:#fff;cursor:pointer">Hang up</button>
          </div>
        </div>
      `;
            document.body.appendChild(ov);
        }
        return ov;
    }
    function styleOverlayVideos() {
        try {
            if (localVideo) {
                const anyV = localVideo;
                if (!anyV.dataset)
                    anyV.dataset = {};
                if (anyV.dataset.prevStyle == null)
                    anyV.dataset.prevStyle = localVideo.getAttribute('style') || '';
                localVideo.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;');
            }
            if (remoteVideo) {
                const anyV = remoteVideo;
                if (!anyV.dataset)
                    anyV.dataset = {};
                if (anyV.dataset.prevStyle == null)
                    anyV.dataset.prevStyle = remoteVideo.getAttribute('style') || '';
                remoteVideo.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;');
            }
        }
        catch { }
    }
    function restoreVideoStyles() {
        var _a, _b;
        try {
            if (localVideo) {
                const anyV = localVideo;
                const prev = (_a = anyV === null || anyV === void 0 ? void 0 : anyV.dataset) === null || _a === void 0 ? void 0 : _a.prevStyle;
                if (prev != null)
                    localVideo.setAttribute('style', prev);
                else
                    localVideo.removeAttribute('style');
                if (anyV === null || anyV === void 0 ? void 0 : anyV.dataset)
                    anyV.dataset.prevStyle = '';
            }
            if (remoteVideo) {
                const anyV = remoteVideo;
                const prev = (_b = anyV === null || anyV === void 0 ? void 0 : anyV.dataset) === null || _b === void 0 ? void 0 : _b.prevStyle;
                if (prev != null)
                    remoteVideo.setAttribute('style', prev);
                else
                    remoteVideo.removeAttribute('style');
                if (anyV === null || anyV === void 0 ? void 0 : anyV.dataset)
                    anyV.dataset.prevStyle = '';
            }
        }
        catch { }
    }
    function getInitials(name) {
        var _a, _b, _c;
        const s = (name || '').trim();
        if (!s)
            return 'U';
        const parts = s.split(/\s+/).filter(Boolean);
        const a = ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a[0]) || '';
        const b = (((_b = parts[1]) === null || _b === void 0 ? void 0 : _b[0]) || (((_c = parts[0]) === null || _c === void 0 ? void 0 : _c[1]) || ''));
        return (a + b).toUpperCase();
    }
    function refreshAvatars() {
        var _a, _b;
        try {
            const ov = document.getElementById('call-overlay');
            if (!ov)
                return;
            const localAv = ov.querySelector('.local-avatar');
            const remoteAv = ov.querySelector('.remote-avatar');
            // Local: prefer the video element's bound stream if present
            const lvStream = (localVideo === null || localVideo === void 0 ? void 0 : localVideo.srcObject) || localStream || null;
            const lTrack = (_a = lvStream === null || lvStream === void 0 ? void 0 : lvStream.getVideoTracks()) === null || _a === void 0 ? void 0 : _a[0];
            // For local, use explicit track.enabled so if user disables camera, we show avatar even if last frame remains.
            const localActive = !!(lTrack && lTrack.readyState === 'live' && lTrack.enabled);
            if (localAv)
                localAv.style.display = localActive ? 'none' : '';
            // Remote: prefer the video element's bound stream if present
            const rvStream = (remoteVideo === null || remoteVideo === void 0 ? void 0 : remoteVideo.srcObject) || remoteRenderStream || null;
            const remoteHasFrames = !!(remoteVideo && remoteVideo.videoWidth > 0 && remoteVideo.videoHeight > 0);
            const remoteActive = !!(remoteHasFrames || ((_b = rvStream === null || rvStream === void 0 ? void 0 : rvStream.getVideoTracks()) === null || _b === void 0 ? void 0 : _b.some(t => t.readyState === 'live' && (t.enabled !== false))));
            if (remoteAv)
                remoteAv.style.display = remoteActive ? 'none' : '';
        }
        catch { }
    }
    function wireVideoEvents() {
        try {
            if (localVideo && !localVideo._wiredAvatar) {
                localVideo._wiredAvatar = true;
                localVideo.addEventListener('loadedmetadata', refreshAvatars);
                localVideo.addEventListener('resize', refreshAvatars);
                localVideo.addEventListener('playing', refreshAvatars);
            }
            if (remoteVideo && !remoteVideo._wiredAvatar) {
                remoteVideo._wiredAvatar = true;
                remoteVideo.addEventListener('loadedmetadata', refreshAvatars);
                remoteVideo.addEventListener('resize', refreshAvatars);
                remoteVideo.addEventListener('playing', refreshAvatars);
            }
        }
        catch { }
    }
    function moveVideosToOverlay() {
        const ov = ensureCallOverlay();
        const hostR = ov.querySelector('#co-remote-host');
        const hostL = ov.querySelector('#co-local-host');
        const area = document.getElementById('video-area');
        if (!hostR || !hostL || !area)
            return;
        coOriginalVideoParent = area;
        try {
            hostR.appendChild(document.getElementById('webrtc-remote-video'));
        }
        catch { }
        try {
            hostL.appendChild(document.getElementById('webrtc-local-video'));
        }
        catch { }
        styleOverlayVideos();
        refreshAvatars();
    }
    function restoreVideosFromOverlay() {
        try {
            const vLocal = document.getElementById('webrtc-local-video');
            const vRemote = document.getElementById('webrtc-remote-video');
            if (coOriginalVideoParent && vLocal && vRemote) {
                coOriginalVideoParent.appendChild(vLocal);
                coOriginalVideoParent.appendChild(vRemote);
            }
            restoreVideoStyles();
        }
        catch { }
    }
    function showCallOverlay(kind, meName, remoteName) {
        const ov = ensureCallOverlay();
        ov.style.display = '';
        const v = ov.querySelector('#co-video');
        const a = ov.querySelector('#co-audio');
        const camBtn = ov.querySelector('#co-cam');
        if (v && a) {
            if (kind === 'video') {
                v.style.display = 'grid';
                a.style.display = 'none';
                if (camBtn)
                    camBtn.style.display = '';
                moveVideosToOverlay();
            }
            else {
                v.style.display = 'none';
                a.style.display = 'grid';
                if (camBtn)
                    camBtn.style.display = 'none';
            }
        }
        try {
            const me = ov.querySelector('.name-me');
            if (me && meName)
                me.textContent = meName;
            const rn = ov.querySelector('.name-remote');
            if (rn && remoteName)
                rn.textContent = remoteName;
            const localAv = ov.querySelector('.local-avatar div');
            const remoteAv = ov.querySelector('.remote-avatar div');
            if (localAv)
                localAv.textContent = getInitials(meName || 'You');
            if (remoteAv)
                remoteAv.textContent = getInitials(remoteName || 'Remote');
        }
        catch { }
        refreshAvatars();
    }
    function hideCallOverlay() { const ov = document.getElementById('call-overlay'); if (ov)
        ov.style.display = 'none'; restoreVideosFromOverlay(); }
    function init() {
        ensureCallsPanel();
        // ensureCallsButton();
        ensureIncomingOverlay();
        ensureCallOverlay();
        // Note: input/btns removed; calls are now triggered from friends panel via global functions
        const overlay = ensureIncomingOverlay();
        const oTxt = overlay.querySelector('.txt');
        const oAccept = overlay.querySelector('.accept');
        const oDecline = overlay.querySelector('.decline');
        const oPerm = overlay.querySelector('.perm');
        const oGrant = overlay.querySelector('.grant');
        const oPstat = overlay.querySelector('.pstat');
        const oVonly = overlay.querySelector('.vonly');
        const active = document.getElementById('active-call');
        const muteBtn = active === null || active === void 0 ? void 0 : active.querySelector('.mute');
        const hangBtn = active === null || active === void 0 ? void 0 : active.querySelector('.hangup');
        const statsBtn = active === null || active === void 0 ? void 0 : active.querySelector('.toggle-stats');
        const statsBox = document.getElementById('call-stats');
        // prepare media renderers
        remoteAudio = document.getElementById('webrtc-remote');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'webrtc-remote';
            remoteAudio.autoplay = true;
            try {
                remoteAudio.setAttribute('playsinline', 'true');
            }
            catch { }
            document.body.appendChild(remoteAudio);
        }
        localVideo = document.getElementById('webrtc-local-video');
        remoteVideo = document.getElementById('webrtc-remote-video');
        try {
            if (localVideo) {
                localVideo.muted = true;
                localVideo.playsInline = true;
            }
        }
        catch { }
        try {
            if (remoteVideo) {
                remoteVideo.muted = true;
                remoteVideo.playsInline = true;
            }
        }
        catch { }
        // Wire mute/hang buttons here to guarantee actions
        if (muteBtn) {
            muteBtn.onclick = () => {
                try {
                    const track = localStream === null || localStream === void 0 ? void 0 : localStream.getAudioTracks()[0];
                    if (track) {
                        const enabled = !!track.enabled;
                        track.enabled = !enabled;
                        muteBtn.textContent = enabled ? 'Unmute' : 'Mute';
                    }
                }
                catch { }
            };
        }
        if (hangBtn) {
            hangBtn.onclick = () => {
                const id = currentCallId;
                if (id) {
                    try {
                        w.socket.emit('callHangup', { callId: id }, (res) => {
                            if (!(res === null || res === void 0 ? void 0 : res.success))
                                log(`callHangup failed: ${(res === null || res === void 0 ? void 0 : res.error) || 'error'}`);
                        });
                    }
                    catch { }
                }
                endCall();
            };
        }
        if (statsBtn) {
            statsBtn.onclick = () => {
                if (!statsInterval)
                    startStats();
                else
                    stopStats();
            };
        }
        // Removed autoplay gate overlay; rely on permissions already granted.
        const ensureIce = async () => {
            if (iceServers)
                return iceServers;
            try {
                const cfg = await new Promise((resolve) => {
                    w.socket.emit('getTurnConfig', {}, (res) => resolve(res));
                });
                if ((cfg === null || cfg === void 0 ? void 0 : cfg.success) && Array.isArray(cfg.iceServers))
                    iceServers = cfg.iceServers;
                else
                    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
            }
            catch {
                iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
            }
            return iceServers;
        };
        async function ensurePc() {
            if (pc)
                return pc;
            const servers = await ensureIce();
            pc = new RTCPeerConnection({ iceServers: servers });
            pc.onicecandidate = (ev) => {
                if (ev.candidate && currentCallId) {
                    try {
                        w.socket.emit('callIceCandidate', { callId: currentCallId, candidate: JSON.stringify(ev.candidate) });
                    }
                    catch { }
                }
            };
            pc.ontrack = async (ev) => {
                var _a, _b;
                try {
                    const [stream] = ev.streams;
                    if (!stream)
                        return;
                    const localTrackIds = new Set(((localStream === null || localStream === void 0 ? void 0 : localStream.getTracks()) || []).map(t => t.id));
                    const isSelfTrack = localTrackIds.has(((_a = ev.track) === null || _a === void 0 ? void 0 : _a.id) || '');
                    log(`ontrack kind=${(_b = ev.track) === null || _b === void 0 ? void 0 : _b.kind} stream.id=${stream === null || stream === void 0 ? void 0 : stream.id} self=${isSelfTrack}`);
                    if (isSelfTrack)
                        return; // prevent rendering our own capture
                    if (!remoteRenderStream)
                        remoteRenderStream = new MediaStream();
                    // Avoid adding duplicates
                    const already = remoteRenderStream.getTracks().some(t => t.id === ev.track.id);
                    if (!already)
                        remoteRenderStream.addTrack(ev.track);
                    try {
                        // Keep avatar visibility in sync with remote video status
                        ev.track.addEventListener('ended', refreshAvatars);
                        ev.track.addEventListener('mute', refreshAvatars);
                        ev.track.addEventListener('unmute', refreshAvatars);
                    }
                    catch { }
                    if (remoteAudio) {
                        remoteAudio.srcObject = remoteRenderStream;
                        try {
                            await remoteAudio.play();
                        }
                        catch { }
                    }
                    if (remoteVideo && requestedMedia === 'video') {
                        try {
                            remoteVideo.srcObject = remoteRenderStream;
                        }
                        catch { }
                        try {
                            remoteVideo.muted = true;
                            remoteVideo.playsInline = true;
                        }
                        catch { }
                        const area = document.getElementById('video-area');
                        if (area)
                            area.style.display = '';
                        try {
                            await remoteVideo.play();
                        }
                        catch { }
                    }
                    refreshAvatars();
                    wireVideoEvents();
                }
                catch { }
            };
            pc.onconnectionstatechange = () => log(`pc state: ${pc === null || pc === void 0 ? void 0 : pc.connectionState}`);
            // Note: We avoid manual addTransceiver to prevent duplicate m-lines.
            // addTrack will create the needed transceivers.
            return pc;
        }
        async function getLocalMedia(kind) {
            var _a, _b;
            if (localStream)
                return localStream;
            try {
                if (kind === 'video') {
                    localStream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                    });
                }
                else {
                    localStream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    });
                }
                // bind local preview if video
                if (kind === 'video' && localVideo && localStream) {
                    try {
                        localVideo.srcObject = localStream;
                    }
                    catch { }
                    try {
                        localVideo.muted = true;
                        localVideo.playsInline = true;
                    }
                    catch { }
                    const area = document.getElementById('video-area');
                    if (area)
                        area.style.display = '';
                    try {
                        await localVideo.play();
                    }
                    catch { }
                }
                refreshAvatars();
                wireVideoEvents();
            }
            catch (e) {
                const msg = (e === null || e === void 0 ? void 0 : e.message) || String(e);
                log(`getUserMedia error: ${msg}`);
                (_b = (_a = window.console) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'getUserMedia error', e);
                localStream = null;
            }
            return localStream;
        }
        function showActive(show) { if (active)
            active.style.display = show ? '' : 'none'; }
        function showStats(show) { if (statsBox)
            statsBox.style.display = show ? '' : 'none'; }
        async function sampleStats() {
            try {
                if (!pc)
                    return;
                const report = await pc.getStats();
                let rtt = 0;
                let lossA = 0;
                let lossV = 0;
                let jitterA = 0;
                let jitterV = 0;
                let bytesRecvA = 0;
                let bytesRecvV = 0;
                let bytesSentA = 0;
                let bytesSentV = 0;
                let fps = 0;
                let w = 0;
                let h = 0;
                let now = Date.now();
                report.forEach((s) => {
                    if (s.type === 'candidate-pair' && s.nominated) {
                        rtt = Math.round((s.currentRoundTripTime || s.totalRoundTripTime || 0) * 1000);
                    }
                    if (s.type === 'inbound-rtp') {
                        if (s.kind === 'audio') {
                            lossA = s.packetsLost || 0;
                            jitterA = Math.round((s.jitter || 0) * 1000);
                            bytesRecvA = s.bytesReceived || 0;
                        }
                        if (s.kind === 'video') {
                            lossV = s.packetsLost || 0;
                            jitterV = Math.round((s.jitter || 0) * 1000);
                            bytesRecvV = s.bytesReceived || 0;
                            fps = s.framesPerSecond || fps;
                            w = s.frameWidth || w;
                            h = s.frameHeight || h;
                        }
                    }
                    if (s.type === 'outbound-rtp') {
                        if (s.kind === 'audio') {
                            bytesSentA = s.bytesSent || 0;
                        }
                        if (s.kind === 'video') {
                            bytesSentV = s.bytesSent || 0;
                        }
                    }
                });
                const dt = Math.max(1, now - (lastBytes.t || now));
                const brRecvA = lastBytes.aRecv != null ? Math.round(((bytesRecvA - (lastBytes.aRecv || 0)) * 8) / dt) : 0;
                const brRecvV = lastBytes.vRecv != null ? Math.round(((bytesRecvV - (lastBytes.vRecv || 0)) * 8) / dt) : 0;
                const brSendA = lastBytes.aSend != null ? Math.round(((bytesSentA - (lastBytes.aSend || 0)) * 8) / dt) : 0;
                const brSendV = lastBytes.vSend != null ? Math.round(((bytesSentV - (lastBytes.vSend || 0)) * 8) / dt) : 0;
                lastBytes = { aRecv: bytesRecvA, vRecv: bytesRecvV, aSend: bytesSentA, vSend: bytesSentV, t: now };
                const qScore = (() => {
                    // Simple heuristic based on rtt, loss, and recv bitrate
                    const lossPct = Math.min(100, ((lossA + lossV) / 200) * 100); // scale approx
                    const r = rtt;
                    const br = brRecvA + brRecvV;
                    if (r < 80 && lossPct < 1 && br > 400)
                        return 'Excellent';
                    if (r < 150 && lossPct < 3 && br > 200)
                        return 'Good';
                    if (r < 300 && lossPct < 8)
                        return 'Fair';
                    return 'Poor';
                })();
                if (statsBox) {
                    const q = statsBox.querySelector('.quality');
                    const r = statsBox.querySelector('.rtt');
                    const l = statsBox.querySelector('.loss');
                    const brR = statsBox.querySelector('.br-recv');
                    const brS = statsBox.querySelector('.br-send');
                    const j = statsBox.querySelector('.jitter');
                    const fr = statsBox.querySelector('.fps-res');
                    if (q)
                        q.textContent = qScore;
                    if (r)
                        r.textContent = `${rtt} ms`;
                    if (l)
                        l.textContent = `${lossA}/${lossV}`;
                    if (brR)
                        brR.textContent = `${brRecvA} + ${brRecvV} kbps`;
                    if (brS)
                        brS.textContent = `${brSendA} + ${brSendV} kbps`;
                    if (j)
                        j.textContent = `${jitterA}/${jitterV} ms`;
                    if (fr)
                        fr.textContent = fps ? `${fps} fps ${w}x${h}` : '-';
                }
            }
            catch { }
        }
        function startStats() {
            if (statsInterval)
                return;
            lastBytes = {};
            statsInterval = window.setInterval(sampleStats, 1000);
            showStats(true);
        }
        function stopStats() {
            if (statsInterval) {
                window.clearInterval(statsInterval);
                statsInterval = null;
            }
            showStats(false);
        }
        // Buttons removed; expose helpers for friends panel
        async function startCall(target, media) {
            if (!target) {
                log('Target userId is required');
                return;
            }
            requestedMedia = media;
            // Enforce permissions before sending request
            const ok = await ensurePermissions(media);
            if (!ok) {
                log('Permissions not granted');
                return;
            }
            try {
                w.socket.emit('callRequest', { targetUserId: target, media }, async (res) => {
                    if (res === null || res === void 0 ? void 0 : res.success) {
                        currentCallId = String(res.callId);
                        log(`Outgoing call (${media}) -> callId=${currentCallId}`);
                        await getLocalMedia(media);
                        await ensurePc();
                        if (!addedTracks && localStream) {
                            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                            addedTracks = true;
                        }
                    }
                    else
                        log(`callRequest failed: ${(res === null || res === void 0 ? void 0 : res.error) || 'error'}`);
                });
            }
            catch { }
        }
        window.startCallAudio = (userId) => startCall(userId, 'audio');
        window.startCallVideo = (userId) => startCall(userId, 'video');
        function haveLocal(kind) {
            var _a, _b;
            const hasAudio = !!((_a = localStream === null || localStream === void 0 ? void 0 : localStream.getAudioTracks()) === null || _a === void 0 ? void 0 : _a.some(t => t.readyState !== 'ended'));
            const hasVideo = !!((_b = localStream === null || localStream === void 0 ? void 0 : localStream.getVideoTracks()) === null || _b === void 0 ? void 0 : _b.some(t => t.readyState !== 'ended'));
            return kind === 'audio' ? hasAudio : (hasAudio && hasVideo);
        }
        async function ensurePermissions(kind) {
            try {
                if (haveLocal(kind)) {
                    permissionsReady = true;
                    return true;
                }
                await getLocalMedia(kind);
                permissionsReady = haveLocal(kind);
                updatePermUI();
                return permissionsReady;
            }
            catch {
                permissionsReady = false;
                updatePermUI();
                return false;
            }
        }
        function updatePermUI() {
            if (!oPerm)
                return;
            if (permissionsReady) {
                if (oPstat) {
                    oPstat.textContent = 'OK';
                    oPstat.style.color = '#10b981';
                }
                if (oAccept) {
                    oAccept.disabled = false;
                    oAccept.style.cursor = 'pointer';
                    oAccept.style.opacity = '1';
                }
            }
            else {
                if (oPstat) {
                    oPstat.textContent = 'En attente…';
                    oPstat.style.color = '#ef4444';
                }
                if (oAccept) {
                    oAccept.disabled = true;
                    oAccept.style.cursor = 'not-allowed';
                    oAccept.style.opacity = '0.7';
                }
            }
        }
        // Incoming ring
        try {
            w.socket.on('callIncoming', (p) => {
                var _a, _b, _c, _d;
                log(`Incoming call from ${((_a = p === null || p === void 0 ? void 0 : p.fromUser) === null || _a === void 0 ? void 0 : _a.name) || ((_b = p === null || p === void 0 ? void 0 : p.fromUser) === null || _b === void 0 ? void 0 : _b.id) || '?'} (media=${p === null || p === void 0 ? void 0 : p.media}) callId=${p === null || p === void 0 ? void 0 : p.callId}`);
                requestedMedia = ((p === null || p === void 0 ? void 0 : p.media) === 'video') ? 'video' : 'audio';
                // Overlay (centered)
                if (overlay && oTxt && oAccept && oDecline) {
                    oTxt.textContent = `Appel entrant de ${((_c = p === null || p === void 0 ? void 0 : p.fromUser) === null || _c === void 0 ? void 0 : _c.name) || ((_d = p === null || p === void 0 ? void 0 : p.fromUser) === null || _d === void 0 ? void 0 : _d.id) || '?'} (${p === null || p === void 0 ? void 0 : p.media})`;
                    overlay.style.display = 'flex';
                    if (oVonly)
                        oVonly.style.display = (requestedMedia === 'video') ? '' : 'none';
                    updatePermUI();
                    if (oGrant)
                        oGrant.onclick = async () => { await ensurePermissions(requestedMedia); };
                    oAccept.onclick = () => {
                        try {
                            w.socket.emit('callAccept', { callId: p.callId }, async (res) => {
                                var _a, _b, _c;
                                if (res === null || res === void 0 ? void 0 : res.success) {
                                    currentCallId = String(p.callId);
                                    log(`Accepted callId=${currentCallId}`);
                                    overlay.style.display = 'none';
                                    await getLocalMedia(requestedMedia);
                                    await ensurePc();
                                    // Defer adding tracks until after remote offer is set
                                    pendingAddLocal = true;
                                    showActive(false);
                                    const meName = String(((_a = w.currentUser) === null || _a === void 0 ? void 0 : _a.name) || 'You');
                                    const otherName = String(((_b = p === null || p === void 0 ? void 0 : p.fromUser) === null || _b === void 0 ? void 0 : _b.name) || ((_c = p === null || p === void 0 ? void 0 : p.fromUser) === null || _c === void 0 ? void 0 : _c.id) || 'Remote');
                                    showCallOverlay(requestedMedia, meName, otherName);
                                    startStats();
                                }
                                else
                                    log(`callAccept failed: ${(res === null || res === void 0 ? void 0 : res.error) || 'error'}`);
                            });
                        }
                        catch { }
                    };
                    oDecline.onclick = () => {
                        try {
                            w.socket.emit('callDecline', { callId: p.callId, reason: 'declined' }, (res) => {
                                if (res === null || res === void 0 ? void 0 : res.success)
                                    log(`Declined callId=${p.callId}`);
                                else
                                    log(`callDecline failed: ${(res === null || res === void 0 ? void 0 : res.error) || 'error'}`);
                                overlay.style.display = 'none';
                            });
                        }
                        catch { }
                    };
                }
            });
        }
        catch { }
        // Other events
        try {
            w.socket.on('callAccepted', async (p) => {
                var _a, _b, _c;
                log(`callAccepted callId=${p === null || p === void 0 ? void 0 : p.callId}`);
                if (!currentCallId)
                    currentCallId = String((p === null || p === void 0 ? void 0 : p.callId) || '');
                // Caller creates offer and sends
                try {
                    // As caller, we can start stats now
                    startStats();
                    await getLocalMedia(requestedMedia);
                    await ensurePc();
                    if (!addedTracks && localStream) {
                        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                        addedTracks = true;
                    }
                    if (pc.signalingState !== 'stable') {
                        log(`offer skipped: signalingState=${pc.signalingState}`);
                        return;
                    }
                    log(`creating offer; senders=${pc.getSenders().length}, transceivers=${pc.getTransceivers().length}`);
                    makingOffer = true;
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    w.socket.emit('callOffer', { callId: currentCallId, sdp: JSON.stringify(offer) });
                    showActive(false);
                    const meName = String(((_a = w.currentUser) === null || _a === void 0 ? void 0 : _a.name) || 'You');
                    showCallOverlay(requestedMedia, meName, 'Remote');
                }
                catch (e) {
                    const msg = (e === null || e === void 0 ? void 0 : e.message) || String(e);
                    log(`offer error: ${msg}`);
                    try {
                        log(`state pc=${pc === null || pc === void 0 ? void 0 : pc.signalingState} conn=${pc === null || pc === void 0 ? void 0 : pc.connectionState}`);
                    }
                    catch { }
                    (_c = (_b = window.console) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.call(_b, 'offer error', e);
                }
                finally {
                    makingOffer = false;
                }
            });
        }
        catch { }
        try {
            w.socket.on('callOffer', async (p) => {
                var _a, _b;
                log(`callOffer ${p === null || p === void 0 ? void 0 : p.callId}`);
                if (!currentCallId)
                    currentCallId = String((p === null || p === void 0 ? void 0 : p.callId) || '');
                try {
                    await ensurePc();
                    const offer = JSON.parse((p === null || p === void 0 ? void 0 : p.sdp) || '{}');
                    await pc.setRemoteDescription(offer);
                    // If we deferred local tracks (callee), add them just before creating answer
                    if (pendingAddLocal && localStream && !addedTracks) {
                        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                        addedTracks = true;
                        pendingAddLocal = false;
                    }
                    // Callee creates answer and sends
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    w.socket.emit('callAnswer', { callId: currentCallId, sdp: JSON.stringify(answer) });
                }
                catch (e) {
                    const msg = (e === null || e === void 0 ? void 0 : e.message) || String(e);
                    log(`answer error: ${msg}`);
                    (_b = (_a = window.console) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'answer error', e);
                }
            });
        }
        catch { }
        try {
            w.socket.on('callAnswer', async (p) => {
                log(`callAnswer ${p === null || p === void 0 ? void 0 : p.callId}`);
                try {
                    const desc = JSON.parse((p === null || p === void 0 ? void 0 : p.sdp) || '{}');
                    await (pc === null || pc === void 0 ? void 0 : pc.setRemoteDescription(desc));
                    // ensure playback if remote arrived first
                    try {
                        await (remoteAudio === null || remoteAudio === void 0 ? void 0 : remoteAudio.play());
                    }
                    catch {
                        if (audioGate)
                            audioGate.style.display = '';
                    }
                }
                catch { }
            });
        }
        catch { }
        try {
            w.socket.on('callIceCandidate', async (p) => {
                log(`callIceCandidate ${p === null || p === void 0 ? void 0 : p.callId}`);
                try {
                    const cand = JSON.parse((p === null || p === void 0 ? void 0 : p.candidate) || '{}');
                    await (pc === null || pc === void 0 ? void 0 : pc.addIceCandidate(cand));
                }
                catch { }
            });
        }
        catch { }
        try {
            w.socket.on('callEnded', (p) => {
                log(`callEnded ${p === null || p === void 0 ? void 0 : p.callId}`);
                endCall();
            });
        }
        catch { }
        // Decline/Busy/Cancel handling
        try {
            w.socket.on('callDeclined', (p) => {
                const reason = (p === null || p === void 0 ? void 0 : p.reason) || 'declined';
                log(`callDeclined callId=${p === null || p === void 0 ? void 0 : p.callId} reason=${reason}`);
                // Clean up UI for current pending/active call
                endCall();
            });
        }
        catch { }
        try {
            w.socket.on('callBusy', (p) => {
                log(`callBusy targetUserId=${(p === null || p === void 0 ? void 0 : p.targetUserId) || '?'} — user is already in a call`);
                // If we were attempting to ring, reset our state
                endCall();
            });
        }
        catch { }
        try {
            w.socket.on('callCanceled', (p) => {
                log(`callCanceled callId=${p === null || p === void 0 ? void 0 : p.callId}`);
                endCall();
            });
        }
        catch { }
    }
    // Expose minimal helpers for dev
    window.callCancel = function (callId) {
        try {
            w.socket.emit('callCancel', { callId }, (res) => log((res === null || res === void 0 ? void 0 : res.success) ? `Canceled callId=${callId}` : `callCancel failed: ${(res === null || res === void 0 ? void 0 : res.error) || 'error'}`));
        }
        catch { }
    };
    function endCall() {
        try {
            if (pc) {
                pc.onicecandidate = null;
                pc.ontrack = null;
                pc.close();
            }
        }
        catch { }
        pc = null;
        try {
            localStream === null || localStream === void 0 ? void 0 : localStream.getTracks().forEach(t => t.stop());
        }
        catch { }
        localStream = null;
        if (remoteAudio)
            remoteAudio.srcObject = null;
        if (localVideo)
            localVideo.srcObject = null;
        if (remoteVideo)
            remoteVideo.srcObject = null;
        remoteRenderStream = null;
        const area = document.getElementById('video-area');
        if (area)
            area.style.display = 'none';
        currentCallId = null;
        addedTracks = false;
        makingOffer = false;
        const active = document.getElementById('active-call');
        if (active)
            active.style.display = 'none';
        hideCallOverlay();
        // Persist last QA summary
        try {
            if (agg && agg.cnt > 0) {
                const avgRtt = Math.round(agg.sumRtt / agg.cnt);
                const avgLoss = +(agg.sumLoss / agg.cnt).toFixed(2);
                const avgBrRecv = Math.round(agg.sumBrRecv / agg.cnt);
                const avgBrSend = Math.round(agg.sumBrSend / agg.cnt);
                const duration = Math.max(0, Math.round((Date.now() - agg.start) / 1000));
                const summary = { ts: Date.now(), duration, avgRtt, avgLoss, avgBrRecv, avgBrSend, quality: agg.lastQuality };
                const key = 'qa_call_summaries';
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                arr.push(summary);
                while (arr.length > 20)
                    arr.shift();
                localStorage.setItem(key, JSON.stringify(arr));
            }
        }
        catch { }
        stopStats();
    }
    // UI controls
    (function wireControls() {
        const active = document.getElementById('active-call');
        const muteBtn = active === null || active === void 0 ? void 0 : active.querySelector('.mute');
        const hangBtn = active === null || active === void 0 ? void 0 : active.querySelector('.hangup');
        // Overlay controls
        const ov = ensureCallOverlay();
        const oMute = ov.querySelector('#co-mute');
        const oCam = ov.querySelector('#co-cam');
        const oHang = ov.querySelector('#co-hang');
        if (muteBtn)
            muteBtn.onclick = () => {
                var _a;
                try {
                    const enabled = !!((_a = localStream === null || localStream === void 0 ? void 0 : localStream.getAudioTracks()[0]) === null || _a === void 0 ? void 0 : _a.enabled);
                    if (localStream === null || localStream === void 0 ? void 0 : localStream.getAudioTracks()[0])
                        localStream.getAudioTracks()[0].enabled = !enabled;
                    muteBtn.textContent = enabled ? 'Unmute' : 'Mute';
                }
                catch { }
            };
        if (hangBtn)
            hangBtn.onclick = () => { endCall(); };
        if (oMute)
            oMute.onclick = () => {
                try {
                    const track = localStream === null || localStream === void 0 ? void 0 : localStream.getAudioTracks()[0];
                    if (track) {
                        const en = !!track.enabled;
                        track.enabled = !en;
                        oMute.textContent = en ? 'Unmute' : 'Mute';
                    }
                }
                catch { }
            };
        if (oCam)
            oCam.onclick = () => {
                try {
                    const track = localStream === null || localStream === void 0 ? void 0 : localStream.getVideoTracks()[0];
                    if (track) {
                        const en = !!track.enabled;
                        track.enabled = !en;
                        oCam.textContent = en ? 'Camera On' : 'Camera Off';
                    }
                }
                catch { }
                refreshAvatars();
            };
        if (oHang)
            oHang.onclick = () => {
                const id = currentCallId;
                if (id) {
                    try {
                        w.socket.emit('callHangup', { callId: id }, (_res) => { });
                    }
                    catch { }
                }
                endCall();
            };
    })();
    // Initialize on load (after socket availability)
    function waitSocket(attempt = 0) {
        if (window.socket) {
            init();
            return;
        }
        if (attempt > 20)
            return;
        setTimeout(() => waitSocket(attempt + 1), 500);
    }
    waitSocket();
})();
var _a, _b, _c, _d, _e;
// Utilities are now provided by core.ts (ensureTheme, debounce, getCookie, formatRelative)
try {
    ensureTheme();
}
catch { }
// Apply modern theme overrides for the test UI (provided by theme.ts)
try {
    (_b = (_a = window).applyModernTheme) === null || _b === void 0 ? void 0 : _b.call(_a);
    (_d = (_c = window).installThemeToggle) === null || _d === void 0 ? void 0 : _d.call(_c);
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
    (_e = selectedRoomTitle === null || selectedRoomTitle === void 0 ? void 0 : selectedRoomTitle.parentElement) === null || _e === void 0 ? void 0 : _e.insertBefore(typingBanner, selectedRoomTitle.nextSibling);
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
        var _a, _b;
        try {
            window.selectedRoom = null;
            chatWindow.innerHTML = "";
            setTypingBanner("");
            // Hide realtime stats panel if present
            try {
                (_b = (_a = window).statsOnRoomClosed) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
            catch { }
            if (dmPresenceInterval) {
                window.clearInterval(dmPresenceInterval);
                dmPresenceInterval = null;
            }
            syncLayoutVisibility();
        }
        catch { }
    });
}
// Aggregated typing count for current room
// typingCount handled in sockets.ts
// roomOnline handled in sockets.ts
// Gestion logout (WebSocket uniquement)
if (logoutBtn) {
    logoutBtn.onclick = function () {
        console.log("Logout requested");
        console.log("token", getToken("session_token"));
        socket.emit("logout", { token: getToken("session_token") }, (res) => {
            console.log("Logout response", res);
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
// updatePresenceLabel is defined in dom.ts and used here
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
/// <reference path="./invites.ts" />
/// <reference path="./sockets.ts" />
/// <reference path="./analytics.ts" />
/// <reference path="./calls.ts" />
/// <reference path="./chat-client.ts" />
// stats.ts - Client-side realtime stats panel (no external libs)
// Collects per-room metrics from incoming/outgoing events and renders sparklines
// in a panel under the room list. Global helpers are attached to window.
(function () {
    const w = window;
    const MAX_MINUTES = 60;
    const MAX_ONLINE_POINTS = 120; // ~2 minutes at 1s sampling or event-driven
    const buffersByRoom = Object.create(null);
    let currentRoomId = null;
    let renderTimer = null;
    function epochMinute(t = Date.now()) {
        return Math.floor(t / 60000);
    }
    function ensureBuffers(roomId) {
        const key = String(roomId || "");
        let b = buffersByRoom[key];
        if (!b) {
            b = buffersByRoom[key] = {
                msgPerMin: Array(MAX_MINUTES).fill(0),
                msgMinuteStamp: epochMinute(),
                online: [],
            };
        }
        // roll minutes if time advanced
        const nowMin = epochMinute();
        let diff = nowMin - b.msgMinuteStamp;
        while (diff > 0) {
            b.msgPerMin.shift();
            b.msgPerMin.push(0);
            b.msgMinuteStamp++;
            diff--;
        }
        return b;
    }
    function recordMessage(roomId) {
        const b = ensureBuffers(roomId);
        // increment current minute bucket
        b.msgPerMin[b.msgPerMin.length - 1]++;
        if (roomId === currentRoomId)
            scheduleRender();
    }
    function recordOnline(roomId, count) {
        const b = ensureBuffers(roomId);
        const now = Date.now();
        b.online.push({ ts: now, count: Math.max(0, Number(count) || 0) });
        if (b.online.length > MAX_ONLINE_POINTS)
            b.online.shift();
        if (roomId === currentRoomId)
            scheduleRender();
    }
    // ================= Panel & Rendering =================
    function ensureStatsPanel() {
        const side = document.getElementById("room-panel");
        if (!side)
            return null;
        let section = document.getElementById("stats-sidebar-panel");
        if (!section) {
            section = document.createElement("div");
            section.id = "stats-sidebar-panel";
            section.className = "room-section-card";
            section.style.marginTop = "12px";
            section.style.display = "none"; // hidden by default
            section.innerHTML = `
        <button type="button" class="room-section-header" disabled style="cursor: default">
          📈 Stats en temps réel (client)
        </button>
        <div style="padding:8px 10px;">
          <div style="font-size:12px;color:#666;margin-bottom:6px;" id="stats-room-label">Aucune room sélectionnée</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <div style="font-size:12px;color:#888;margin-bottom:4px">Messages par minute (60 dernières minutes)</div>
              <canvas id="stats-mpm" width="320" height="70" style="width:100%;max-width:100%"></canvas>
            </div>
            <div>
              <div style="font-size:12px;color:#888;margin-bottom:4px">Utilisateurs en ligne (derniers évènements)</div>
              <canvas id="stats-online" width="320" height="70" style="width:100%;max-width:100%"></canvas>
            </div>
          </div>
        </div>
      `;
            const roomListSection = document.getElementById("room-list-section");
            if (roomListSection === null || roomListSection === void 0 ? void 0 : roomListSection.parentElement) {
                roomListSection.parentElement.appendChild(section);
            }
            else {
                side.appendChild(section);
            }
        }
        return section;
    }
    function setPanelVisible(show) {
        const panel = ensureStatsPanel();
        if (panel)
            panel.style.display = show ? "" : "none";
    }
    function scheduleRender() {
        if (renderTimer != null)
            return;
        renderTimer = window.setTimeout(() => {
            renderTimer = null;
            try {
                render();
            }
            catch { }
        }, 150);
    }
    function drawSparkline(canvas, points, color) {
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        if (!points || points.length === 0)
            return;
        const max = Math.max(1, ...points);
        const stepX = W / Math.max(1, points.length - 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        points.forEach((v, i) => {
            const x = i * stepX;
            const y = H - (v / max) * (H - 4) - 2;
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        ctx.stroke();
        // baseline
        ctx.strokeStyle = "#e6e6e6";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - 1);
        ctx.lineTo(W, H - 1);
        ctx.stroke();
    }
    function render() {
        ensureStatsPanel();
        const label = document.getElementById("stats-room-label");
        const c1 = document.getElementById("stats-mpm");
        const c2 = document.getElementById("stats-online");
        if (!label || !c1 || !c2)
            return;
        const rid = currentRoomId;
        if (!rid) {
            setPanelVisible(false);
            label.textContent = "Aucune room sélectionnée";
            drawSparkline(c1, [], "#7f5af0");
            drawSparkline(c2, [], "#06d6a0");
            return;
        }
        setPanelVisible(true);
        const b = ensureBuffers(rid);
        label.textContent = `Room sélectionnée: ${rid}`;
        drawSparkline(c1, b.msgPerMin.slice(), "#7f5af0");
        drawSparkline(c2, b.online.map(o => o.count), "#06d6a0");
    }
    // ================= Wiring =================
    function onSelectRoom(room) {
        const rid = (room === null || room === void 0 ? void 0 : room.id) ? String(room.id) : null;
        currentRoomId = rid;
        ensureStatsPanel();
        setPanelVisible(!!rid);
        scheduleRender();
    }
    // Wrap joinRoom to detect selection changes
    try {
        const originalJoin = w.joinRoom;
        if (typeof originalJoin === "function") {
            w.joinRoom = function wrappedJoin(room) {
                originalJoin(room);
                try {
                    onSelectRoom(room);
                }
                catch { }
            };
        }
    }
    catch { }
    // Expose hooks for other modules
    try {
        w.statsOnMessage = (roomId) => recordMessage(roomId);
        w.statsOnOnline = (roomId, count) => recordOnline(roomId, count);
        w.statsOnRoomClosed = () => { currentRoomId = null; setPanelVisible(false); scheduleRender(); };
    }
    catch { }
    // Initial mount
    try {
        ensureStatsPanel();
        setPanelVisible(false);
        render();
    }
    catch { }
})();
// theme.ts - Injects a modern visual theme for the server test UI without modifying CSS files.
// This file will be bundled into chat-client.js via public/tsconfig.json (outFile) along with other TS files.
// It appends a <style> tag at the end of <head> to override existing styles.
(function initThemeGlobals() {
    try {
        window.applyModernTheme = applyModernTheme;
        window.installThemeToggle = installThemeToggle;
    }
    catch { }
})();
function applyModernTheme() {
    try {
        const id = "modern-theme-overrides";
        if (document.getElementById(id))
            return; // already installed
        // Restore saved theme preference before injecting styles
        try {
            const saved = localStorage.getItem('rt:theme');
            if (saved === 'dark' || saved === 'light') {
                document.documentElement.setAttribute('data-theme', saved);
            }
        }
        catch { }
        const css = `
      :root {
        --rt-primary: #6d5efc;
        --rt-primary-2: #b14bf4;
        --rt-bg: #f7f8fc;
        --rt-text: #1a1a1a;
        --rt-muted: #6b7280;
        --rt-card: #ffffff;
        --rt-border: rgba(25, 25, 50, 0.08);
        --rt-ring: rgba(109, 94, 252, .25);
      }
      :root[data-theme="dark"] {
        --rt-primary: #8b7bff;
        --rt-primary-2: #d16cff;
        --rt-bg: #0f1220;
        --rt-text: #e5e7eb;
        --rt-muted: #9ca3af;
        --rt-card: #15182a;
        --rt-border: rgba(255, 255, 255, 0.08);
        --rt-ring: rgba(209,108,255,.25);
      }
      /* Base */
      body#app {
        background: radial-gradient(1200px 600px at 10% -10%, #f0f5ff 0%, transparent 60%),
                    radial-gradient(900px 500px at 110% 0%, #fde7ff 0%, transparent 60%),
                    var(--rt-bg);
        color: var(--rt-text);
        min-height: 100dvh;
      }
      /* Header */
      .app-header {
        position: sticky; top: 0; z-index: 50;
        background: linear-gradient(90deg, #ffffffee 0%, #eef2ffcc 40%, #faf5ffcc 100%);
        backdrop-filter: saturate(1.6) blur(6px);
        border-bottom: 1px solid var(--rt-border);
      }
      :root[data-theme="dark"] .app-header { background: linear-gradient(90deg, #0f1220cc 0%, #121631cc 40%, #1b1030cc 100%); }
      .app-header__inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; max-width: 1100px; margin: 0 auto; }
      .brand { display:flex; align-items:center; gap:10px; font-weight: 700; letter-spacing:.3px; }
      .brand-logo { font-size: 20px; }
      .brand-name { font-size: 15px; color: #374151; }

      /* Cards & layout */
      .chat-root.layout { max-width: 1100px; margin: 18px auto; display:grid; grid-template-columns: 320px 1fr; gap: 14px; }
      .chat-root.layout.no-chat { grid-template-columns: 1fr; }
      .chat-card, .auth-card, .sidebar, .section-card, .room-section-card {
        background: var(--rt-card);
        border: 1px solid var(--rt-border);
        box-shadow: 0 8px 30px rgba(16,24,40,0.06);
        border-radius: 14px;
      }
      .sidebar { padding: 12px; }
      .chat-main { padding: 12px; }

      /* Buttons */
      .auth-btn, .chat-send-btn, .icon-btn, #logout-btn, #logout-all-btn, #attach-btn, .room-section-header {
        border-radius: 10px; border: 1px solid transparent; transition: all .17s ease; outline: none;
      }
      .auth-btn, .chat-send-btn, #logout-btn, #logout-all-btn {
        background: linear-gradient(90deg, var(--rt-primary) 0%, var(--rt-primary-2) 100%);
        color: #fff; box-shadow: 0 6px 16px rgba(109,94,252,.18);
      }
      .auth-btn:hover, .chat-send-btn:hover, #logout-btn:hover, #logout-all-btn:hover {
        transform: translateY(-1px); box-shadow: 0 10px 22px rgba(109,94,252,.22);
      }
      .icon-btn { background:#fff; border-color: var(--rt-border); padding: 6px 10px; }
      .icon-btn:hover { background: #f7f7ff; border-color: #e2e8ff; box-shadow: 0 4px 16px rgba(109,94,252,.12); }
      :root[data-theme="dark"] .icon-btn { background:#1b1e34; color:#e5e7eb; border-color: var(--rt-border); }
      :root[data-theme="dark"] .icon-btn:hover { background:#242846; border-color:#3a3f6a; box-shadow: 0 6px 18px rgba(0,0,0,.4); }

      /* Inputs */
      input[type="text"], input[type="password"] {
        background: #fafaff; border: 1px solid #e6e7ef; border-radius: 10px; padding: 10px 12px;
        transition: box-shadow .15s ease, border-color .15s ease;
      }
      input[type="text"]:focus, input[type="password"]:focus {
        border-color: #a7a4ff; box-shadow: 0 0 0 3px var(--rt-ring);
      }
      :root[data-theme="dark"] input[type="text"], :root[data-theme="dark"] input[type="password"] { background:#14172a; color:#e5e7eb; border-color:#2b3156; }
      :root[data-theme="dark"] input[type="text"]:focus, :root[data-theme="dark"] input[type="password"]:focus { border-color:#6f6cff; }

      /* Sidebar lists */
      .room-list { display:flex; flex-direction:column; gap: 8px; margin: 8px 0; padding: 0; }
      .room-list li, .friend-item { background: #fff; border:1px solid var(--rt-border); border-radius: 10px; padding: 10px 12px; display:flex; align-items:center; justify-content:space-between; gap: 8px; transition: box-shadow .15s ease, transform .06s ease; }
      .room-list li:hover, .friend-item:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(16,24,40,0.08); }
      .room-empty { color: var(--rt-muted); }

      /* Chat window */
      .chat-window { background: #fbfbff; border:1px solid var(--rt-border); border-radius: 12px; padding: 10px; height: 52vh; overflow:auto; }
      .message { background:#fff; border:1px solid var(--rt-border); border-radius: 12px; padding: 8px 10px; margin: 10px 4px; position: relative; box-shadow: 0 2px 8px rgba(16,24,40,0.04); }
      .message.mine { background: linear-gradient(180deg,#f7f5ff,#fff); border-color:#e6e1ff; }
      .msg-meta-row { display:flex; align-items:center; justify-content:space-between; font-size: 12px; color:#6b7280; margin-bottom: 4px; }
      .msg-author { font-weight: 600; color: #374151; }
      .msg-content { font-size: 14px; color: #1f2937; }
      .msg-status { position:absolute; right:8px; bottom: 8px; font-size: 11px; color:#8b5cf6; }
      :root[data-theme="dark"] .chat-window { background:#0f1220; border-color:#2b3156; }
      :root[data-theme="dark"] .message { background:#181b31; border-color:#2b3156; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
      :root[data-theme="dark"] .message.mine { background: linear-gradient(180deg,#1a1d36,#181b31); border-color:#3a3f6a; }
      :root[data-theme="dark"] .msg-author { color:#e5e7eb; }
      :root[data-theme="dark"] .msg-content { color:#e2e6f4; }

      /* Drawer */
      .room-drawer { position: fixed; inset: 0; display:none; }
      .room-drawer[aria-hidden="false"] { display:block; }
      .room-drawer__panel { position:absolute; right:0; top:0; height:100%; width:360px; max-width:92vw; background:#fff; border-left:1px solid var(--rt-border); box-shadow: -10px 0 30px rgba(16,24,40,0.06); padding: 14px; }
      .room-drawer__header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }

      /* Auth card tighten */
      .auth-card { padding-top: 26px; }
      .auth-card-title { letter-spacing: .2px; }

      /* Small improves */
      #typing-banner { color: var(--rt-muted); }
      #selected-room-title { color: #111827; font-weight: 700; }
      :root[data-theme="dark"] #selected-room-title { color:#f3f4f6; }

      /* Presence dot */
      .presence-dot { display:inline-block; width:8px; height:8px; border-radius:9999px; margin-right:6px; vertical-align:middle; }
      .presence-online { background:#22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.2); }
      .presence-offline { background:#9ca3af; }
    `;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }
    catch { }
}
// Optional: small helper to add a theme toggle button in header
function installThemeToggle() {
    try {
        const header = document.querySelector('.app-header__inner');
        if (!header)
            return;
        if (document.getElementById('rt-theme-toggle'))
            return;
        const btn = document.createElement('button');
        btn.id = 'rt-theme-toggle';
        btn.type = 'button';
        btn.textContent = 'Theme';
        btn.style.border = '1px solid var(--rt-border)';
        btn.style.borderRadius = '10px';
        btn.style.padding = '6px 10px';
        btn.style.background = '#fff';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all .15s ease';
        btn.onmouseenter = () => { btn.style.boxShadow = '0 6px 16px rgba(109,94,252,.12)'; };
        btn.onmouseleave = () => { btn.style.boxShadow = 'none'; };
        btn.onclick = () => {
            const root = document.documentElement;
            const current = root.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            root.setAttribute('data-theme', next);
            try {
                localStorage.setItem('rt:theme', next);
            }
            catch { }
        };
        header.appendChild(btn);
    }
    catch { }
}
// ui.ts - Enhanced UX for the server test UI, keeping it a great debugging playground
// No imports/exports. Bundled into chat-client.js via public/tsconfig.json (outFile)
(function () {
    const w = window;
    if (w.__ui_ts_initialized__)
        return; // idempotent
    w.__ui_ts_initialized__ = true;
    // ---------------- Style injection ----------------
    try {
        const id = 'rt-ui-overrides';
        if (!document.getElementById(id)) {
            const css = `
        /* Quick actions bar */
        #rt-quickbar { position: sticky; top: 54px; z-index: 40; display:flex; align-items:center; gap:8px; padding:8px 12px; max-width:1100px; margin: 6px auto; }
        .rt-chip { border:1px solid rgba(25,25,50,.08); background:#fff; color:#374151; border-radius:9999px; padding:6px 10px; font-size:12px; box-shadow:0 2px 10px rgba(16,24,40,.06); cursor:pointer; }
        .rt-chip:hover { box-shadow:0 6px 16px rgba(16,24,40,.08); transform: translateY(-1px); }
        .rt-chip.primary { background: linear-gradient(90deg, var(--rt-primary,#6d5efc), var(--rt-primary-2,#b14bf4)); color:#fff; border-color: transparent; }

        /* Debug dock */
        #rt-debug-dock { position: fixed; left: 12px; right: 12px; bottom: 10px; z-index: 60; background: #fff; border:1px solid rgba(25,25,50,.08); border-radius: 12px; box-shadow: 0 14px 40px rgba(16,24,40,.18); display:none; }
        #rt-debug-dock[data-open="true"] { display:block; }
        #rt-debug-head { display:flex; align-items:center; justify-content: space-between; padding:8px 10px; border-bottom:1px solid rgba(25,25,50,.08); }
        #rt-debug-tabs { display:flex; align-items:center; gap:6px; padding:6px 10px; border-bottom:1px solid rgba(25,25,50,.08); }
        .rt-tab { border:1px solid rgba(25,25,50,.08); border-radius: 8px; background:#fafaff; padding:6px 10px; font-size:12px; cursor:pointer; color:#374151; }
        .rt-tab[aria-selected="true"] { background:#fff; box-shadow: inset 0 0 0 2px rgba(109,94,252,.25); }
        #rt-debug-body { display:grid; grid-template-columns: 1fr 1fr; gap:10px; padding:10px; }
        .rt-panel { border:1px solid rgba(25,25,50,.08); border-radius: 8px; overflow:hidden; display:flex; flex-direction:column; }
        .rt-panel h4 { margin:0; padding:6px 10px; border-bottom:1px solid rgba(25,25,50,.08); font-size:12px; color:#6b7280; background:#fcfcff; }
        .rt-log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; padding:8px; max-height: 220px; overflow:auto; white-space: pre-wrap; }
        .rt-kv { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; padding:8px; }
        #rt-debug-foot { padding:8px 10px; display:flex; justify-content: flex-end; gap:8px; border-top:1px solid rgba(25,25,50,.08); }
        .rt-btn { border:1px solid rgba(25,25,50,.08); background:#fff; border-radius:8px; padding:6px 10px; font-size:12px; cursor:pointer; }
        .rt-btn.primary { background: linear-gradient(90deg, var(--rt-primary,#6d5efc), var(--rt-primary-2,#b14bf4)); color:#fff; border-color:transparent; }
        @media (max-width: 860px) { #rt-debug-body { grid-template-columns: 1fr; } #rt-quickbar { top: 48px; } }
      `;
            const style = document.createElement('style');
            style.id = id;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }
    catch { }
    // ---------------- Quick actions ----------------
    function ensureQuickbar() {
        try {
            if (document.getElementById('rt-quickbar'))
                return document.getElementById('rt-quickbar');
            const header = document.querySelector('.app-header');
            if (!header)
                return null;
            const bar = document.createElement('div');
            bar.id = 'rt-quickbar';
            bar.innerHTML = `
        <button class="rt-chip primary" id="rt-qb-refresh">Refresh Rooms</button>
        <button class="rt-chip" id="rt-qb-unread">Unread Only: Off</button>
        <button class="rt-chip" id="rt-qb-dock">Debug Dock</button>
      `;
            header.insertAdjacentElement('afterend', bar);
            // Wire actions
            const $ = (id) => document.getElementById(id);
            $('rt-qb-refresh').onclick = () => { var _a; try {
                (_a = w.socket) === null || _a === void 0 ? void 0 : _a.emit('getRooms');
            }
            catch { } };
            // Restore unread filter from storage
            try {
                w.__rt_unread_only = localStorage.getItem('rt:unreadOnly') === '1';
            }
            catch { }
            const unreadBtn = $('rt-qb-unread');
            if (unreadBtn)
                unreadBtn.textContent = `Unread Only: ${w.__rt_unread_only ? 'On' : 'Off'}`;
            $('rt-qb-unread').onclick = () => {
                var _a;
                try {
                    w.__rt_unread_only = !w.__rt_unread_only;
                    try {
                        localStorage.setItem('rt:unreadOnly', w.__rt_unread_only ? '1' : '0');
                    }
                    catch { }
                    const btn = $('rt-qb-unread');
                    if (btn)
                        btn.textContent = `Unread Only: ${w.__rt_unread_only ? 'On' : 'Off'}`;
                    (_a = w.renderRoomList) === null || _a === void 0 ? void 0 : _a.call(w);
                }
                catch { }
            };
            $('rt-qb-dock').onclick = () => toggleDock();
            return bar;
        }
        catch {
            return null;
        }
    }
    function toggleStatsPanel() {
        var _a;
        try {
            const el = document.getElementById('stats-sidebar-panel');
            if (!el) {
                (_a = w.showToast) === null || _a === void 0 ? void 0 : _a.call(w, 'Stats panel not mounted yet');
                return;
            }
            // flip based on current style
            const isVisible = el.style.display !== 'none';
            const nextVisible = !isVisible;
            el.style.display = nextVisible ? '' : 'none';
            try {
                localStorage.setItem('rt:statsVisible', nextVisible ? '1' : '0');
            }
            catch { }
        }
        catch { }
    }
    // ---------------- Debug dock ----------------
    function ensureDock() {
        let dock = document.getElementById('rt-debug-dock');
        if (dock)
            return dock;
        dock = document.createElement('div');
        dock.id = 'rt-debug-dock';
        dock.setAttribute('data-open', 'false');
        dock.innerHTML = `
      <div id="rt-debug-head">
        <div style="display:flex;align-items:center;gap:8px">
          <strong style="font-size:13px">Debug</strong>
          <span id="rt-debug-meta" style="font-size:12px;color:#6b7280"></span>
        </div>
        <div>
          <button class="rt-btn" id="rt-debug-clear">Clear</button>
          <button class="rt-btn primary" id="rt-debug-close">Close</button>
        </div>
      </div>
      <div id="rt-debug-tabs">
        <button class="rt-tab" data-tab="logs" aria-selected="true">Logs</button>
        <button class="rt-tab" data-tab="ws">WS</button>
        <button class="rt-tab" data-tab="rest">REST</button>
        <button class="rt-tab" data-tab="state">State</button>
      </div>
      <div id="rt-debug-body">
        <div class="rt-panel"><h4>Console</h4><div id="rt-log-console" class="rt-log"></div></div>
        <div class="rt-panel"><h4>WebSocket</h4><div id="rt-log-ws" class="rt-log"></div></div>
        <div class="rt-panel"><h4>REST</h4><div id="rt-log-rest" class="rt-log"></div></div>
        <div class="rt-panel"><h4>State</h4><div id="rt-log-state" class="rt-kv"></div></div>
        <div class="rt-panel" style="grid-column:1/-1"><h4>Details</h4><div id="rt-log-details" class="rt-log"></div><div style="padding:8px 10px;display:flex;justify-content:flex-end"><button class="rt-btn" id="rt-copy-details">Copy JSON</button></div></div>
      </div>
      <div id="rt-debug-foot">
        <button class="rt-btn" id="rt-state-refresh">Refresh State</button>
      </div>
    `;
        document.body.appendChild(dock);
        // Wiring
        const close = document.getElementById('rt-debug-close');
        const clear = document.getElementById('rt-debug-clear');
        close.onclick = () => toggleDock(false);
        clear.onclick = () => {
            ['rt-log-console', 'rt-log-ws', 'rt-log-rest'].forEach(id => { const el = document.getElementById(id); if (el)
                el.textContent = ''; });
        };
        const refresh = document.getElementById('rt-state-refresh');
        refresh.onclick = () => renderState();
        const copyDetails = document.getElementById('rt-copy-details');
        copyDetails.onclick = () => {
            var _a, _b, _c;
            try {
                const details = dock.__rt_details_json || '';
                (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
                (_c = (_b = window).showToast) === null || _c === void 0 ? void 0 : _c.call(_b, 'Details copied');
            }
            catch { }
        };
        // Tabs (presentational only for now)
        Array.from(dock.querySelectorAll('.rt-tab')).forEach(btn => {
            btn.addEventListener('click', () => {
                Array.from(dock.querySelectorAll('.rt-tab')).forEach(b => b.setAttribute('aria-selected', 'false'));
                btn.setAttribute('aria-selected', 'true');
            });
        });
        // Restore dock open state
        try {
            const open = localStorage.getItem('rt:dockOpen') === '1';
            dock.setAttribute('data-open', open ? 'true' : 'false');
            if (open)
                renderState();
        }
        catch { }
        return dock;
    }
    function toggleDock(force) {
        const el = ensureDock();
        const open = force != null ? !!force : el.getAttribute('data-open') !== 'true';
        el.setAttribute('data-open', open ? 'true' : 'false');
        if (open)
            renderState();
        try {
            localStorage.setItem('rt:dockOpen', open ? '1' : '0');
        }
        catch { }
    }
    // ---------------- Log helpers ----------------
    function setDetails(obj) {
        try {
            const dock = document.getElementById('rt-debug-dock');
            const el = document.getElementById('rt-log-details');
            if (!el || !dock)
                return;
            const json = typeof obj === 'string' ? obj : (() => { try {
                return JSON.stringify(obj, null, 2);
            }
            catch {
                return String(obj);
            } })();
            el.textContent = json;
            dock.__rt_details_json = json;
        }
        catch { }
    }
    function appendLogLine(id, msg, details) {
        try {
            const el = document.getElementById(id);
            if (!el)
                return;
            const line = document.createElement('div');
            line.textContent = msg;
            if (details !== undefined) {
                line.style.cursor = 'pointer';
                line.onclick = () => setDetails(details);
            }
            el.appendChild(line);
            el.scrollTop = el.scrollHeight;
        }
        catch { }
    }
    function fmt(obj) { try {
        return JSON.stringify(obj, null, 2);
    }
    catch {
        return String(obj);
    } }
    // Patch console.log to also mirror into console pane (non-invasive)
    try {
        const origLog = console.log.bind(console);
        console.log = (...args) => { try {
            appendLogLine('rt-log-console', args.map(a => typeof a === 'string' ? a : fmt(a)).join(' '));
        }
        catch { } ; origLog(...args); };
    }
    catch { }
    // Patch socket emits and on-listeners for tracing
    try {
        const s = w.socket;
        if (s && !s.__rt_patched) {
            s.__rt_patched = true;
            const origEmit = s.emit.bind(s);
            s.emit = (event, ...args) => {
                const t0 = performance.now();
                const maybeCb = args[args.length - 1];
                if (typeof maybeCb === 'function') {
                    const cb = args.pop();
                    args.push((res) => { appendLogLine('rt-log-ws', `→ ${event} ${fmt(args[0])} [${Math.round(performance.now() - t0)}ms]`, { direction: 'out', event, payload: args[0], cb: res }); try {
                        cb(res);
                    }
                    catch { } });
                }
                else {
                    appendLogLine('rt-log-ws', `→ ${event} ${fmt(args[0])}`, { direction: 'out', event, payload: args[0] });
                }
                return origEmit(event, ...args);
            };
            const origOn = s.on.bind(s);
            s.on = (name, handler) => {
                return origOn(name, (...a) => { try {
                    appendLogLine('rt-log-ws', `← ${name} ${fmt(a[0])}`, { direction: 'in', event: name, payload: a[0] });
                }
                catch { } ; try {
                    handler(...a);
                }
                catch { } });
            };
        }
    }
    catch { }
    // Patch fetch for REST tracing
    try {
        const origFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
            const input = args[0];
            const init = args[1] || {};
            const url = typeof input === 'string' ? input : ((input === null || input === void 0 ? void 0 : input.url) || '');
            const method = (init.method || 'GET').toUpperCase();
            const t0 = performance.now();
            try {
                const res = await origFetch(input, init);
                const ms = Math.round(performance.now() - t0);
                appendLogLine('rt-log-rest', `${method} ${url} – ${res.status} (${ms}ms)`, { method, url, status: res.status, req: init });
                return res;
            }
            catch (e) {
                const ms = Math.round(performance.now() - t0);
                appendLogLine('rt-log-rest', `${method} ${url} – FAILED (${ms}ms)`, { method, url, error: String(e) });
                throw e;
            }
        };
    }
    catch { }
    // ---------------- State renderer ----------------
    function renderState() {
        try {
            const el = document.getElementById('rt-log-state');
            if (!el)
                return;
            const state = {
                user: w.currentUser,
                selectedRoom: w.selectedRoom ? { id: w.selectedRoom.id, name: w.selectedRoom.name, type: w.selectedRoom.type } : null,
                rooms: Array.isArray(w.rooms) ? w.rooms.map((r) => ({ id: r.id, name: r.name, type: r.type, isPublic: r.isPublic })) : [],
                unreadCounts: w.unreadCounts,
            };
            el.textContent = fmt(state);
        }
        catch { }
    }
    // ---------------- Keyboard shortcuts ----------------
    try {
        window.addEventListener('keydown', (ev) => {
            var _a;
            if (ev.altKey || ev.ctrlKey || ev.metaKey)
                return;
            const k = ev.key.toLowerCase();
            if (k === 'd') {
                ev.preventDefault();
                toggleDock();
            }
            if (k === 'r') {
                ev.preventDefault();
                try {
                    (_a = w.socket) === null || _a === void 0 ? void 0 : _a.emit('getRooms');
                }
                catch { }
            }
            if (k === '/') {
                ev.preventDefault();
                const input = document.getElementById('user-search-input');
                input === null || input === void 0 ? void 0 : input.focus();
            }
            if (k === 's') {
                ev.preventDefault();
                toggleStatsPanel();
            }
        });
    }
    catch { }
    // Mount
    ensureQuickbar();
    // Restore persisted stats visibility after quickbar (panel is mounted by stats.ts)
    try {
        const wantStats = localStorage.getItem('rt:statsVisible') === '1';
        const el = document.getElementById('stats-sidebar-panel');
        if (el)
            el.style.display = wantStats ? '' : 'none';
    }
    catch { }
    // Ensure dock exists so keyboard toggle works and open state can be restored independently
    try {
        ensureDock();
    }
    catch { }
})();
