// room_creation.ts - drawer + create room + private invites
(function () {
  const w = window as any;
  if (w.__room_creation_ts_initialized__) return;
  w.__room_creation_ts_initialized__ = true;

  const btnOpenRoomDrawer = document.getElementById(
    "btn-open-room-drawer"
  ) as HTMLButtonElement | null;
  const btnCloseRoomDrawer = document.getElementById(
    "btn-close-room-drawer"
  ) as HTMLButtonElement | null;
  const roomDrawer = document.getElementById(
    "room-drawer"
  ) as HTMLElement | null;

  function openRoomDrawer() {
    if (roomDrawer) roomDrawer.setAttribute("aria-hidden", "false");
  }
  function closeRoomDrawer() {
    if (roomDrawer) roomDrawer.setAttribute("aria-hidden", "true");
  }
  btnOpenRoomDrawer?.addEventListener("click", openRoomDrawer);
  btnCloseRoomDrawer?.addEventListener("click", closeRoomDrawer);
  roomDrawer?.addEventListener("click", (e) => {
    if (e.target === roomDrawer) closeRoomDrawer();
  });

  // Create room form + private toggle + invite
  const createRoomForm = document.getElementById(
    "create-room-form"
  ) as HTMLFormElement | null;
  const createRoomName = document.getElementById(
    "create-room-name"
  ) as HTMLInputElement | null;
  const createRoomPrivate = document.getElementById(
    "create-room-private"
  ) as HTMLInputElement | null;
  const inviteBlock = document.getElementById(
    "private-room-invite"
  ) as HTMLElement | null;
  const inviteFriendsForm = document.getElementById(
    "invite-friends-form"
  ) as HTMLFormElement | null;
  const inviteFriendInput = document.getElementById(
    "invite-friend-input"
  ) as HTMLInputElement | null;
  const inviteFriendResults = document.getElementById(
    "invite-friend-results"
  ) as HTMLElement | null;
  const invitedUsersList = document.getElementById(
    "invited-users"
  ) as HTMLElement | null;

  w.invitedUserIds = w.invitedUserIds || ([] as string[]);
  w.lastFriendItems = w.lastFriendItems || ([] as any[]);

  function renderInvitedUsers() {
    if (!invitedUsersList) return;
    invitedUsersList.innerHTML = "";
    const acceptedFriends = (w.lastFriendItems || []).filter(
      (f: any) => f && f.status === "accepted"
    );
    (w.invitedUserIds as string[]).forEach((id) => {
      const friend = acceptedFriends.find(
        (f: any) => (f.userId || f.id) === id
      );
      const name = friend?.name || "inconnu";
      const li = document.createElement("li");
      li.className = "room-list-item";
      const label = document.createElement("span");
      label.textContent = name;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Retirer";
      removeBtn.className = "auth-btn";
      removeBtn.style.float = "right";
      removeBtn.onclick = () => {
        w.invitedUserIds = (w.invitedUserIds as string[]).filter(
          (x: string) => x !== id
        );
        renderInvitedUsers();
      };
      li.appendChild(label);
      li.appendChild(removeBtn);
      invitedUsersList.appendChild(li);
    });
  }
  w.renderInvitedUsers = renderInvitedUsers;

  function renderInviteFriendResults(
    matches: Array<{ id: string; name: string }>
  ) {
    if (!inviteFriendResults) return;
    inviteFriendResults.innerHTML = "";
    matches.forEach((u) => {
      const li = document.createElement("li");
      li.className = "room-list-item";
      const label = document.createElement("span");
      label.textContent = u.name;
      const addBtn = document.createElement("button");
      const already = (w.invitedUserIds as string[]).includes(u.id);
      addBtn.textContent = already ? "Ajouté" : "Ajouter";
      addBtn.className = already ? "auth-btn" : "chat-send-btn";
      addBtn.style.float = "right";
      addBtn.disabled = already;
      addBtn.onclick = () => {
        if (!(w.invitedUserIds as string[]).includes(u.id)) {
          (w.invitedUserIds as string[]).push(u.id);
          renderInvitedUsers();
          renderInviteFriendResults(matches);
        }
      };
      li.appendChild(label);
      li.appendChild(addBtn);
      inviteFriendResults.appendChild(li);
    });
  }

  function runInviteSearch(query: string) {
    const q = (query || "").toLowerCase();
    const accepted = (w.lastFriendItems || []).filter(
      (f: any) => f && f.status === "accepted"
    );
    const mapped = accepted.map((f: any) => ({
      id: f.userId || f.id,
      name: f.name || "inconnu",
    }));
    const matches = mapped.filter((u: any) => u.name.toLowerCase().includes(q));
    renderInviteFriendResults(matches.slice(0, 30));
  }
  w.runInviteSearch = runInviteSearch;

  if (createRoomPrivate && inviteBlock) {
    createRoomPrivate.addEventListener("change", () => {
      inviteBlock.style.display = createRoomPrivate.checked ? "block" : "none";
      if (createRoomPrivate.checked) {
        try {
          renderInvitedUsers();
        } catch {}
        if (inviteFriendInput)
          try {
            runInviteSearch(inviteFriendInput.value);
          } catch {}
      }
    });
  }

  if (inviteFriendsForm && inviteFriendInput) {
    inviteFriendsForm.addEventListener("submit", (e) => e.preventDefault());
    inviteFriendInput.addEventListener("input", () =>
      runInviteSearch(inviteFriendInput.value)
    );
  }

  if (createRoomForm) {
    createRoomForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const currentUser = w.currentUser;
      const socket = w.socket;
      const name = (createRoomName?.value || "").trim();
      if (!name || !currentUser) return;
      const isPrivate = !!(createRoomPrivate && createRoomPrivate.checked);
      const isPublic = !isPrivate;
      const payload: any = {
        name,
        creatorId: currentUser.id,
        type: "room",
        isPublic,
      };
      if (isPrivate)
        payload.invitedUserIds = (w.invitedUserIds as string[]).slice();
      socket.emit("createRoom", payload);
      if (createRoomName) createRoomName.value = "";
      w.invitedUserIds = [];
      if (invitedUsersList) invitedUsersList.innerHTML = "";
    });
  }
})();
