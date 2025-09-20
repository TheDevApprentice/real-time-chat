// friends.ts - friends list, requests dropdown, badge, and DM helpers
// Depends on global state: currentUser, rooms, pendingDmTargetId, lastFriendItems
// Depends on socket (global)

// DOM references (queried here to decouple from chat-client.ts order)
const btnFriends = document.getElementById(
  "btn-friends"
) as HTMLButtonElement | null;
const btnRequests = document.getElementById(
  "btn-requests"
) as HTMLButtonElement | null;
const requestsBadge = document.getElementById(
  "requests-badge"
) as HTMLElement | null;
const friendsDropdown = document.getElementById(
  "friends-dropdown"
) as HTMLElement | null;
const requestsDropdown = document.getElementById(
  "requests-dropdown"
) as HTMLElement | null;

function hideDropdown(el: HTMLElement | null) {
  if (el) el.hidden = true;
}
function showDropdown(el: HTMLElement | null) {
  if (el) el.hidden = false;
}

// Render friends and requests into dropdowns and update badge
function renderFriends(items: any[]) {
  (window as any).lastFriendItems = items || [];
  const accepted = items.filter((it: any) => it && it.status === "accepted");
  const pending = items.filter(
    (it: any) => it && (it.status === "pending" || it.status === "received")
  );

  // Badge
  if (requestsBadge) {
    const n = pending.length;
    if (n > 0) {
      requestsBadge.textContent = String(n);
      requestsBadge.hidden = false;
    } else {
      requestsBadge.hidden = true;
    }
  }
  // Auto-close requests dropdown when empty
  if (pending.length === 0) {
    hideDropdown(requestsDropdown);
    btnRequests?.setAttribute("aria-expanded", "false");
  }

  if (friendsDropdown) {
    friendsDropdown.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "room-list";
    accepted.forEach((it: any) => {
      const li = document.createElement("li");
      li.className = "room-list-item";
      const name = it.name || "inconnu";
      li.innerHTML = `<span>${name}</span>`;
      const actions = document.createElement("span");
      actions.style.float = "right";

      const callAudioBtn = document.createElement("button");
      callAudioBtn.textContent = "Call (Audio)";
      callAudioBtn.className = "chat-send-btn";
      callAudioBtn.style.marginLeft = "8px";
      callAudioBtn.onclick = () => {
        try { (window as any).startCallAudio?.(it.userId || it.id); } catch {}
      };

      const callVideoBtn = document.createElement("button");
      callVideoBtn.textContent = "Call (Video)";
      callVideoBtn.className = "chat-send-btn";
      callVideoBtn.style.marginLeft = "6px";
      callVideoBtn.onclick = () => {
        try { (window as any).startCallVideo?.(it.userId || it.id); } catch {}
      };

      const msgBtn = document.createElement("button");
      msgBtn.textContent = "Message";
      msgBtn.className = "chat-send-btn";
      msgBtn.style.marginLeft = "6px";
      msgBtn.onclick = () => startDM(it.userId || it.id, name);

      actions.appendChild(callAudioBtn);
      actions.appendChild(callVideoBtn);
      actions.appendChild(msgBtn);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    friendsDropdown.appendChild(ul);
  }

  if (requestsDropdown) {
    requestsDropdown.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "room-list";
    pending.forEach((it: any) => {
      const li = document.createElement("li");
      li.className = "room-list-item";
      const name = it.name || "inconnu";
      const label = document.createElement("span");
      label.textContent = name;
      const actions = document.createElement("span");
      actions.style.float = "right";
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Accepter";
      acceptBtn.className = "chat-send-btn";
      acceptBtn.onclick = () =>
        socket.emit(
          "friendRespond",
          { otherUserId: it.userId, action: "accept" },
          () => requestFriendList()
        );
      const declineBtn = document.createElement("button");
      declineBtn.textContent = "Refuser";
      declineBtn.className = "auth-btn";
      declineBtn.onclick = () =>
        socket.emit(
          "friendRespond",
          { otherUserId: it.userId, action: "reject" },
          () => requestFriendList()
        );
      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);
      li.appendChild(label);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    requestsDropdown.appendChild(ul);
  }
}

function requestFriendList() {
  if (!(window as any).currentUser) return;
  socket.emit("friendList", {}, (resp: any) => {
    if (resp && resp.success) {
      renderFriends(resp.items || []);
    }
    const pendingDmTargetId = (window as any).pendingDmTargetId as
      | string
      | null;
    if (pendingDmTargetId) {
      const friend = (resp.items || []).find(
        (it: any) => it.userId === pendingDmTargetId
      );
      if (friend && friend.status === "accepted") {
        startDM(pendingDmTargetId, friend.name);
        (window as any).pendingDmTargetId = null;
      }
    }
  });
}

// DM helpers
function findExistingDm(friendId: string): any | null {
  const meId = (window as any).currentUser?.id;
  const rooms = ((window as any).rooms as any[]) || [];
  if (!meId) return null;
  return (
    rooms.find((r) => {
      if (r.type !== "user") return false;
      const members: Array<{ id: string; name: string }> = Array.isArray(
        r.users
      )
        ? r.users
        : [];
      const ids = members.map((u) => u && u.id).filter(Boolean);
      return ids.includes(meId) && ids.includes(friendId);
    }) || null
  );
}

function startDM(friendId: string, friendName: string) {
  const currentUser = (window as any).currentUser as {
    id: string;
    name: string;
  } | null;
  if (!currentUser) return;
  const existing = findExistingDm(friendId);
  if (existing) {
    (window as any).joinRoom(existing);
    return;
  }
  (window as any).pendingDmTargetId = friendId;
  const name = `${currentUser.name} ↔ ${friendName}`;
  socket.emit("createRoom", {
    name,
    type: "user",
    isPublic: false,
    invitedUserIds: [friendId],
  });
}

// Toolbar wiring
btnFriends?.addEventListener("click", () => {
  const expanded = btnFriends.getAttribute("aria-expanded") === "true";
  btnFriends.setAttribute("aria-expanded", expanded ? "false" : "true");
  if (expanded) hideDropdown(friendsDropdown);
  else {
    showDropdown(friendsDropdown);
    hideDropdown(requestsDropdown);
    btnRequests?.setAttribute("aria-expanded", "false");
  }
});

btnRequests?.addEventListener("click", () => {
  const last = ((window as any).lastFriendItems as any[]) || [];
  const hasPending = last.some(
    (it: any) => it && (it.status === "pending" || it.status === "received")
  );
  const expanded = btnRequests.getAttribute("aria-expanded") === "true";
  if (!expanded) {
    if (!hasPending) return;
    btnRequests.setAttribute("aria-expanded", "true");
    showDropdown(requestsDropdown);
    hideDropdown(friendsDropdown);
    btnFriends?.setAttribute("aria-expanded", "false");
  } else {
    btnRequests.setAttribute("aria-expanded", "false");
    hideDropdown(requestsDropdown);
  }
});

document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const inFriends = friendsDropdown?.contains(t) || btnFriends?.contains(t);
  const inRequests = requestsDropdown?.contains(t) || btnRequests?.contains(t);
  if (!inFriends) {
    hideDropdown(friendsDropdown);
    btnFriends?.setAttribute("aria-expanded", "false");
  }
  if (!inRequests) {
    hideDropdown(requestsDropdown);
    btnRequests?.setAttribute("aria-expanded", "false");
  }
});
