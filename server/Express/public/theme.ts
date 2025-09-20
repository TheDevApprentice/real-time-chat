// theme.ts - Injects a modern visual theme for the server test UI without modifying CSS files.
// This file will be bundled into chat-client.js via public/tsconfig.json (outFile) along with other TS files.
// It appends a <style> tag at the end of <head> to override existing styles.

(function initThemeGlobals(){
  try {
    (window as any).applyModernTheme = applyModernTheme;
    (window as any).installThemeToggle = installThemeToggle;
  } catch {}
})();

function applyModernTheme() {
  try {
    const id = "modern-theme-overrides";
    if (document.getElementById(id)) return; // already installed

    // Restore saved theme preference before injecting styles
    try {
      const saved = localStorage.getItem('rt:theme');
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {}

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
  } catch {}
}

// Optional: small helper to add a theme toggle button in header
function installThemeToggle() {
  try {
    const header = document.querySelector('.app-header__inner');
    if (!header) return;
    if (document.getElementById('rt-theme-toggle')) return;
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
      try { localStorage.setItem('rt:theme', next); } catch {}
    };
    header.appendChild(btn);
  } catch {}
}
