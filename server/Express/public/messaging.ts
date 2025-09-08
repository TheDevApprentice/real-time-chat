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

  function isMediaUrl(url: string): { kind: 'image' | 'video' | null } {
    const u = String(url || '').toLowerCase();
    if (!/^https?:\/\//.test(u)) return { kind: null };
    if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)(\?.*)?$/.test(u)) return { kind: 'image' };
    if (/(\.mp4|\.webm|\.ogg)(\?.*)?$/.test(u)) return { kind: 'video' };
    return { kind: null };
  }

  function escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --- Undo eligibility tracking (client-side hint) ---
  // Track which messages this user just edited/deleted so the Undo button shows
  // locally for up to 10 minutes. Server remains the source of truth.
  const UNDO_WINDOW_MS = 10 * 60 * 1000;
  const undoEligible: Record<string, number> = {};
  function isUndoEligible(messageId: string | number): boolean {
    const mid = String(messageId);
    const exp = undoEligible[mid];
    return typeof exp === 'number' && exp > Date.now();
  }
  function toggleUndoButtonFor(messageId: string | number) {
    try {
      const chatWindow = getChatWindow();
      if (!chatWindow) return;
      const midStr = String(messageId);
      const bubble = chatWindow.querySelector(`div.message[data-message-id="${CSS.escape(midStr)}"]`) as HTMLElement | null;
      if (!bubble) return;
      const btn = bubble.querySelector('.action-undo') as HTMLButtonElement | null;
      if (!btn) return;
      btn.style.display = isUndoEligible(midStr) ? '' : 'none';
    } catch {}
  }
  function setUndoEligible(messageId: string | number, ttlMs: number = UNDO_WINDOW_MS) {
    const mid = String(messageId);
    undoEligible[mid] = Date.now() + Math.max(1000, ttlMs);
    // Auto-expire locally (visual hint only)
    window.setTimeout(() => { try { delete undoEligible[mid]; toggleUndoButtonFor(mid); } catch {} }, Math.max(1000, ttlMs));
    toggleUndoButtonFor(mid);
  }
  function clearUndoEligible(messageId: string | number) {
    const mid = String(messageId);
    delete undoEligible[mid];
    toggleUndoButtonFor(mid);
  }

  // Expose renderer globally
  w.renderMsg = function renderMsg(msg: any) {
    const chatWindow = getChatWindow();
    if (!chatWindow) return;
    const currentUser = w.currentUser;
    const authorName = (msg.author as any)?.name || "???";
    const { content, timestamp } = msg;
    // Dedup guard: skip if this message id already exists in DOM (optimistic ack + broadcast)
    try {
      const midStr = msg && msg.id != null ? String(msg.id) : '';
      if (midStr) {
        const existing = chatWindow.querySelector(`[data-message-id="${CSS.escape(midStr)}"]`);
        if (existing) return;
      }
      // Fallback dedup when id is missing: author|timestamp|content hash
      const rawKey = `${authorName}|${String(timestamp ?? '')}|${String(content ?? '')}`;
      const hash = String(rawKey);
      const dup = chatWindow.querySelector(`[data-msg-hash="${CSS.escape(hash)}"]`);
      if (dup) return;
    } catch {}
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
    try {
      (div as any).dataset.msgHash = `${authorName}|${String(timestamp ?? '')}|${String(content ?? '')}`;
    } catch {}
    const time = new Date(timestamp).toLocaleTimeString();
    const status = String(msg.status || "sent");
    const statusText = (() => {
      if (!isMine) return "";
      if (status === "read") return "✓✓";
      if (status === "delivered") return "✓";
      return "";
    })();
    const contentContainer = document.createElement('div');
    contentContainer.className = 'msg-content';
    try {
      const lines = String(content || '').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
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
        } else if (kind === 'video') {
          const video = document.createElement('video');
          video.src = trimmed;
          video.controls = true;
          video.preload = 'metadata';
          (video.style as any).maxWidth = '100%';
          (video.style as any).borderRadius = '6px';
          (video.style as any).display = 'block';
          (video.style as any).margin = '6px 0';
          contentContainer.appendChild(video);
        } else {
          const p = document.createElement('div');
          p.innerHTML = escapeHtml(trimmed);
          contentContainer.appendChild(p);
        }
      }
    } catch {
      contentContainer.textContent = String(content || '');
    }

    const meta = document.createElement('div');
    meta.className = 'msg-meta-row';
    meta.innerHTML = `<span class="msg-author">${authorName}</span><span class="msg-time">${time}</span>`;
    div.appendChild(meta);
    div.appendChild(contentContainer);
    if (isMine) {
      const st = document.createElement('span');
      st.className = 'msg-status';
      st.setAttribute('aria-label','status');
      st.textContent = statusText;
      div.appendChild(st);
      try { addOwnerActions(div, msg); } catch {}
    }
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  };

  function addOwnerActions(div: HTMLElement, msg: any) {
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
        const room = (window as any).selectedRoom;
        if (!room) return;
        const newContent = String(textarea.value || '');
        try {
          (window as any).socket.emit('messageEdit', {
            roomId: room.id,
            messageId: Number(msg.id),
            newContent,
          }, (res: any) => {
            if (res && res.success) {
              // Optimistic update; server will also broadcast messageEdited
              renderContentInto(contentContainer as HTMLElement, newContent);
              // Mark Undo available locally for this message
              setUndoEligible(msg.id);
            } else if (res && res.error) {
              (window as any).showToast?.(String(res.error));
            }
          });
        } catch {}
      };
      contentContainer.appendChild(saveButton);
    };
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
      // Send delete request via WS
      const room = (window as any).selectedRoom;
      if (!room) return;
      try {
        (window as any).socket.emit('messageDelete', { roomId: room.id, messageId: Number(msg.id) }, (res: any) => {
          if (res && res.success) {
            // Optimistically mark as deleted; server will broadcast messageDeleted
            markMessageDeleted(msg.id);
            // Mark Undo available locally for this message
            setUndoEligible(msg.id);
          } else if (res && res.error) {
            (window as any).showToast?.(String(res.error));
          }
        });
      } catch {}
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
    if (!isUndoEligible(msg.id)) undoButton.style.display = 'none';
  }

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
  // Attachments state (per-file with progress/status)
  type PendingStatus = 'uploading'|'ready'|'error'|'deleted'|
    'canceled';
  type PendingItem = {
    id: string;
    name: string;
    size: number;
    mime?: string;
    key?: string; // tmp S3 key when ready
    percent: number; // 0..100
    status: PendingStatus;
    xhr?: XMLHttpRequest;
    errorMsg?: string;
    thumbUrl?: string; // object URL for image preview
  };
  let pendingItems: PendingItem[] = [];
  function getAttachInput(): HTMLInputElement | null {
    return document.getElementById('attach-input') as HTMLInputElement | null;
  }
  function getAttachBar(): HTMLDivElement | null {
    return document.getElementById('attach-bar') as HTMLDivElement | null;
  }
  async function deletePendingTemps() {
    const keys = pendingItems.filter(it => it.key && it.status === 'ready').map(it => it.key!)
    ;
    if (!keys.length) return;
    try {
      const csrf = (typeof (window as any).getCookie === 'function' ? (window as any).getCookie('X-XSRF-TOKEN') : '') || '';
      await fetch('/api/upload', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
        body: JSON.stringify({ keys })
      });
    } catch {}
    // Abort uploads and clear all items
    for (const it of pendingItems) {
      try { it.xhr?.abort(); } catch {}
      try { if (it.thumbUrl) { URL.revokeObjectURL(it.thumbUrl); } } catch {}
    }
    pendingItems = [];
    renderAttachBar();
  }
  function removeItemAt(idx: number) {
    const it = pendingItems[idx];
    if (!it) return;
    // If uploading, abort
    try { it.xhr?.abort(); } catch {}
    // If ready (has key), delete on server
    if (it.key) {
      const csrf = (typeof (window as any).getCookie === 'function' ? (window as any).getCookie('X-XSRF-TOKEN') : '') || '';
      fetch('/api/upload', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
        body: JSON.stringify({ keys: [it.key] })
      }).catch(() => undefined);
    }
    try { if (it.thumbUrl) { URL.revokeObjectURL(it.thumbUrl); } } catch {}
    pendingItems.splice(idx, 1);
    renderAttachBar();
  }
  function renderAttachBar() {
    const bar = getAttachBar();
    if (!bar) return;
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
      } else {
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
        (document as any).attachShimmerStyleInjected || (function(){
          const st = document.createElement('style');
          st.textContent = '@keyframes attachShimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }';
          document.head.appendChild(st);
          (document as any).attachShimmerStyleInjected = true;
        })();
        barOuter.appendChild(barInner);
        barOuter.appendChild(shimmer);
        box.appendChild(barOuter);
      } else if (it.status === 'ready') {
        const ok = document.createElement('span');
        ok.textContent = 'Prêt';
        ok.style.color = '#0a7';
        ok.style.fontSize = '12px';
        box.appendChild(ok);
      } else if (it.status === 'error') {
        const err = document.createElement('span');
        err.textContent = it.errorMsg || 'Erreur';
        err.style.color = '#c00';
        err.style.fontSize = '12px';
        box.appendChild(err);
      } else {
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
    const form = getChatForm();
    if (!form) return;
    // Attach bar (above form)
    let bar = getAttachBar();
    if (!bar) {
      bar = document.createElement('div') as HTMLDivElement;
      bar.id = 'attach-bar';
      bar.style.display = 'none';
      bar.style.margin = '6px 0';
      bar.style.display = 'none';
      const chatWindow = getChatWindow();
      chatWindow?.parentElement?.insertBefore(bar, form);
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
    const btn = document.getElementById('attach-btn') as HTMLButtonElement | null;
    if (btn) {
      // Ensure it sits before the message input (left side)
      const inputMsg = form.querySelector('#message');
      if (inputMsg && btn.parentElement === form && btn.nextElementSibling !== inputMsg) {
        form.insertBefore(btn, inputMsg);
      }
      // Clean old inline handler and bind fresh listeners
      try { (btn as any).onclick = null; } catch {}
      const handler = (ev: Event) => {
        try { ev.preventDefault(); ev.stopPropagation(); } catch {}
        const f = getAttachInput();
        if (f) {
          try { f.click(); } catch { setTimeout(() => { try { f.click(); } catch {} }, 0); }
        }
        return false;
      };
      // Capture first, then bubble (max chance to run)
      try { btn.addEventListener('click', handler, { capture: true }); } catch { btn.addEventListener('click', handler as any, true); }
      try { btn.addEventListener('click', handler, false); } catch {}
    }

    function uploadWithProgress(file: File, roomId: string) {
      const it: PendingItem = {
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
      } catch {}
      pendingItems.push(it);
      renderAttachBar();
      const fd = new FormData();
      fd.append('file', file);
      const xhr = new XMLHttpRequest();
      it.xhr = xhr;
      xhr.open('POST', `/api/upload?temp=1&roomId=${encodeURIComponent(String(roomId))}`);
      xhr.withCredentials = true;
      try {
        const csrf = (typeof (window as any).getCookie === 'function' ? (window as any).getCookie('X-XSRF-TOKEN') : '') || '';
        if (csrf) xhr.setRequestHeader('X-XSRF-TOKEN', csrf);
      } catch {}
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
            if (xhr.status >= 200 && xhr.status < 300 && data?.key) {
              it.key = String(data.key);
              it.status = 'ready';
              it.percent = 100;
            } else {
              it.status = 'error';
              it.errorMsg = data?.error || `HTTP ${xhr.status}`;
            }
          } catch {
            if (xhr.status >= 200 && xhr.status < 300) {
              it.status = 'ready';
              it.percent = 100;
            } else {
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
      const files = Array.from(input!.files || []);
      if (!files.length) return;
      const room = w.selectedRoom;
      if (!room) { try { (window as any).showToast?.('Aucune room sélectionnée'); } catch {} return; }
      for (const file of files) uploadWithProgress(file, String(room.id));
      input!.value = '';
    };
  }

  ensureAttachUI();

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedRoom = w.selectedRoom;
      const currentUser = w.currentUser;
      if (!selectedRoom || !currentUser) return;
      const content = (messageInput?.value || "").trim();
      const readyKeys = pendingItems.filter(it => it.key && it.status==='ready').map(it => it.key!);
      if (!content && readyKeys.length === 0) return;
      const payload = {
        roomId: selectedRoom.id,
        content,
        timestamp: Date.now(),
        clientMsgId: genClientMsgId(),
        attachments: readyKeys,
      };
      w.socket.emit("sendMessageToRoom", payload, (res: any) => {
        try {
          if (res && res.success) {
            if (res.message && typeof w.renderMsg === 'function') {
              w.renderMsg(res.message);
            }
            // Optimistic: update last message preview inline in room list
            try {
              if (typeof w.updateRoomLastMsgPreview === "function")
                w.updateRoomLastMsgPreview(String(selectedRoom.id), res.message?.content || content || (res.finalUrls||[]).join('\n') || '');
            } catch {}
          } else if (res && res.error) {
            (window as any).showToast?.(String(res.error));
          }
        } catch {}
      });
      // Stats: count outgoing message
      try { (window as any).statsOnMessage?.(String(selectedRoom.id)); } catch {}
      if (messageInput) messageInput.value = "";
      pendingItems = [];
      renderAttachBar();
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
  // Cleanup temp attachments if user leaves/reloads without sending
  try {
    window.addEventListener('beforeunload', (ev) => {
      const keys = pendingItems.filter(it => it.key && it.status==='ready').map(it => it.key!);
      if (keys.length > 0) {
        navigator.sendBeacon && navigator.sendBeacon('/api/upload', new Blob([JSON.stringify({ keys })], { type: 'application/json' }));
      }
    });
  } catch {}

  // --- Real-time updates: edit/delete/undo wiring ---
  function renderContentInto(el: HTMLElement, content: string) {
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
        } else if (urls.length === 1 && isMediaUrl(urls[0]).kind === 'video') {
          const v = document.createElement('video');
          v.src = urls[0];
          v.controls = true;
          v.preload = 'metadata';
          v.style.maxWidth = '100%';
          v.style.borderRadius = '6px';
          line.appendChild(v);
        } else {
          line.textContent = p;
        }
        el.appendChild(line);
      }
    } catch {
      el.textContent = String(content || '');
    }
  }

  function updateMessageBubbleContent(messageId: string | number, content: string) {
    const chatWindow = getChatWindow();
    if (!chatWindow) return;
    const midStr = String(messageId);
    const bubble = chatWindow.querySelector(`div.message[data-message-id="${CSS.escape(midStr)}"]`) as HTMLElement | null;
    if (!bubble) return;
    const contentEl = bubble.querySelector('.msg-content') as HTMLElement | null;
    if (!contentEl) return;
    renderContentInto(contentEl, content);
  }

  function markMessageDeleted(messageId: string | number) {
    updateMessageBubbleContent(messageId, '[deleted]');
  }

  // Expose a simple undo helper callable from UI
  if (!w.requestUndo)
    w.requestUndo = function requestUndo(messageId: string | number) {
      const room = w.selectedRoom;
      if (!room) return;
      try {
        w.socket.emit('messageUndo', { roomId: room.id, messageId: Number(messageId) }, (res: any) => {
          if (res && res.success) {
            (window as any).showToast?.('Modification reverted');
            clearUndoEligible(messageId);
          } else if (res && res.error) {
            (window as any).showToast?.(String(res.error));
          }
        });
      } catch {}
    };

  // Register WS listeners once (even if socket is created later)
  function attachWsHandlers() {
    try {
      if (!w.socket || w.__msg_edit_delete_handlers__) return;
      w.__msg_edit_delete_handlers__ = true;
      w.socket.on('messageEdited', (payload: { roomId: string; messageId: number; content: string }) => {
        try {
          const selectedRoom = w.selectedRoom;
          if (!selectedRoom || String(selectedRoom.id) !== String(payload.roomId)) return;
          updateMessageBubbleContent(payload.messageId, payload.content);
          // Update inline preview
          try { typeof w.updateRoomLastMsgPreview === 'function' && w.updateRoomLastMsgPreview(String(payload.roomId), payload.content || ''); } catch {}
        } catch {}
      });
      w.socket.on('messageDeleted', (payload: { roomId: string; messageId: number }) => {
        try {
          const selectedRoom = w.selectedRoom;
          if (!selectedRoom || String(selectedRoom.id) !== String(payload.roomId)) return;
          markMessageDeleted(payload.messageId);
          try { typeof w.updateRoomLastMsgPreview === 'function' && w.updateRoomLastMsgPreview(String(payload.roomId), '[deleted]'); } catch {}
        } catch {}
      });
      // Re-attach after reconnect if needed
      try { w.socket.on('connect', () => { w.__msg_edit_delete_handlers__ = false; attachWsHandlers(); }); } catch {}
    } catch {}
  }
  // Try immediately and then retry a few times if socket is not ready yet
  attachWsHandlers();
  (function retryAttach(attempt = 0) {
    if (w.__msg_edit_delete_handlers__) return;
    if (attempt > 20) return; // ~10s max (with 500ms intervals)
    setTimeout(() => { attachWsHandlers(); retryAttach(attempt + 1); }, 500);
  })();
})();
