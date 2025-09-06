// dom.ts - DOM helpers and layout control (desktop-only test UI)
// Exposes global helpers used by other files, no modules/imports.

function getLayoutContainer(): HTMLElement | null {
  return document.querySelector(".chat-root.layout") as HTMLElement | null;
}

// Presence/online small label next to the title
function updatePresenceLabel(text: string) {
  try {
    const selectedRoomTitle = document.getElementById(
      "selected-room-title"
    ) as HTMLElement | null;
    if (!selectedRoomTitle) return;
    const id = "presence-label";
    let span = document.getElementById(id) as HTMLSpanElement | null;
    if (!span) {
      span = document.createElement("span");
      span.id = id;
      span.style.marginLeft = "8px";
      span.style.fontSize = "12px";
      span.style.color = "#888";
      selectedRoomTitle.appendChild(span);
    }
    span.textContent = text || "";
  } catch {}
}

function showSidebar(show: boolean) {
  try {
    const roomPanel = document.getElementById(
      "room-panel"
    ) as HTMLElement | null;
    if (roomPanel) roomPanel.style.display = show ? "block" : "none";
  } catch {}
}

function showChat(show: boolean) {
  try {
    const chatCard = document.getElementById("chat-card") as HTMLElement | null;
    if (chatCard) chatCard.style.display = show ? "block" : "none";
  } catch {}
}

function syncLayoutVisibility() {
  const roomPanel = document.getElementById("room-panel") as HTMLElement | null;
  const chatCard = document.getElementById("chat-card") as HTMLElement | null;
  if (!roomPanel || !chatCard) return;
  const currentUser = (window as any).currentUser;
  const selectedRoom = (window as any).selectedRoom;
  const authed = !!currentUser;
  const layout = getLayoutContainer();
  if (layout) layout.style.display = authed ? "" : "none";
  // Desktop-only: always show sidebar; show chat only when a room is selected
  showSidebar(true);
  showChat(!!selectedRoom);
  // Expand sidebar to full width when no chat is selected
  if (layout) {
    try {
      if (!selectedRoom) layout.classList.add("no-chat");
      else layout.classList.remove("no-chat");
    } catch {}
  }
}

// Typing banner helpers
function ensureTypingBannerEl(): HTMLDivElement | null {
  const title = document.getElementById(
    "selected-room-title"
  ) as HTMLElement | null;
  if (!title) return null;
  let banner = document.getElementById(
    "typing-banner"
  ) as HTMLDivElement | null;
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "typing-banner";
    banner.style.fontSize = "12px";
    banner.style.color = "#888";
    banner.style.margin = "4px 0 8px 0";
    try {
      title.parentElement?.insertBefore(banner, title.nextSibling);
    } catch {}
  }
  return banner;
}

function setTypingBanner(text: string) {
  const banner = ensureTypingBannerEl();
  if (!banner) return;
  try {
    (banner as any).textContent = text || "";
  } catch {}
}

function renderTypingBanner() {
  try {
    const typingUsers = (window as any).typingUsers as Set<string> | undefined;
    const count = typingUsers ? typingUsers.size : 0;
    if (!count || count <= 0) {
      setTypingBanner("");
      return;
    }
    const text =
      count === 1
        ? "Quelqu'un est en train d'écrire…"
        : "Plusieurs personnes écrivent…";
    setTypingBanner(text);
  } catch {}
}
