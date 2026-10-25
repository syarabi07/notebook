import {
  generateInitialsAvatar,
  escapeHtml,
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
} from "../utils/helpers.js";
import { requireAuth, currentUser, currentProfile } from "../modules/auth.js";
import { setCurrentModule } from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import { supabaseClient } from "../config/supabase.js";
import {
  extractAndRegisterPrivacy,
  registerBlockInGlobalRegistry,
  removeBlockFromGlobalRegistry,
  isBlockedWithCurrentUser,
  isUserDeleted,
} from "../utils/storage.js";

// Cached list of real registered classmates from Supabase
let registeredClassmates = [];

export async function loadRegisteredClassmates() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, name, student_id, department, year, avatar_url");

      if (!error && data) {
        registeredClassmates = data
          .filter((p) => {
            if (!p || !p.id) return false;
            if (isUserDeleted(p.id) || isUserDeleted(p.name) || isUserDeleted(p.student_id)) return false;
            if (!p.name || p.name.includes("[Deleted") || p.name.toLowerCase().includes("deleted")) return false;
            if (p.student_id && (p.student_id.includes("[Deleted") || p.student_id.toLowerCase().includes("deleted"))) return false;
            if (p.department === "Deleted" || p.year === "Deleted") return false;
            return true;
          })
          .map((p) => {
            extractAndRegisterPrivacy(p);
            return {
              id: p.id,
              name: p.name || "Campus Student",
              student_id: p.student_id || "Student ID",
              department: p.department || "General",
              deptCode: p.department || "GEN",
              year: p.year || "1st Year",
              avatar_url: p.avatar_url,
              bio: `${p.department || "Campus"} student registered on NITER network.`,
            };
          });
        return registeredClassmates;
      }
    } catch (err) {
      console.warn("Could not fetch registered profiles from Supabase:", err);
    }
  }

  registeredClassmates = [];
  return [];
}

// Local Network State Storage Key & Cache
function getNetworkStorageKey() {
  const selfId = currentProfile ? currentProfile.id : (currentUser ? currentUser.id : "guest");
  return `niter_network_relationships_${selfId}`;
}

function getNetworkStateFromLocalStorage() {
  try {
    const key = getNetworkStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading network state:", err);
  }
  return {
    friends: [],
    sentRequests: [],
    receivedRequests: [],
    blockedUsers: [],
  };
}

function saveNetworkStateToLocalStorage(state) {
  try {
    const key = getNetworkStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.error("Error saving network state:", err);
  }
}

let cachedNetworkState = getNetworkStateFromLocalStorage();

export function getNetworkState() {
  const state = getNetworkStateFromLocalStorage();

  if (state) {
    state.friends = (state.friends || []).filter((id) => {
      const classmate = findClassmate(id);
      const targetName = classmate ? classmate.name : id;
      return !isBlockedWithCurrentUser(id, targetName);
    });

    state.sentRequests = (state.sentRequests || []).filter((id) => {
      const classmate = findClassmate(id);
      const targetName = classmate ? classmate.name : id;
      return !isBlockedWithCurrentUser(id, targetName);
    });

    state.receivedRequests = (state.receivedRequests || []).filter((id) => {
      const classmate = findClassmate(id);
      const targetName = classmate ? classmate.name : id;
      return !isBlockedWithCurrentUser(id, targetName);
    });
  }

  cachedNetworkState = state;
  return cachedNetworkState;
}

export function saveNetworkState(state) {
  cachedNetworkState = state;
  saveNetworkStateToLocalStorage(state);
}

// Clean target user network state across localStorage
export function cleanTargetUserNetworkState(selfId, selfName, targetId, targetName) {
  const idsToRemove = [selfId, selfName].filter(Boolean).map((s) => String(s).toLowerCase());
  if (idsToRemove.length === 0) return;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("niter_network_relationships_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          let changed = false;
          ["friends", "sentRequests", "receivedRequests"].forEach((prop) => {
            if (Array.isArray(parsed[prop])) {
              const originalLength = parsed[prop].length;
              parsed[prop] = parsed[prop].filter(
                (item) => !idsToRemove.includes(String(item).toLowerCase())
              );
              if (parsed[prop].length !== originalLength) {
                changed = true;
              }
            }
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      }
    }
  } catch (e) {
    console.warn("Error cleaning target user network state:", e);
  }
}

// Sync friendship status to Supabase (friendships table is optional/disabled)
async function syncFriendshipToSupabase(targetId, status) {
  // No-op to prevent 404 errors on non-existent table
  return;
}

// Fetch real relationships across users
export async function fetchNetworkStateFromSupabase() {
  const selfId = currentProfile ? currentProfile.id : (currentUser ? currentUser.id : null);

  if (!supabaseClient || !selfId) {
    cachedNetworkState = getNetworkStateFromLocalStorage();
    return cachedNetworkState;
  }

  // Query notifications table for historic network events
  try {
    const { data, error } = await supabaseClient
      .from("notifications")
      .select("*")
      .or(`recipient_id.eq.${selfId},actor_id.eq.${selfId}`)
      .in("type", [
        "friend_request",
        "friend_accept",
        "friend_reject",
        "friend_cancel",
        "friend_unfriend",
        "friend_block",
        "friend_unblock",
      ])
      .order("created_at", { ascending: true });

    if (!error && data) {
      const state = getNetworkStateFromLocalStorage();

      const latestEvents = new Map();

      data.forEach((item) => {
        const otherId = item.actor_id === selfId ? item.recipient_id : item.actor_id;
        if (!otherId || otherId === "all") return;

        latestEvents.set(otherId, {
          type: item.type,
          actor_id: item.actor_id,
          recipient_id: item.recipient_id,
        });
      });

      latestEvents.forEach((evt, otherId) => {
        if (evt.type === "friend_request") {
          if (evt.actor_id === selfId) {
            if (!state.sentRequests.includes(otherId) && !state.friends.includes(otherId)) {
              state.sentRequests.push(otherId);
            }
          } else if (evt.recipient_id === selfId) {
            if (!state.receivedRequests.includes(otherId) && !state.friends.includes(otherId)) {
              state.receivedRequests.push(otherId);
            }
          }
        } else if (evt.type === "friend_accept") {
          if (!state.friends.includes(otherId)) state.friends.push(otherId);
          state.sentRequests = state.sentRequests.filter((id) => id !== otherId);
          state.receivedRequests = state.receivedRequests.filter((id) => id !== otherId);
        } else if (
          evt.type === "friend_reject" ||
          evt.type === "friend_cancel" ||
          evt.type === "friend_unfriend"
        ) {
          state.friends = state.friends.filter((id) => id !== otherId);
          state.sentRequests = state.sentRequests.filter((id) => id !== otherId);
          state.receivedRequests = state.receivedRequests.filter((id) => id !== otherId);
        } else if (evt.type === "friend_block") {
          if (evt.actor_id === selfId) {
            if (!state.blockedUsers.includes(otherId)) state.blockedUsers.push(otherId);
          }
          state.friends = state.friends.filter((id) => id !== otherId);
          state.sentRequests = state.sentRequests.filter((id) => id !== otherId);
          state.receivedRequests = state.receivedRequests.filter((id) => id !== otherId);
        } else if (evt.type === "friend_unblock") {
          if (evt.actor_id === selfId) {
            state.blockedUsers = state.blockedUsers.filter((id) => id !== otherId);
          }
        }
      });

      cachedNetworkState = state;
      saveNetworkStateToLocalStorage(state);
      return state;
    }
  } catch (err) {
    console.warn("Could not fetch network state from notifications table:", err);
  }

  cachedNetworkState = getNetworkStateFromLocalStorage();
  return cachedNetworkState;
}

// Helper to post network notifications to target user
async function sendNetworkNotification(targetId, targetName, eventType, snippetText) {
  const selfId = currentProfile ? currentProfile.id : (currentUser ? currentUser.id : null);
  const selfName = currentProfile ? currentProfile.name : (currentUser ? currentUser.email || "Campus User" : "Campus User");
  const selfAvatar = currentProfile ? currentProfile.avatar_url : null;

  if (supabaseClient && selfId && targetId) {
    try {
      await supabaseClient.from("notifications").insert([
        {
          recipient_id: targetId,
          actor_id: selfId,
          actor_name: selfName,
          actor_avatar: selfAvatar,
          type: eventType,
          snippet: snippetText,
          read: false,
        },
      ]);
    } catch (e) {
      console.warn("Could not insert network notification into Supabase:", e);
    }
  }
}

// Find classmate by ID or Name
export function findClassmate(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  return (
    registeredClassmates.find(
      (c) =>
        c.id === query ||
        c.name.toLowerCase() === q ||
        c.student_id.toLowerCase() === q,
    ) || {
      id: query,
      name: query,
      student_id: "Student",
      department: "Campus",
      deptCode: "GEN",
      year: "1st Year",
      isOnline: true,
      bio: "Registered campus user.",
    }
  );
}

// Get relationship of target user
export function getRelationshipStatus(targetIdOrName) {
  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;
  const state = getNetworkState();

  if (
    state.blockedUsers.includes(targetId) ||
    (targetName && state.blockedUsers.includes(targetName))
  ) {
    return "blocked";
  }

  if (isBlockedWithCurrentUser(targetId, targetName)) {
    return "blocked";
  }

  if (state.friends.includes(targetId)) return "friend";
  if (state.sentRequests.includes(targetId)) return "sent_request";
  if (state.receivedRequests.includes(targetId)) return "received_request";
  return "none";
}

// Actions
export async function addFriend(targetIdOrName) {
  if (!requireAuth("send friend requests")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const state = getNetworkState();

  if (state.blockedUsers.includes(targetId) || isBlockedWithCurrentUser(targetId, targetName)) {
    showToast(`Cannot connect with ${targetName} because of block settings.`, "error");
    return;
  }

  if (state.friends.includes(targetId)) {
    showToast(`You are already friends with ${targetName}.`, "info");
    return;
  }

  if (state.receivedRequests.includes(targetId)) {
    await acceptFriendRequest(targetId);
    return;
  }

  if (!state.sentRequests.includes(targetId)) {
    state.sentRequests.push(targetId);
    saveNetworkState(state);

    await syncFriendshipToSupabase(targetId, "pending");

    await sendNetworkNotification(
      targetId,
      targetName,
      "friend_request",
      "sent you a friend request",
    );

    showToast(`Friend request sent to ${targetName}!`, "success");
    refreshActiveView();
  }
}

export async function unfriendUser(targetIdOrName) {
  if (!requireAuth("unfriend users")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const state = getNetworkState();
  state.friends = state.friends.filter((id) => id !== targetId);
  saveNetworkState(state);

  await syncFriendshipToSupabase(targetId, "none");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_unfriend",
    "unfriended user",
  );

  showToast(`Removed ${targetName} from your friends list.`, "info");
  refreshActiveView();
}

export async function acceptFriendRequest(targetIdOrName) {
  if (!requireAuth("accept friend requests")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  if (isBlockedWithCurrentUser(targetId, targetName)) {
    showToast(`Cannot accept request from ${targetName} because of block settings.`, "error");
    return;
  }

  const state = getNetworkState();
  state.receivedRequests = state.receivedRequests.filter(
    (id) => id !== targetId,
  );
  if (!state.friends.includes(targetId)) {
    state.friends.push(targetId);
  }
  saveNetworkState(state);

  await syncFriendshipToSupabase(targetId, "accepted");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_accept",
    "accepted your friend request",
  );

  showToast(`You and ${targetName} are now friends!`, "success");
  refreshActiveView();
}

export async function rejectFriendRequest(targetIdOrName) {
  if (!requireAuth("decline friend requests")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const state = getNetworkState();
  state.receivedRequests = state.receivedRequests.filter(
    (id) => id !== targetId,
  );
  saveNetworkState(state);

  await syncFriendshipToSupabase(targetId, "none");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_reject",
    "declined friend request",
  );

  showToast(`Declined friend request from ${targetName}.`, "info");
  refreshActiveView();
}

export async function cancelFriendRequest(targetIdOrName) {
  if (!requireAuth("cancel friend requests")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const state = getNetworkState();
  state.sentRequests = state.sentRequests.filter((id) => id !== targetId);
  saveNetworkState(state);

  await syncFriendshipToSupabase(targetId, "none");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_cancel",
    "cancelled friend request",
  );

  showToast(`Cancelled friend request to ${targetName}.`, "info");
  refreshActiveView();
}

export async function blockUser(targetIdOrName) {
  if (!requireAuth("block users")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const selfId = currentUser ? currentUser.id : (currentProfile ? currentProfile.id : null);
  const selfName = currentProfile ? currentProfile.name : (currentUser ? currentUser.email : null);

  const state = getNetworkState();
  if (!state.blockedUsers.includes(targetId)) {
    state.blockedUsers.push(targetId);
  }
  if (targetName && !state.blockedUsers.includes(targetName)) {
    state.blockedUsers.push(targetName);
  }

  state.friends = state.friends.filter((id) => id !== targetId && id !== targetName);
  state.sentRequests = state.sentRequests.filter((id) => id !== targetId && id !== targetName);
  state.receivedRequests = state.receivedRequests.filter(
    (id) => id !== targetId && id !== targetName,
  );
  saveNetworkState(state);

  // Register in Global Block Registry
  registerBlockInGlobalRegistry(selfId, targetId);
  registerBlockInGlobalRegistry(selfId, targetName);
  if (selfName) {
    registerBlockInGlobalRegistry(selfName, targetId);
    registerBlockInGlobalRegistry(selfName, targetName);
  }

  // Clean target user network state across localStorage
  cleanTargetUserNetworkState(selfId, selfName, targetId, targetName);

  await syncFriendshipToSupabase(targetId, "blocked");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_block",
    "blocked user",
  );

  showToast(`${targetName} has been blocked.`, "info");
  refreshActiveView();
}

export async function unblockUser(targetIdOrName) {
  if (!requireAuth("unblock users")) return;

  const classmate = findClassmate(targetIdOrName);
  const targetId = classmate ? classmate.id : targetIdOrName;
  const targetName = classmate ? classmate.name : targetIdOrName;

  const selfId = currentUser ? currentUser.id : (currentProfile ? currentProfile.id : null);
  const selfName = currentProfile ? currentProfile.name : (currentUser ? currentUser.email : null);

  const state = getNetworkState();
  state.blockedUsers = state.blockedUsers.filter((id) => id !== targetId && id !== targetName);
  saveNetworkState(state);

  // Remove from Global Block Registry
  removeBlockFromGlobalRegistry(selfId, targetId);
  removeBlockFromGlobalRegistry(selfId, targetName);
  if (selfName) {
    removeBlockFromGlobalRegistry(selfName, targetId);
    removeBlockFromGlobalRegistry(selfName, targetName);
  }

  await syncFriendshipToSupabase(targetId, "none");

  await sendNetworkNotification(
    targetId,
    targetName,
    "friend_unblock",
    "unblocked user",
  );

  showToast(`${targetName} has been unblocked.`, "success");
  refreshActiveView();
}

// Toast Helper
function showToast(message, type = "info") {
  let toastEl = document.getElementById("network-toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "network-toast";
    toastEl.className = "network-toast";
    document.body.appendChild(toastEl);
  }

  toastEl.innerText = message;
  toastEl.setAttribute("data-type", type);
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
}

// Active Tab Tracking
let currentActiveTab = "online-friends";
let currentSearchQuery = "";

function refreshActiveView() {
  const networkContainer = document.getElementById("network-page-container");
  if (networkContainer) {
    renderFriendsPage(currentActiveTab);
  } else {
    try {
      const curMod = getCurrentModule();
      if (curMod) {
        import("../modules/navigation.js").then(({ switchModule }) => {
          switchModule(curMod);
        });
      }
    } catch (e) {}
  }
}

// RENDER FRIENDS & NETWORK PAGE
export async function renderFriendsPage(tab = "online-friends") {
  setCurrentModule("friends");
  currentActiveTab = tab;
  renderSidebarMenu("home");
  clearNavActiveStates();
  renderRightSidebar("standard");

  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");
  const postsFeed = document.getElementById("posts-feed");

  if (pageTitle) pageTitle.innerText = "Friends & Network";
  if (pageEyebrow) pageEyebrow.innerText = "CAMPUS NETWORK";
  if (pageSub)
    pageSub.innerText =
      "Connect with real registered classmates on NITER network, manage friend requests, and chat.";
  if (moduleBadge) moduleBadge.innerText = "NETWORK";

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  // If user is not logged in, display Auth Required Banner & return early
  if (!currentUser || !currentProfile) {
    renderMetrics([
      { label: "Friend Requests", val: "0" },
      { label: "Blocked", val: "0" },
    ]);

    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="users"></i>
          </div>
          <h3>Connect with Friends & Classmates</h3>
          <p>Please <strong>Log In</strong> or <strong>Sign Up</strong> for getting connected with friends and classmates, sending friend requests, and building your campus network.</p>
          <div class="network-auth-actions">
            <button class="btn btn-primary" id="friends-login-btn">
              <i data-lucide="log-in"></i> <span>Log In</span>
            </button>
            <button class="btn btn-outline" id="friends-signup-btn">
              <i data-lucide="user-plus"></i> <span>Sign Up</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      const loginBtn = document.getElementById("friends-login-btn");
      const signupBtn = document.getElementById("friends-signup-btn");
      if (loginBtn) {
        loginBtn.addEventListener("click", () => {
          const authModal = document.getElementById("auth-modal");
          const overlay = document.getElementById("overlay");
          if (authModal) authModal.classList.add("open");
          if (overlay) overlay.classList.add("active");
          const loginTab = document.getElementById("tab-login");
          if (loginTab) loginTab.click();
        });
      }
      if (signupBtn) {
        signupBtn.addEventListener("click", () => {
          const authModal = document.getElementById("auth-modal");
          const overlay = document.getElementById("overlay");
          if (authModal) authModal.classList.add("open");
          if (overlay) overlay.classList.add("active");
          const signupTab = document.getElementById("tab-signup");
          if (signupTab) signupTab.click();
        });
      }
    }
    return;
  }

  // Load registered profiles and network relationships from Supabase database
  await loadRegisteredClassmates();
  await fetchNetworkStateFromSupabase();

  // Highlight active submenu in left navigation
  document.querySelectorAll(".submenu-item").forEach((el) => {
    const text = el.innerText.trim().toLowerCase();
    let isMatch = false;
    if ((tab === "online-friends" || tab === "my-friends") && text === "my friends") {
      isMatch = true;
    } else if (tab === "all-classmates" && text === "all classmates") {
      isMatch = true;
    } else if (tab === "friend-requests" && text === "friend requests") {
      isMatch = true;
    } else if (tab === "blocked-list" && text === "blocked list") {
      isMatch = true;
    }

    if (isMatch) {
      el.classList.add("active");
      const navGroup = el.closest(".nav-group");
      if (navGroup) {
        const btn = navGroup.querySelector(".menu-item-btn");
        const wrapper = navGroup.querySelector(".submenu-wrapper");
        if (btn && wrapper) {
          btn.classList.add("expanded");
          btn.setAttribute("aria-expanded", "true");
          wrapper.classList.add("open");
        }
      }
    } else {
      el.classList.remove("active");
    }
  });

  const state = getNetworkState();

  // Determine current user's year (defaults to 1st Year if guest)
  const userYear = currentProfile ? currentProfile.year : "1st Year";

  // Calculate Metrics
  const totalFriendsCount = state.friends.length;
  const pendingRequestsCount = state.receivedRequests.length;
  const selfId = currentUser ? currentUser.id : null;
  const blockedClassmates = registeredClassmates.filter(
    (c) =>
      c.id !== selfId &&
      (state.blockedUsers.includes(c.id) || (c.name && state.blockedUsers.includes(c.name)))
  );
  const matchedIdentifiers = new Set();
  blockedClassmates.forEach((c) => {
    matchedIdentifiers.add(c.id);
    if (c.name) matchedIdentifiers.add(c.name);
  });
  const unmatchedBlockedItems = state.blockedUsers.filter(
    (item) => item && !matchedIdentifiers.has(item)
  );
  const blockedCount = blockedClassmates.length + unmatchedBlockedItems.length;

  renderMetrics([
    { label: "Friend Requests", val: `${pendingRequestsCount}` },
    { label: "Blocked", val: `${blockedCount}` },
  ]);

  if (!postsFeed) return;

  postsFeed.innerHTML = `
    <div class="network-page-container" id="network-page-container">
      <!-- Tabs Navigation Header -->
      <div class="network-tabs-bar">
        <button class="network-tab-btn ${tab === "online-friends" ? "active" : ""}" data-tab="online-friends">
          <i data-lucide="users"></i>
          <span>My Friends</span>
          <span class="network-tab-count">${totalFriendsCount}</span>
        </button>

        <button class="network-tab-btn ${tab === "all-classmates" ? "active" : ""}" data-tab="all-classmates">
          <i data-lucide="users"></i>
          <span>All Classmates (${escapeHtml(userYear)})</span>
        </button>

        <button class="network-tab-btn ${tab === "friend-requests" ? "active" : ""}" data-tab="friend-requests">
          <i data-lucide="user-plus"></i>
          <span>Friend Requests</span>
          ${pendingRequestsCount > 0 ? `<span class="network-tab-count alert">${pendingRequestsCount}</span>` : ""}
        </button>

        <button class="network-tab-btn ${tab === "blocked-list" ? "active" : ""}" data-tab="blocked-list">
          <i data-lucide="shield-off"></i>
          <span>Blocked List</span>
          ${blockedCount > 0 ? `<span class="network-tab-count">${blockedCount}</span>` : ""}
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="network-search-bar">
        <div class="network-search-input-wrap">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="network-search-input" placeholder="Search signed up members by name, student ID, or department..." value="${escapeHtml(currentSearchQuery)}" aria-label="Search members by name, student ID, or department">
        </div>
      </div>

      <!-- Tab Content Panel -->
      <div class="network-tab-content" id="network-tab-content">
        ${renderTabContent(tab, state, userYear)}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach Event Listeners
  attachNetworkEventListeners(tab);
}

function renderTabContent(tab, state, userYear) {
  const query = currentSearchQuery.toLowerCase().trim();
  const selfId = currentProfile ? currentProfile.id : (currentUser ? currentUser.id : null);

  if (tab === "online-friends") {
    const friendUsers = registeredClassmates.filter(
      (c) =>
        c.id !== selfId &&
        !isUserDeleted(c.id) &&
        !isUserDeleted(c.name) &&
        state.friends.includes(c.id) &&
        !state.blockedUsers.includes(c.id) &&
        !isBlockedWithCurrentUser(c.id, c.name) &&
        (c.name.toLowerCase().includes(query) ||
          c.student_id.toLowerCase().includes(query) ||
          c.department.toLowerCase().includes(query)),
    );

    if (friendUsers.length === 0) {
      return `
        <div class="network-empty-state">
          <i data-lucide="user-x"></i>
          <h3>No Friends Found</h3>
          <p>${query ? "No friends match your search query." : "You haven't added any registered friends yet. Explore 'All Classmates' to connect!"}</p>
        </div>
      `;
    }

    return `
      <div class="network-grid">
        ${friendUsers
          .map((user) => {
            const avatar = user.avatar_url || generateInitialsAvatar(user.name, "#2A46FF");
            return `
            <div class="network-card">
              <div class="network-card-top">
                <div class="network-avatar-wrap">
                  <img src="${avatar}" alt="${escapeHtml(user.name)}" class="network-avatar post-avatar-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">
                </div>
                <div class="network-user-details">
                  <h4 class="network-user-name post-author-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</h4>
                  <div class="network-badges">
                    <span class="net-badge id">${escapeHtml(user.student_id)}</span>
                    <span class="net-badge">${escapeHtml(user.deptCode)}</span>
                    <span class="net-badge">${escapeHtml(user.year)}</span>
                  </div>
                </div>
              </div>
              <p class="network-user-bio">${escapeHtml(user.bio)}</p>
              <div class="network-card-actions">
                <button class="btn-network-action outline btn-unfriend-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="user-minus"></i>
                  <span>Unfriend</span>
                </button>
                <button class="btn-network-action danger-icon btn-block-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}" title="Block User">
                  <i data-lucide="shield-alert"></i>
                </button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  if (tab === "all-classmates") {
    // Show signed-up users in the same year as current user (excluding self)
    const classmates = registeredClassmates.filter((c) => {
      if (selfId && c.id === selfId) return false;
      if (isUserDeleted(c.id) || isUserDeleted(c.name) || isUserDeleted(c.student_id)) return false;
      if (state.blockedUsers.includes(c.id)) return false;
      if (isBlockedWithCurrentUser(c.id, c.name)) return false;

      const cYear = String(c.year || "").trim().toLowerCase();
      const myYear = String(userYear || "1st Year").trim().toLowerCase();
      const matchesYear = cYear === myYear;

      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.student_id.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query);

      return matchesYear && matchesQuery;
    });

    if (classmates.length === 0) {
      return `
        <div class="network-empty-state">
          <i data-lucide="users"></i>
          <h3>No Classmates Found in ${escapeHtml(userYear)}</h3>
          <p>${query ? "No classmates in your year match your search query." : `No other ${escapeHtml(userYear)} students have registered yet. Invite your batchmates to join!`}</p>
        </div>
      `;
    }

    return `
      <div class="network-grid">
        ${classmates
          .map((user) => {
            const avatar = user.avatar_url || generateInitialsAvatar(user.name, "#2A46FF");
            const rel = getRelationshipStatus(user.id);

            let actionButtons = "";
            if (rel === "friend") {
              actionButtons = `
                <button class="btn-network-action secondary btn-unfriend-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="user-check"></i>
                  <span>Friends (Unfriend)</span>
                </button>
              `;
            } else if (rel === "sent_request") {
              actionButtons = `
                <button class="btn-network-action outline btn-cancel-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="clock"></i>
                  <span>Request Sent (Cancel)</span>
                </button>
              `;
            } else if (rel === "received_request") {
              actionButtons = `
                <button class="btn-network-action primary btn-accept-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="user-plus"></i>
                  <span>Accept</span>
                </button>
                <button class="btn-network-action outline btn-reject-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <span>Decline</span>
                </button>
              `;
            } else {
              actionButtons = `
                <button class="btn-network-action primary btn-add-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="user-plus"></i>
                  <span>Add Friend</span>
                </button>
              `;
            }

            return `
            <div class="network-card">
              <div class="network-card-top">
                <div class="network-avatar-wrap">
                  <img src="${avatar}" alt="${escapeHtml(user.name)}" class="network-avatar post-avatar-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">
                </div>
                <div class="network-user-details">
                  <h4 class="network-user-name post-author-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</h4>
                  <div class="network-badges">
                    <span class="net-badge id">${escapeHtml(user.student_id)}</span>
                    <span class="net-badge">${escapeHtml(user.deptCode)}</span>
                    <span class="net-badge highlight">${escapeHtml(user.year)}</span>
                  </div>
                </div>
              </div>
              <p class="network-user-bio">${escapeHtml(user.bio)}</p>
              <div class="network-card-actions">
                ${actionButtons}
                <button class="btn-network-action danger-icon btn-block-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}" title="Block User">
                  <i data-lucide="shield-alert"></i>
                </button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  if (tab === "friend-requests") {
    const receivedUsers = registeredClassmates.filter(
      (c) =>
        c.id !== selfId &&
        state.receivedRequests.includes(c.id) &&
        !state.blockedUsers.includes(c.id) &&
        !isBlockedWithCurrentUser(c.id, c.name) &&
        (c.name.toLowerCase().includes(query) ||
          c.student_id.toLowerCase().includes(query)),
    );

    const sentUsers = registeredClassmates.filter(
      (c) =>
        c.id !== selfId &&
        state.sentRequests.includes(c.id) &&
        !state.blockedUsers.includes(c.id) &&
        !isBlockedWithCurrentUser(c.id, c.name) &&
        (c.name.toLowerCase().includes(query) ||
          c.student_id.toLowerCase().includes(query)),
    );

    if (receivedUsers.length === 0 && sentUsers.length === 0) {
      return `
        <div class="network-empty-state">
          <i data-lucide="inbox"></i>
          <h3>No Pending Requests</h3>
          <p>You have no incoming or outgoing friend requests at this time.</p>
        </div>
      `;
    }

    return `
      <div class="requests-section">
        ${
          receivedUsers.length > 0
            ? `
          <h3 class="requests-section-title"><i data-lucide="arrow-down-left"></i> Received Friend Requests (${receivedUsers.length})</h3>
          <div class="network-grid margin-bottom">
            ${receivedUsers
              .map((user) => {
                const avatar = user.avatar_url || generateInitialsAvatar(user.name, "#2A46FF");
                return `
                <div class="network-card highlight-card">
                  <div class="network-card-top">
                    <div class="network-avatar-wrap">
                      <img src="${avatar}" alt="${escapeHtml(user.name)}" class="network-avatar post-avatar-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">
                    </div>
                    <div class="network-user-details">
                      <h4 class="network-user-name post-author-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</h4>
                      <div class="network-badges">
                        <span class="net-badge id">${escapeHtml(user.student_id)}</span>
                        <span class="net-badge">${escapeHtml(user.deptCode)}</span>
                        <span class="net-badge">${escapeHtml(user.year)}</span>
                      </div>
                    </div>
                  </div>
                  <div class="network-card-actions">
                    <button class="btn-network-action primary btn-accept-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                      <i data-lucide="user-check"></i>
                      <span>Accept Request</span>
                    </button>
                    <button class="btn-network-action outline btn-reject-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                      <i data-lucide="x"></i>
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        `
            : ""
        }

        ${
          sentUsers.length > 0
            ? `
          <h3 class="requests-section-title"><i data-lucide="arrow-up-right"></i> Sent Friend Requests (${sentUsers.length})</h3>
          <div class="network-grid">
            ${sentUsers
              .map((user) => {
                const avatar = user.avatar_url || generateInitialsAvatar(user.name, "#6B7280");
                return `
                <div class="network-card">
                  <div class="network-card-top">
                    <div class="network-avatar-wrap">
                      <img src="${avatar}" alt="${escapeHtml(user.name)}" class="network-avatar post-avatar-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">
                    </div>
                    <div class="network-user-details">
                      <h4 class="network-user-name post-author-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</h4>
                      <div class="network-badges">
                        <span class="net-badge id">${escapeHtml(user.student_id)}</span>
                        <span class="net-badge">${escapeHtml(user.deptCode)}</span>
                      </div>
                    </div>
                  </div>
                  <div class="network-card-actions">
                    <button class="btn-network-action outline btn-cancel-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                      <i data-lucide="user-x"></i>
                      <span>Cancel Request</span>
                    </button>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  if (tab === "blocked-list") {
    const blockedUsers = registeredClassmates.filter(
      (c) =>
        c.id !== selfId &&
        (state.blockedUsers.includes(c.id) || (c.name && state.blockedUsers.includes(c.name))) &&
        (c.name.toLowerCase().includes(query) ||
          c.student_id.toLowerCase().includes(query)),
    );

    if (blockedUsers.length === 0) {
      return `
        <div class="network-empty-state">
          <i data-lucide="shield-check"></i>
          <h3>No Blocked Users</h3>
          <p>Your blocked list is currently empty.</p>
        </div>
      `;
    }

    return `
      <div class="network-grid">
        ${blockedUsers
          .map((user) => {
            const avatar = user.avatar_url || generateInitialsAvatar(user.name, "#DC2626");
            return `
            <div class="network-card danger-border">
              <div class="network-card-top">
                <div class="network-avatar-wrap">
                  <img src="${avatar}" alt="${escapeHtml(user.name)}" class="network-avatar post-avatar-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">
                </div>
                <div class="network-user-details">
                  <h4 class="network-user-name post-author-clickable" data-author-id="${user.id}" data-author-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</h4>
                  <div class="network-badges">
                    <span class="net-badge id">${escapeHtml(user.student_id)}</span>
                    <span class="net-badge danger">Blocked</span>
                  </div>
                </div>
              </div>
              <div class="network-card-actions">
                <button class="btn-network-action primary btn-unblock-action" data-id="${user.id}" data-name="${escapeHtml(user.name)}">
                  <i data-lucide="shield-off"></i>
                  <span>Unblock User</span>
                </button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  return "";
}

function attachNetworkEventListeners(activeTab) {
  // Tab Switchers
  document.querySelectorAll(".network-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      renderFriendsPage(targetTab);
    });
  });

  // Search Input
  const searchInput = document.getElementById("network-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      const tabContent = document.getElementById("network-tab-content");
      if (tabContent) {
        tabContent.innerHTML = renderTabContent(
          activeTab,
          getNetworkState(),
          currentProfile ? currentProfile.year : "1st Year",
        );
        if (window.lucide) window.lucide.createIcons();
        attachActionBtnListeners();
      }
    });
  }

  attachActionBtnListeners();
}

function attachActionBtnListeners() {
  // Add Friend
  document.querySelectorAll(".btn-add-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      addFriend(btn.dataset.id);
    });
  });

  // Unfriend
  document.querySelectorAll(".btn-unfriend-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      unfriendUser(btn.dataset.id);
    });
  });

  // Accept Request
  document.querySelectorAll(".btn-accept-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      acceptFriendRequest(btn.dataset.id);
    });
  });

  // Reject Request
  document.querySelectorAll(".btn-reject-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      rejectFriendRequest(btn.dataset.id);
    });
  });

  // Cancel Request
  document.querySelectorAll(".btn-cancel-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      cancelFriendRequest(btn.dataset.id);
    });
  });

  // Block User
  document.querySelectorAll(".btn-block-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      blockUser(btn.dataset.id);
    });
  });

  // Unblock User
  document.querySelectorAll(".btn-unblock-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      unblockUser(btn.dataset.id);
    });
  });
}
