// search.ts - user search bar behavior and rendering
// Depends on core.ts for debounce and fetch helpers

const userSearchForm = document.getElementById(
  "user-search-form"
) as HTMLFormElement | null;
const userSearchInput = document.getElementById(
  "user-search-input"
) as HTMLInputElement | null;
const userSearchResults = document.getElementById(
  "user-search-results"
) as HTMLElement | null;

async function searchUsers(
  query: string,
  limit = 20
): Promise<Array<{ id: string; name: string }>> {
  const url = `/api/chat/users/search?q=${encodeURIComponent(
    query
  )}&limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return data?.users || [];
}

function renderSearchResults(users: Array<{ id: string; name: string }>) {
  if (!userSearchResults) return;
  userSearchResults.innerHTML = "";
  const currentUser = (window as any).currentUser as {
    id: string;
    name: string;
  } | null;
  const socket = (window as any).socket as any;
  users
    .filter((u) => !currentUser || u.id !== currentUser.id)
    .forEach((u) => {
      const li = document.createElement("li");
      li.className = "room-list-item";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = u.name;
      const actions = document.createElement("span");
      actions.style.float = "right";
      const addBtn = document.createElement("button");
      addBtn.textContent = "+";
      addBtn.title = "Ajouter ami";
      addBtn.className = "chat-send-btn";
      addBtn.style.width = "32px";
      addBtn.style.padding = "4px 0";
      addBtn.onclick = () => {
        const me = (window as any).currentUser as { id: string } | null;
        if (!me) return;
        socket.emit("friendRequest", { targetUserId: u.id }, (_resp: any) => {
          if (typeof (window as any).requestFriendList === "function") {
            try {
              (window as any).requestFriendList();
            } catch {}
          }
        });
      };
      actions.appendChild(addBtn);
      li.appendChild(nameSpan);
      li.appendChild(actions);
      userSearchResults.appendChild(li);
    });
}

(function initUserSearch() {
  if (!userSearchForm || !userSearchInput) return;
  const submitBtn = userSearchForm.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement | null;
  if (submitBtn) submitBtn.style.display = "none";
  userSearchForm.addEventListener("submit", (e) => e.preventDefault());

  const runSearch = debounce(async () => {
    const q = userSearchInput.value.trim();
    if (!q) {
      if (userSearchResults) userSearchResults.innerHTML = "";
      return;
    }
    try {
      const items = await searchUsers(q, 20);
      renderSearchResults(items);
    } catch (_err) {
      if (userSearchResults)
        userSearchResults.innerHTML =
          '<li style="color:#888;">Recherche impossible</li>';
    }
  }, 300);

  userSearchInput.addEventListener("input", runSearch);
})();
