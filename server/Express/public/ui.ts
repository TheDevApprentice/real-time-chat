// ui.ts - Enhanced UX for the server test UI, keeping it a great debugging playground
// No imports/exports. Bundled into chat-client.js via public/tsconfig.json (outFile)

(function () {
  const w = window as any;
  if (w.__ui_ts_initialized__) return; // idempotent
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
  } catch {}

  // ---------------- Quick actions ----------------
  function ensureQuickbar(): HTMLElement | null {
    try {
      if (document.getElementById('rt-quickbar')) return document.getElementById('rt-quickbar');
      const header = document.querySelector('.app-header');
      if (!header) return null;
      const bar = document.createElement('div');
      bar.id = 'rt-quickbar';
      bar.innerHTML = `
        <button class="rt-chip primary" id="rt-qb-refresh">Refresh Rooms</button>
        <button class="rt-chip" id="rt-qb-unread">Unread Only: Off</button>
        <button class="rt-chip" id="rt-qb-dock">Debug Dock</button>
      `;
      header.insertAdjacentElement('afterend', bar);
      // Wire actions
      const $ = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
      $('rt-qb-refresh')!.onclick = () => { try { (w.socket as any)?.emit('getRooms'); } catch {} };
      // Restore unread filter from storage
      try { w.__rt_unread_only = localStorage.getItem('rt:unreadOnly') === '1'; } catch {}
      const unreadBtn = $('rt-qb-unread');
      if (unreadBtn) unreadBtn.textContent = `Unread Only: ${w.__rt_unread_only ? 'On' : 'Off'}`;
      $('rt-qb-unread')!.onclick = () => {
        try {
          w.__rt_unread_only = !w.__rt_unread_only;
          try { localStorage.setItem('rt:unreadOnly', w.__rt_unread_only ? '1' : '0'); } catch {}
          const btn = $('rt-qb-unread');
          if (btn) btn.textContent = `Unread Only: ${w.__rt_unread_only ? 'On' : 'Off'}`;
          w.renderRoomList?.();
        } catch {}
      };
      $('rt-qb-dock')!.onclick = () => toggleDock();
      return bar;
    } catch { return null; }
  }

  function toggleStatsPanel() {
    try {
      const el = document.getElementById('stats-sidebar-panel');
      if (!el) { w.showToast?.('Stats panel not mounted yet'); return; }
      // flip based on current style
      const isVisible = el.style.display !== 'none';
      const nextVisible = !isVisible;
      el.style.display = nextVisible ? '' : 'none';
      try { localStorage.setItem('rt:statsVisible', nextVisible ? '1' : '0'); } catch {}
    } catch {}
  }

  // ---------------- Debug dock ----------------
  function ensureDock(): HTMLElement {
    let dock = document.getElementById('rt-debug-dock') as HTMLElement | null;
    if (dock) return dock;
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
    const close = document.getElementById('rt-debug-close') as HTMLButtonElement;
    const clear = document.getElementById('rt-debug-clear') as HTMLButtonElement;
    close.onclick = () => toggleDock(false);
    clear.onclick = () => {
      ['rt-log-console','rt-log-ws','rt-log-rest'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
    };
    const refresh = document.getElementById('rt-state-refresh') as HTMLButtonElement;
    refresh.onclick = () => renderState();
    const copyDetails = document.getElementById('rt-copy-details') as HTMLButtonElement;
    copyDetails.onclick = () => {
      try {
        const details = (dock as any).__rt_details_json || '';
        navigator.clipboard?.writeText(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
        (window as any).showToast?.('Details copied');
      } catch {}
    };
    // Tabs (presentational only for now)
    Array.from(dock.querySelectorAll('.rt-tab')).forEach(btn => {
      btn.addEventListener('click', () => {
        Array.from(dock!.querySelectorAll('.rt-tab')).forEach(b => b.setAttribute('aria-selected','false'));
        (btn as HTMLElement).setAttribute('aria-selected','true');
      });
    });
    // Restore dock open state
    try {
      const open = localStorage.getItem('rt:dockOpen') === '1';
      dock.setAttribute('data-open', open ? 'true' : 'false');
      if (open) renderState();
    } catch {}
    return dock;
  }

  function toggleDock(force?: boolean) {
    const el = ensureDock();
    const open = force != null ? !!force : el.getAttribute('data-open') !== 'true';
    el.setAttribute('data-open', open ? 'true' : 'false');
    if (open) renderState();
    try { localStorage.setItem('rt:dockOpen', open ? '1' : '0'); } catch {}
  }

  // ---------------- Log helpers ----------------
  function setDetails(obj: any) {
    try {
      const dock = document.getElementById('rt-debug-dock') as HTMLElement | null;
      const el = document.getElementById('rt-log-details') as HTMLDivElement | null;
      if (!el || !dock) return;
      const json = typeof obj === 'string' ? obj : (()=>{ try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } })();
      el.textContent = json;
      (dock as any).__rt_details_json = json;
    } catch {}
  }

  function appendLogLine(id: string, msg: string, details?: any) {
    try {
      const el = document.getElementById(id) as HTMLDivElement | null;
      if (!el) return;
      const line = document.createElement('div');
      line.textContent = msg;
      if (details !== undefined) {
        line.style.cursor = 'pointer';
        line.onclick = () => setDetails(details);
      }
      el.appendChild(line);
      el.scrollTop = el.scrollHeight;
    } catch {}
  }
  function fmt(obj: any): string { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } }

  // Patch console.log to also mirror into console pane (non-invasive)
  try {
    const origLog = console.log.bind(console);
    console.log = (...args: any[]) => { try { appendLogLine('rt-log-console', args.map(a => typeof a === 'string' ? a : fmt(a)).join(' ')); } catch {} ; origLog(...args); };
  } catch {}

  // Patch socket emits and on-listeners for tracing
  try {
    const s = w.socket; if (s && !s.__rt_patched) {
      s.__rt_patched = true;
      const origEmit = s.emit.bind(s);
      s.emit = (event: string, ...args: any[]) => {
        const t0 = performance.now();
        const maybeCb = args[args.length-1];
        if (typeof maybeCb === 'function') {
          const cb = args.pop();
          args.push((res: any) => { appendLogLine('rt-log-ws', `→ ${event} ${fmt(args[0])} [${Math.round(performance.now()-t0)}ms]`, { direction:'out', event, payload: args[0], cb: res }); try { cb(res); } catch {} });
        } else {
          appendLogLine('rt-log-ws', `→ ${event} ${fmt(args[0])}`, { direction:'out', event, payload: args[0] });
        }
        return origEmit(event, ...args);
      };
      const origOn = s.on.bind(s);
      s.on = (name: string, handler: (...a:any[])=>void) => {
        return origOn(name, (...a:any[]) => { try { appendLogLine('rt-log-ws', `← ${name} ${fmt(a[0])}`, { direction:'in', event: name, payload: a[0] }); } catch {} ; try { handler(...a); } catch {} });
      };
    }
  } catch {}

  // Patch fetch for REST tracing
  try {
    const origFetch = window.fetch.bind(window);
    (window as any).fetch = async (...args: any[]) => {
      const input = args[0];
      const init = args[1] || {};
      const url = typeof input === 'string' ? input : (input?.url || '');
      const method = (init.method || 'GET').toUpperCase();
      const t0 = performance.now();
      try {
        const res = await origFetch(input as any, init);
        const ms = Math.round(performance.now() - t0);
        appendLogLine('rt-log-rest', `${method} ${url} – ${res.status} (${ms}ms)`, { method, url, status: res.status, req: init });
        return res;
      } catch (e:any) {
        const ms = Math.round(performance.now() - t0);
        appendLogLine('rt-log-rest', `${method} ${url} – FAILED (${ms}ms)`, { method, url, error: String(e) });
        throw e;
      }
    };
  } catch {}

  // ---------------- State renderer ----------------
  function renderState() {
    try {
      const el = document.getElementById('rt-log-state'); if (!el) return;
      const state = {
        user: w.currentUser,
        selectedRoom: w.selectedRoom ? { id: w.selectedRoom.id, name: w.selectedRoom.name, type: w.selectedRoom.type } : null,
        rooms: Array.isArray(w.rooms) ? w.rooms.map((r:any) => ({ id: r.id, name: r.name, type: r.type, isPublic: r.isPublic })) : [],
        unreadCounts: w.unreadCounts,
      };
      el.textContent = fmt(state);
    } catch {}
  }

  // ---------------- Keyboard shortcuts ----------------
  // try {
  //   window.addEventListener('keydown', (ev) => {
  //     if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
  //     const k = ev.key.toLowerCase();
  //     if (k === 'd') { ev.preventDefault(); toggleDock(); }
  //     if (k === 'r') { ev.preventDefault(); try { w.socket?.emit('getRooms'); } catch {} }
  //     if (k === '/') { ev.preventDefault(); const input = document.getElementById('user-search-input') as HTMLInputElement | null; input?.focus(); }
  //     if (k === 's') { ev.preventDefault(); toggleStatsPanel(); }
  //   });
  // } catch {}

  // Mount
  ensureQuickbar();
  // Restore persisted stats visibility after quickbar (panel is mounted by stats.ts)
  try {
    const wantStats = localStorage.getItem('rt:statsVisible') === '1';
    const el = document.getElementById('stats-sidebar-panel');
    if (el) el.style.display = wantStats ? '' : 'none';
  } catch {}
  // Ensure dock exists so keyboard toggle works and open state can be restored independently
  try { ensureDock(); } catch {}
})();
