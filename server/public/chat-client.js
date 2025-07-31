// chat-client.ts
// Script extrait de index.html pour la logique front du chat en TypeScript
// Nécessite d'être compilé/transpilé en JS puis inclus dans index.html
const socket = io();
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const authorInput = document.getElementById("author");
const messageInput = document.getElementById("message");
// On conserve le pseudo courant pour aligner les messages
let currentUser = "";
authorInput.addEventListener("change", function () {
    currentUser = authorInput.value;
});
// Si déjà rempli au chargement
if (authorInput.value)
    currentUser = authorInput.value;
function getUserColorClass(authorName) {
    // Hash simple pour obtenir un numéro entre 1 et 8
    let hash = 0;
    for (let i = 0; i < authorName.length; i++)
        hash = (hash + authorName.charCodeAt(i)) % 256;
    return "user-color-" + (1 + (hash % 8));
}
function renderMsg(msg) {
    var _a;
    // compatibilité : accepte authorName ou author.name
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
socket.on("history", (msgs) => msgs.forEach(renderMsg));
socket.on("message", renderMsg);
chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (authorInput.value && messageInput.value) {
        socket.emit("message", {
            author: { id: authorInput.value, name: authorInput.value },
            content: messageInput.value,
            timestamp: Date.now(),
        });
        messageInput.value = "";
    }
});
