// stats.ts - Client-side realtime stats panel (no external libs)
// Collects per-room metrics from incoming/outgoing events and renders sparklines
// in a panel under the room list. Global helpers are attached to window.

(function () {
  const w = window as any;

  type Buffers = {
    msgPerMin: number[]; // last 60 minutes
    msgMinuteStamp: number; // epoch minute of the last bucket
    online: Array<{ ts: number; count: number }>; // last N points (e.g., 120)
  };

  const MAX_MINUTES = 60;
  const MAX_ONLINE_POINTS = 120; // ~2 minutes at 1s sampling or event-driven

  const buffersByRoom: Record<string, Buffers> = Object.create(null);
  let currentRoomId: string | null = null;
  let renderTimer: number | null = null;

  function epochMinute(t = Date.now()): number {
    return Math.floor(t / 60000);
  }

  function ensureBuffers(roomId: string): Buffers {
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

  function recordMessage(roomId: string) {
    const b = ensureBuffers(roomId);
    // increment current minute bucket
    b.msgPerMin[b.msgPerMin.length - 1]++;
    if (roomId === currentRoomId) scheduleRender();
  }

  function recordOnline(roomId: string, count: number) {
    const b = ensureBuffers(roomId);
    const now = Date.now();
    b.online.push({ ts: now, count: Math.max(0, Number(count) || 0) });
    if (b.online.length > MAX_ONLINE_POINTS) b.online.shift();
    if (roomId === currentRoomId) scheduleRender();
  }

  // ================= Panel & Rendering =================
  function ensureStatsPanel(): HTMLElement | null {
    const side = document.getElementById("room-panel") as HTMLElement | null;
    if (!side) return null;
    let section = document.getElementById("stats-sidebar-panel") as HTMLElement | null;
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
      if (roomListSection?.parentElement) {
        roomListSection.parentElement.appendChild(section);
      } else {
        side.appendChild(section);
      }
    }
    return section;
  }

  function setPanelVisible(show: boolean) {
    const panel = ensureStatsPanel();
    if (panel) panel.style.display = show ? "" : "none";
  }

  function scheduleRender() {
    if (renderTimer != null) return;
    renderTimer = window.setTimeout(() => {
      renderTimer = null;
      try { render(); } catch {}
    }, 150);
  }

  function drawSparkline(canvas: HTMLCanvasElement, points: number[], color: string) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!points || points.length === 0) return;
    const max = Math.max(1, ...points);
    const stepX = W / Math.max(1, points.length - 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach((v, i) => {
      const x = i * stepX;
      const y = H - (v / max) * (H - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
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
    const label = document.getElementById("stats-room-label") as HTMLElement | null;
    const c1 = document.getElementById("stats-mpm") as HTMLCanvasElement | null;
    const c2 = document.getElementById("stats-online") as HTMLCanvasElement | null;
    if (!label || !c1 || !c2) return;
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
  function onSelectRoom(room: any) {
    const rid = room?.id ? String(room.id) : null;
    currentRoomId = rid;
    ensureStatsPanel();
    setPanelVisible(!!rid);
    scheduleRender();
  }

  // Wrap joinRoom to detect selection changes
  try {
    const originalJoin = w.joinRoom;
    if (typeof originalJoin === "function") {
      w.joinRoom = function wrappedJoin(room: any) {
        originalJoin(room);
        try { onSelectRoom(room); } catch {}
      };
    }
  } catch {}

  // Expose hooks for other modules
  try {
    w.statsOnMessage = (roomId: string) => recordMessage(roomId);
    w.statsOnOnline = (roomId: string, count: number) => recordOnline(roomId, count);
    w.statsOnRoomClosed = () => { currentRoomId = null; setPanelVisible(false); scheduleRender(); };
  } catch {}

  // Initial mount
  try { ensureStatsPanel(); setPanelVisible(false); render(); } catch {}
})();
