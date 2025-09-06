// messaging.ts - message rendering, send form, typing indicators
(function () {
  const w = window as any;
  if (w.__messaging_ts_initialized__) return;
  w.__messaging_ts_initialized__ = true;

  function getChatWindow(): HTMLElement | null {
    return document.getElementById("chat-window");
  }
  function getChatForm(): HTMLFormElement | null {
    return document.getElementById("chat-form") as HTMLFormElement | null;
  }
  function getMessageInput(): HTMLInputElement | null {
    return document.getElementById("message") as HTMLInputElement | null;
  }

  function getUserColorClass(authorName: string): string {
    let hash = 0;
    for (let i = 0; i < authorName.length; i++)
      hash = (hash + authorName.charCodeAt(i)) % 256;
    return "user-color-" + (1 + (hash % 8));
  }

  // Expose renderer globally
  w.renderMsg = function renderMsg(msg: any) {
    const chatWindow = getChatWindow();
    if (!chatWindow) return;
    const currentUser = w.currentUser as { id: string; name: string } | null;
    const authorName = msg.author?.name || "???";
    const { content, timestamp } = msg;
    const div = document.createElement("div");
    const isMine = currentUser && authorName === currentUser.name;
    let classes = "message";
    if (isMine) classes += " mine";
    else classes += " " + getUserColorClass(authorName);
    div.className = classes;
    if (msg && msg.id != null) {
      try {
        (div as any).dataset.messageId = String(msg.id);
      } catch {}
    }
    const time = new Date(timestamp).toLocaleTimeString();
    const status = String(msg.status || "sent");
    const statusText = (() => {
      if (!isMine) return "";
      if (status === "read") return "✓✓";
      if (status === "delivered") return "✓";
      return "";
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
  };

  // Send form
  const chatForm = getChatForm();
  const messageInput = getMessageInput();
  function genClientMsgId(): string {
    try {
      if ((window as any).crypto?.randomUUID) return (window as any).crypto.randomUUID();
    } catch {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedRoom = w.selectedRoom;
      const currentUser = w.currentUser;
      if (!selectedRoom || !currentUser) return;
      const content = (messageInput?.value || "").trim();
      if (!content) return;
      w.socket.emit("sendMessageToRoom", {
        roomId: selectedRoom.id,
        content,
        timestamp: Date.now(),
        clientMsgId: genClientMsgId(),
      });
      // Stats: count outgoing message
      try { (window as any).statsOnMessage?.(String(selectedRoom.id)); } catch {}
      // Optimistic: update last message preview inline in room list
      try {
        if (typeof w.updateRoomLastMsgPreview === "function")
          w.updateRoomLastMsgPreview(String(selectedRoom.id), content);
      } catch {}
      if (messageInput) messageInput.value = "";
    });
  }

  // Typing
  let typingStopTimer: number | null = null;
  let lastTypingEmit = 0;
  if (messageInput) {
    messageInput.addEventListener("input", () => {
      const selectedRoom = w.selectedRoom;
      const currentUser = w.currentUser;
      if (!selectedRoom || !currentUser) return;
      const now = Date.now();
      if (now - lastTypingEmit > 3000) {
        try {
          w.socket.emit("typingStart", { roomId: selectedRoom.id });
        } catch {}
        lastTypingEmit = now;
      }
      if (typingStopTimer) window.clearTimeout(typingStopTimer);
      typingStopTimer = window.setTimeout(() => {
        try {
          w.socket.emit("typingStop", { roomId: selectedRoom.id });
        } catch {}
        typingStopTimer = null;
      }, 1500);
    });
    messageInput.addEventListener("blur", () => {
      const selectedRoom = w.selectedRoom;
      const currentUser = w.currentUser;
      if (!selectedRoom || !currentUser) return;
      try {
        w.socket.emit("typingStop", { roomId: selectedRoom.id });
      } catch {}
    });
  }
})();
