// chat-client.ts
// Script extrait de index.html pour la logique front du chat en TypeScript
// Nécessite d'être compilé/transpilé en JS puis inclus dans index.html
const socket = io();
// Elements
const roomPanel = document.getElementById("room-panel");
const roomList = document.getElementById("room-list");
const noRoomMsg = document.getElementById("no-room-msg");
const createRoomForm = document.getElementById("create-room-form");
const createRoomName = document.getElementById("create-room-name");
const createRoomAuthor = document.getElementById("create-room-author");
const chatCard = document.getElementById("chat-card");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const authorInput = document.getElementById("author");
const messageInput = document.getElementById("message");
const backToRoomsBtn = document.getElementById("back-to-rooms");
const selectedRoomTitle = document.getElementById("selected-room-title");
// State
let currentUser = "";
let selectedRoom = null;
let rooms = [];
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
socket.on("rooms", (serverRooms) => {
    rooms = serverRooms;
    renderRoomList();
});
// --- ROOM CREATION ---
createRoomForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = createRoomName.value.trim();
    const creatorId = createRoomAuthor.value.trim();
    if (!name || !creatorId)
        return;
    currentUser = creatorId;
    socket.emit("createRoom", { name, creatorId });
    createRoomName.value = "";
    // On ne sélectionne pas la room automatiquement, UX : l'user la voit apparaître
});
// --- JOIN ROOM ---
function joinRoom(room) {
    if (!currentUser) {
        // Demander pseudo si pas encore défini
        const pseudo = prompt("Entrez votre pseudo pour rejoindre la room :");
        if (!pseudo)
            return;
        currentUser = pseudo;
    }
    selectedRoom = room;
    authorInput.value = currentUser;
    selectedRoomTitle.textContent = `💬 Room : ${room.name}`;
    // UI : afficher la chatbox, masquer la liste des rooms
    roomPanel.style.display = "none";
    chatCard.style.display = "block";
    chatWindow.innerHTML = "";
    socket.emit("joinRoom", { roomId: room.id, userId: currentUser });
}
backToRoomsBtn.addEventListener("click", function () {
    selectedRoom = null;
    chatCard.style.display = "none";
    roomPanel.style.display = "block";
    chatWindow.innerHTML = "";
});
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
    const isMine = authorName === currentUser;
    let classes = "message";
    if (isMine) {
        classes += " mine";
    }
    else {
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
socket.on("roomHistory", (data) => {
    if (!selectedRoom || data.roomId !== selectedRoom.id)
        return;
    chatWindow.innerHTML = "";
    data.messages.forEach(renderMsg);
});
// Nouveau message dans la room
socket.on("message", (data) => {
    if (!selectedRoom || data.roomId !== selectedRoom.id)
        return;
    renderMsg(data.message);
});
// Formulaire d'envoi de message (dans la room sélectionnée)
chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selectedRoom)
        return;
    const author = authorInput.value.trim();
    const content = messageInput.value.trim();
    if (!author || !content)
        return;
    currentUser = author;
    socket.emit("sendMessageToRoom", {
        roomId: selectedRoom.id,
        author: { id: author, name: author },
        content,
        timestamp: Date.now(),
    });
    messageInput.value = "";
});
// Initial : demander la liste des rooms (si non pushée automatiquement)
socket.emit("getRooms");
