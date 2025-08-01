// chat-client.ts
// Script extrait de index.html pour la logique front du chat en TypeScript
// Nécessite d'être compilé/transpilé en JS puis inclus dans index.html
const socket = io();

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
const roomList = document.getElementById("room-list") as HTMLElement;
const noRoomMsg = document.getElementById("no-room-msg") as HTMLElement;
const createRoomForm = document.getElementById("create-room-form") as HTMLFormElement;
const createRoomName = document.getElementById("create-room-name") as HTMLInputElement;

const chatCard = document.getElementById("chat-card") as HTMLElement;
const chatWindow = document.getElementById("chat-window") as HTMLElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const messageInput = document.getElementById("message") as HTMLInputElement;
const backToRoomsBtn = document.getElementById("back-to-rooms") as HTMLButtonElement;
const selectedRoomTitle = document.getElementById("selected-room-title") as HTMLElement;

// State
let currentUser: { id: string, name: string } | null = null;
let selectedRoom: any = null;
let rooms: any[] = [];

// --- AUTH LOGIC dsiconnet all session user on all device ---
socket.on("forceLogout", function(data) {
  currentUser = null;
  document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  showAuthPanel(true);
  alert("Vous avez été déconnecté de tous vos appareils.");
});

// --- ROOM LIST LOGIC ---
function renderRoomList() {
  roomList.innerHTML = "";
  if (rooms.length === 0) {
    noRoomMsg.style.display = "block";
    return;
  }
  noRoomMsg.style.display = "none";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.className = "room-list-item";
    li.textContent = room.name + (room.creatorId ? ` (créée par ${room.creatorId})` : "");
    li.style.cursor = "pointer";
    li.onclick = () => joinRoom(room);
    roomList.appendChild(li);
  });
}

socket.on("rooms", (serverRooms: any[]) => {
  rooms = serverRooms;
  renderRoomList();
});

// --- ROOM CREATION ---
createRoomForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = createRoomName.value.trim();
  if (!name || !currentUser) return;
  socket.emit("createRoom", { name, creatorId: currentUser.id });
  createRoomName.value = "";
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
      document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      showAuthPanel(true);
    });
  };
}
if (logoutAllBtn) {
  logoutAllBtn.onclick = function() {
    socket.emit('logoutAll', {}, (res: any) => {
      currentUser = null;
      document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
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

const sessionToken = getCookie('sessionToken');
if (sessionToken) {
  socket.emit('authenticate', { token: sessionToken }, (res: any) => {
    if (res && res.success) {
      currentUser = { id: res.id, name: res.name };
      showAuthPanel(false);
      socket.emit("getRooms");
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
      document.cookie = `sessionToken=${res.token}; path=/; SameSite=Lax`;
      // Pour la prod, ajouter 'Secure' si le site est servi en HTTPS :
      // document.cookie = `sessionToken=${res.token}; path=/; SameSite=Lax; Secure`;
    }
    authError.style.display = "none";
    showAuthPanel(false);
    socket.emit("getRooms");
  });
});

// Auth: register
registerForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = registerUsername.value.trim();
  const password = registerPassword.value;
  const confirm = registerConfirm.value;
  // Correction : vérifie explicitement que le champ password est bien transmis
  if (!username || !password || !confirm) {
    authError.textContent = "Veuillez remplir tous les champs.";
    authError.style.display = "block";
    return;
  }
  // Log pour debug (à retirer en prod)
  // console.log('Register payload:', { username, password, confirmPassword: confirm });
  socket.emit("register", { username, password, confirmPassword: confirm }, (res: any) => {
    if (res && res.error) {
      authError.textContent = res.error;
      authError.style.display = "block";
      return;
    }
    // Succès inscription : invite à se connecter
    authError.textContent = "Compte créé avec succès ! Connectez-vous.";
    authError.style.color = "#228b22";
    authError.style.background = "#f5fff5";
    authError.style.border = "1px solid #b8ffb8";
    authError.style.display = "block";
    // Bascule sur l'onglet login
    showAuthTab("login");
    // Remet la couleur d'erreur après 3s
    setTimeout(() => {
      authError.style.color = "#e23c3c";
      authError.style.background = "#fff5f5";
      authError.style.border = "1px solid #ffd4d4";
      authError.style.display = "none";
    }, 3000);
    // Vide les champs d'inscription
    registerUsername.value = "";
    registerPassword.value = "";
    registerConfirm.value = "";
  });
});

// Initial : demander la liste des rooms (si non pushée automatiquement)
// (ne rien faire tant qu'on n'est pas authentifié)

