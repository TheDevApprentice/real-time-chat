// chat-client.ts
// Script extrait de index.html pour la logique front du chat en TypeScript
// Nécessite d'être compilé/transpilé en JS puis inclus dans index.html
// Socket is initialized in sockets.ts and exposed globally
declare var socket: any;

// Utilities are now provided by core.ts (ensureTheme, debounce, getCookie, formatRelative)
try {
  ensureTheme();
} catch {}

// Expose helpers for other modules
(window as any).setupDmPresence = setupDmPresence;
(window as any).fetchPresence = fetchPresence;

// Elements
const userActions = document.getElementById("user-actions") as HTMLElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const logoutAllBtn = document.getElementById(
  "logout-all-btn"
) as HTMLButtonElement;
const authPanel = document.getElementById("auth-panel") as HTMLElement;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const loginUsername = document.getElementById(
  "login-username"
) as HTMLInputElement;
const loginPassword = document.getElementById(
  "login-password"
) as HTMLInputElement;
const registerForm = document.getElementById(
  "register-form"
) as HTMLFormElement;
const registerUsername = document.getElementById(
  "register-username"
) as HTMLInputElement;
const registerPassword = document.getElementById(
  "register-password"
) as HTMLInputElement;
const registerConfirm = document.getElementById(
  "register-confirm"
) as HTMLInputElement;
const authError = document.getElementById("auth-error") as HTMLElement;
// Onglets Connexion/Inscription
const tabLogin = document.getElementById("tab-login") as HTMLElement;
const tabRegister = document.getElementById("tab-register") as HTMLElement;

// Responsive helpers are provided by dom.ts (showSidebar, showChat, syncLayoutVisibility)

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
const roomListAll = document.getElementById(
  "room-list-all"
) as HTMLElement | null;
const noRoomMsgAll = document.getElementById(
  "no-room-msg-all"
) as HTMLElement | null;
const createRoomForm = document.getElementById(
  "create-room-form"
) as HTMLFormElement;
const createRoomName = document.getElementById(
  "create-room-name"
) as HTMLInputElement;
// Private room UI
const createRoomPrivate = document.getElementById(
  "create-room-private"
) as HTMLInputElement | null;
const privateRoomInvite = document.getElementById(
  "private-room-invite"
) as HTMLElement | null;
const inviteFriendsForm = document.getElementById(
  "invite-friends-form"
) as HTMLFormElement | null;
const inviteFriendInput = document.getElementById(
  "invite-friend-input"
) as HTMLInputElement | null;
const inviteFriendResults = document.getElementById(
  "invite-friend-results"
) as HTMLElement | null;
const invitedUsersList = document.getElementById(
  "invited-users"
) as HTMLElement | null;

// Tabs & collapsible sections (Messenger-like)
const tabDms = document.getElementById("tab-dms") as HTMLButtonElement | null;
const tabRooms = document.getElementById(
  "tab-rooms"
) as HTMLButtonElement | null;
const sectionDms = document.getElementById("section-dms") as HTMLElement | null;
const sectionRooms = document.getElementById(
  "section-rooms"
) as HTMLElement | null;
const toggleDms = document.getElementById(
  "toggle-dms"
) as HTMLButtonElement | null;
const toggleRooms = document.getElementById(
  "toggle-rooms"
) as HTMLButtonElement | null;

function setTabs(active: "dms" | "rooms") {
  if (tabDms)
    tabDms.setAttribute("aria-selected", active === "dms" ? "true" : "false");
  if (tabRooms)
    tabRooms.setAttribute(
      "aria-selected",
      active === "rooms" ? "true" : "false"
    );
  // Mobile behavior: show only the active section
  if (sectionDms && sectionRooms) {
    if (active === "dms") {
      sectionDms.style.display = "";
      sectionRooms.style.display = "none";
    } else {
      sectionDms.style.display = "none";
      sectionRooms.style.display = "";
    }
  }
}

function toggleSection(el: HTMLElement | null) {
  if (!el) return;
  const expanded = el.getAttribute("aria-expanded") === "true";
  el.setAttribute("aria-expanded", expanded ? "false" : "true");
  // Simple collapse by toggling list visibility
  const list = el.querySelector("ul");
  if (list) (list as HTMLElement).style.display = expanded ? "none" : "";
  const empty = el.querySelector(".room-empty") as HTMLElement | null;
  if (empty)
    empty.style.display = expanded
      ? "none"
      : list && (list as HTMLElement).children.length
      ? "none"
      : "block";
}

function initRoomTabsAndCollapsers() {
  // Default: DMs active
  setTabs("dms");
  if (sectionRooms) sectionRooms.setAttribute("aria-expanded", "false");
  if (sectionDms) sectionDms.setAttribute("aria-expanded", "true");
  if (tabDms) tabDms.onclick = () => setTabs("dms");
  if (tabRooms) tabRooms.onclick = () => setTabs("rooms");
  if (toggleDms) toggleDms.onclick = () => toggleSection(sectionDms);
  if (toggleRooms) toggleRooms.onclick = () => toggleSection(sectionRooms);
}

// Initialize tabs/collapsers on load
try {
  initRoomTabsAndCollapsers();
} catch {}

const chatCard = document.getElementById("chat-card") as HTMLElement;
const chatWindow = document.getElementById("chat-window") as HTMLElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const messageInput = document.getElementById("message") as HTMLInputElement;

const closeChatBtn = document.getElementById(
  "close-chat"
) as HTMLButtonElement | null;
const layoutContainer = document.querySelector(
  ".chat-root.layout"
) as HTMLElement | null;
const selectedRoomTitle = document.getElementById(
  "selected-room-title"
) as HTMLElement;
// Dynamic UI: typing banner just under the title
const typingBanner = document.createElement("div");
typingBanner.id = "typing-banner";
typingBanner.style.fontSize = "12px";
typingBanner.style.color = "#888";
typingBanner.style.margin = "4px 0 8px 0";
try {
  selectedRoomTitle?.parentElement?.insertBefore(
    typingBanner,
    selectedRoomTitle.nextSibling
  );
} catch {}

// New UI elements (search moved to search.ts)
// New toolbar elements (friends/requests moved to friends.ts)
const btnOpenRoomDrawer = document.getElementById(
  "btn-open-room-drawer"
) as HTMLButtonElement | null;
const btnCloseRoomDrawer = document.getElementById(
  "btn-close-room-drawer"
) as HTMLButtonElement | null;
const roomDrawer = document.getElementById("room-drawer") as HTMLElement | null;
// Deprecated in new UI but kept for compatibility
const friendsList = document.getElementById(
  "friends-list"
) as HTMLElement | null;
const refreshFriendsBtn = document.getElementById(
  "refresh-friends"
) as HTMLButtonElement | null;
const roomParticipants = document.getElementById(
  "room-participants"
) as HTMLElement | null;

// Simple refresh action for friends list
if (refreshFriendsBtn) {
  refreshFriendsBtn.onclick = () => requestFriendList();
}

// Private room toggle and invite search handled in room_creation.ts

// Typing receive is handled in sockets.ts

// State
let currentUser: { id: string; name: string } | null = null;
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
      (window as any).selectedRoom = null;
      chatWindow.innerHTML = "";
      setTypingBanner("");
      // Hide realtime stats panel if present
      try { (window as any).statsOnRoomClosed?.(); } catch {}
      if (dmPresenceInterval) {
        window.clearInterval(dmPresenceInterval);
        dmPresenceInterval = null;
      }
      syncLayoutVisibility();
    } catch {}
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
    socket.emit("logout", { token: getToken("session_token") }, (res: any) => {
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
    socket.emit("logoutAll", {}, (res: any) => {
      currentUser = null;
      document.cookie =
        "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
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
    try {
      (div as any).dataset.messageId = String(msg.id);
    } catch {}
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
    ${
      isMine
        ? `<span class="msg-status" aria-label="status">${statusText}</span>`
        : ""
    }
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Room history handled in sockets.ts

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

// roomUsers handled in sockets.ts

// Incoming message handled in sockets.ts

// Generic error handled in sockets.ts

// Message send and typing handlers are implemented in messaging.ts

// Message status updates handled in sockets.ts

// Affiche ou masque les panneaux selon l'état d'authentification
function showAuthPanel(show: boolean) {
  authPanel.style.display = show ? "block" : "none";
  // Defer panel visibility to responsive logic
  if (show) {
    showSidebar(false);
    showChat(false);
    if (layoutContainer) layoutContainer.style.display = "none";
  } else {
    syncLayoutVisibility();
  }
  createRoomForm.style.display = show ? "none" : "flex";
  chatForm.style.display = show ? "none" : "flex";
  // Affiche les boutons logout uniquement si connecté
  if (userActions) userActions.style.display = show ? "none" : "block";
}

// Typing banner helpers are provided by dom.ts (renderTypingBanner, setTypingBanner)

// --- Presence helpers (DM only) ---
async function fetchPresence(userId: string): Promise<{ status: string; lastSeen: number | null } | null> {
  try {
    const res = await fetch(`/api/user/presence/${encodeURIComponent(userId)}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return { status: data?.status || 'offline', lastSeen: data?.lastSeen ?? null };
  } catch { return null; }
}

(window as any).fetchPresence = fetchPresence;

async function setupDmPresence(room: any) {
  try {
    const w = window as any;
    const me = w.currentUser;
    if (!room || room.type !== "user" || !me) {
      updatePresenceLabel("");
      if (dmPresenceInterval) {
        window.clearInterval(dmPresenceInterval);
        dmPresenceInterval = null;
      }
      return;
    }
    const members: Array<{ id: string; name: string }> = Array.isArray(room.users) ? room.users : [];
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
      if (pr.status === "online") updatePresenceLabel("• en ligne");
      else if (pr.lastSeen)
        updatePresenceLabel(`• vu ${formatRelative(pr.lastSeen)}`);
      else updatePresenceLabel("• hors ligne");
    };
    await renderOnce();
    if (dmPresenceInterval) window.clearInterval(dmPresenceInterval);
    dmPresenceInterval = window.setInterval(renderOnce, 30_000);
  } catch {}
}

// updatePresenceLabel is defined in dom.ts and used here

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
      authError.textContent = data?.error || "Registration failed.";
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
  } catch (_err) {
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
} catch {}

// Initial layout sync
try {
  syncLayoutVisibility();
} catch {}

// Friends UI moved to friends.ts (renderFriends, requestFriendList, toolbar wiring)

// Drawer logic lives in room_creation.ts

// requestFriendList is defined in friends.ts

// DM helpers are defined in friends.ts

// Invite renderers live in room_creation.ts

// Invite search renderers moved to room_creation.ts

// runInviteSearch lives in room_creation.ts

// Invite listeners moved to room_creation.ts
