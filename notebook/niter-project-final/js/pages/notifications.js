import { supabaseClient } from "../config/supabase.js";
import {
  generateInitialsAvatar,
  escapeHtml,
  formatTimeAgo,
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
} from "../utils/helpers.js";
import { currentUser, currentProfile } from "../modules/auth.js";
import { setCurrentModule } from "../modules/feed.js";
import { removeProfileHeaderCard } from "./profile.js";
import { switchModule } from "../modules/navigation.js";
import { isBlockedWithCurrentUser } from "../utils/storage.js";

const NOTIF_STORAGE_KEY = "notebook_notifications_v2";

export function updateNavNotifBadge() {
  const notifs = getLocalNotifications();
  const unread = notifs.filter((n) => !n.read).length;
  document.querySelectorAll(".nav-notif-badge").forEach((badge) => {
    if (unread > 0) {
      badge.innerText = unread > 99 ? "99+" : `${unread}`;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  });
}

function getLocalNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const selfId = currentUser ? currentUser.id : null;
        const selfProfileId = currentProfile ? currentProfile.id : null;
        const selfName = currentProfile ? currentProfile.name : null;

        // Purge any legacy fake seed notifications and self-notifications
        const realNotifs = parsed.filter((n) => {
          if (!n || !n.id || String(n.id).startsWith("notif_seed_")) return false;

          const isSelfActor =
            (n.actorId && (n.actorId === selfId || n.actorId === selfProfileId)) ||
            (selfName && n.actorName === selfName);

          const isRecipient =
            !n.recipientId ||
            n.recipientId === "all" ||
            (selfId && n.recipientId === selfId) ||
            (selfProfileId && n.recipientId === selfProfileId) ||
            (selfName && n.recipientId === selfName);

          // Hide notification if the current user was the actor who initiated it
          if (isSelfActor) return false;

          // Hide notification if current user is not the intended recipient
          if (!isRecipient) return false;

          // Hide notification if actor is blocked
          if (isBlockedWithCurrentUser(n.actorId, n.actorName)) return false;

          return true;
        });
        return realNotifs;
      }
    }
  } catch (err) {
    console.error("Error reading notifications from localStorage:", err);
  }

  return [];
}

export function getNotifications() {
  return getLocalNotifications();
}

export async function fetchNotifications() {
  let localNotifs = getLocalNotifications();

  if (supabaseClient && currentUser) {
    try {
      const { data, error } = await supabaseClient
        .from("notifications")
        .select("*")
        .or(`recipient_id.eq.${currentUser.id},recipient_id.eq.all`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        const remoteMapped = data.map((n) => ({
          id: String(n.id),
          recipientId: n.recipient_id,
          actorId: n.actor_id,
          actorName: n.actor_name || "Campus User",
          actorAvatar:
            n.actor_avatar || generateInitialsAvatar(n.actor_name || "Campus User"),
          type: n.type,
          postId: n.post_id ? String(n.post_id) : "",
          commentId: n.comment_id ? String(n.comment_id) : "",
          postSnippet: n.snippet || "",
          createdAt: n.created_at,
          read: n.read || false,
        }));

        // Merge remote + local without duplicates
        const map = new Map();
        [...remoteMapped, ...localNotifs].forEach((item) => {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        try {
          localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}

        localNotifs = merged;
      }
    } catch (err) {
      console.warn("Supabase notification fetch warning (falling back to cache):", err);
    }
  }

  updateNavNotifBadge();
  return localNotifs;
}

export async function addNotification({
  recipientId,
  actorId,
  actorName,
  actorAvatar,
  type,
  postId,
  commentId,
  postSnippet,
}) {
  const currentActorName =
    actorName || (currentProfile ? currentProfile.name : "Campus User");
  const currentActorId = actorId || (currentUser ? currentUser.id : "guest");

  const selfId = currentUser ? currentUser.id : null;
  const selfProfileId = currentProfile ? currentProfile.id : null;
  const selfName = currentProfile ? currentProfile.name : null;

  const isSelfActor =
    (actorId && (actorId === selfId || actorId === selfProfileId)) ||
    currentActorId === selfId ||
    currentActorId === selfProfileId ||
    (selfName && currentActorName === selfName);

  // Prevent creating notification if recipient is the actor themselves
  const isActorRecipient =
    recipientId &&
    (recipientId === currentActorId ||
      recipientId === currentActorName ||
      (actorId && recipientId === actorId) ||
      (selfId && recipientId === selfId && isSelfActor) ||
      (selfProfileId && recipientId === selfProfileId && isSelfActor) ||
      (selfName && recipientId === selfName && isSelfActor));

  if (isActorRecipient) {
    return;
  }

  // Prevent creating notification if recipient or actor is blocked
  if (isBlockedWithCurrentUser(recipientId, null) || isBlockedWithCurrentUser(currentActorId, currentActorName)) {
    return;
  }

  const newNotif = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    recipientId: recipientId || "all",
    actorId: currentActorId,
    actorName: currentActorName,
    actorAvatar:
      actorAvatar ||
      (currentProfile && currentProfile.avatar_url
        ? currentProfile.avatar_url
        : generateInitialsAvatar(currentActorName)),
    type: type || "like_post",
    postId: postId ? String(postId) : "",
    commentId: commentId ? String(commentId) : "",
    postSnippet: postSnippet || "",
    createdAt: new Date().toISOString(),
    read: false,
  };

  const currentNotifs = getLocalNotifications();
  currentNotifs.unshift(newNotif);
  const trimmed = currentNotifs.slice(0, 50);

  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("Failed to save notification:", err);
  }

  updateNavNotifBadge();

  if (supabaseClient) {
    try {
      await supabaseClient.from("notifications").insert([
        {
          recipient_id: recipientId || "all",
          actor_id: currentActorId,
          actor_name: currentActorName,
          actor_avatar: newNotif.actorAvatar,
          type: type || "like_post",
          post_id: postId ? String(postId) : null,
          comment_id: commentId ? String(commentId) : null,
          snippet: postSnippet || "",
          read: false,
        },
      ]);
    } catch (e) {
      console.warn("Could not insert notification to Supabase:", e);
    }
  }
}

export async function markNotificationAsRead(notifId) {
  const notifs = getLocalNotifications();
  let updated = false;
  notifs.forEach((n) => {
    if (n.id === notifId) {
      n.read = true;
      updated = true;
    }
  });

  if (updated) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
    } catch (e) {}
  }

  updateNavNotifBadge();

  if (supabaseClient && currentUser) {
    try {
      await supabaseClient
        .from("notifications")
        .update({ read: true })
        .eq("id", notifId);
    } catch (e) {}
  }
}

export async function markAllNotificationsAsRead() {
  const notifs = getLocalNotifications();
  notifs.forEach((n) => (n.read = true));
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  } catch (e) {}

  updateNavNotifBadge();

  if (supabaseClient && currentUser) {
    try {
      await supabaseClient
        .from("notifications")
        .update({ read: true })
        .or(`recipient_id.eq.${currentUser.id},recipient_id.eq.all`);
    } catch (e) {}
  }
}

export async function clearAllNotifications() {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {}

  updateNavNotifBadge();

  if (supabaseClient && currentUser) {
    try {
      await supabaseClient
        .from("notifications")
        .delete()
        .or(`recipient_id.eq.${currentUser.id},recipient_id.eq.all`);
    } catch (e) {}
  }
}

let currentFilter = "all";

export async function renderNotificationsPage() {
  setCurrentModule("notifications");
  clearNavActiveStates();
  renderRightSidebar("notifications");
  clearNavActiveStates();

  removeProfileHeaderCard();

  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");

  if (pageTitle) pageTitle.innerText = "Notifications";
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText =
      "Stay updated when classmates like your posts, comment, or reply to your thoughts.";
  if (moduleBadge) moduleBadge.innerText = "NOTIFICATIONS";

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");
  if (feedTitle) feedTitle.innerText = "Recent Campus Activity";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> UPDATES`;

  const postsFeed = document.getElementById("posts-feed");
  if (!postsFeed) return;

  const notifs = await fetchNotifications();
  const unreadCount = notifs.filter((n) => !n.read).length;

  renderMetrics([
    { label: "Total Notifications", val: `${notifs.length}` },
    { label: "Unread Updates", val: `${unreadCount}` },
  ]);

  postsFeed.innerHTML = `
    <div class="notifications-page-container">
        <div class="notif-controls-bar">
            <div class="notif-tabs">
                <button type="button" class="notif-tab-btn ${currentFilter === "all" ? "active" : ""}" data-notif-filter="all">
                    All Notifications <span class="notif-count-pill">${notifs.length}</span>
                </button>
                <button type="button" class="notif-tab-btn ${currentFilter === "likes" ? "active" : ""}" data-notif-filter="likes">
                    ❤️ Likes
                </button>
                <button type="button" class="notif-tab-btn ${currentFilter === "comments" ? "active" : ""}" data-notif-filter="comments">
                    💬 Comments & Replies
                </button>
                <button type="button" class="notif-tab-btn ${currentFilter === "unread" ? "active" : ""}" data-notif-filter="unread">
                    🔵 Unread (${unreadCount})
                </button>
            </div>

            <div class="notif-bulk-actions">
                <button type="button" class="btn-notif-action" id="btn-mark-all-read" title="Mark all notifications as read">
                    <i data-lucide="check-check"></i>
                    <span>Mark all read</span>
                </button>
                <button type="button" class="btn-notif-action text-danger" id="btn-clear-all-notif" title="Clear all notifications">
                    <i data-lucide="trash-2"></i>
                    <span>Clear</span>
                </button>
            </div>
        </div>

        <div class="notif-list" id="notif-list-items">
            ${renderNotifListHTML(notifs, currentFilter)}
        </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  attachNotifPageListeners();
}

function renderNotifListHTML(allNotifs, filter) {
  let filtered = allNotifs;

  if (filter === "likes") {
    filtered = allNotifs.filter(
      (n) => n.type === "like_post" || n.type === "like_comment",
    );
  } else if (filter === "comments") {
    filtered = allNotifs.filter(
      (n) => n.type === "comment_post" || n.type === "reply_comment",
    );
  } else if (filter === "unread") {
    filtered = allNotifs.filter((n) => !n.read);
  }

  if (filtered.length === 0) {
    return `
      <div class="empty-notif-card">
          <div class="empty-notif-icon"><i data-lucide="bell-off"></i></div>
          <h3>No notifications found</h3>
          <p>When students interact with your posts or replies, you'll see them right here!</p>
      </div>
    `;
  }

  return filtered
    .map((n) => {
      let icon = "bell";
      let iconBg = "rgba(42, 70, 255, 0.1)";
      let iconColor = "#2A46FF";
      let actionText = "interacted with your post";

      if (n.type === "like_post") {
        icon = "heart";
        iconBg = "rgba(239, 68, 68, 0.12)";
        iconColor = "#EF4444";
        actionText = "liked your post";
      } else if (n.type === "like_comment") {
        icon = "heart";
        iconBg = "rgba(239, 68, 68, 0.12)";
        iconColor = "#EF4444";
        actionText = "liked your comment";
      } else if (n.type === "comment_post") {
        icon = "message-square";
        iconBg = "rgba(16, 185, 129, 0.12)";
        iconColor = "#10B981";
        actionText = "commented on your post";
      } else if (n.type === "reply_comment") {
        icon = "corner-down-right";
        iconBg = "rgba(124, 58, 237, 0.12)";
        iconColor = "#7C3AED";
        actionText = "replied to your comment";
      } else if (n.type === "tag_post") {
        icon = "user-check";
        iconBg = "rgba(42, 70, 255, 0.12)";
        iconColor = "#2A46FF";
        actionText = "tagged you in a post";
      }

      const snippetText = n.postSnippet
        ? `<div class="notif-snippet">"${escapeHtml(n.postSnippet)}"</div>`
        : "";

      const unreadBadge = !n.read
        ? `<span class="notif-unread-dot" title="Unread notification"></span>`
        : "";

      return `
        <div class="notif-item ${!n.read ? "unread" : ""}" data-notif-id="${n.id}" data-post-id="${n.postId}">
            <div class="notif-avatar-wrapper">
                <img src="${n.actorAvatar}" alt="${escapeHtml(n.actorName)}" class="notif-avatar">
                <div class="notif-badge-icon" style="background: ${iconBg}; color: ${iconColor};">
                    <i data-lucide="${icon}"></i>
                </div>
            </div>

            <div class="notif-body">
                <div class="notif-title-row">
                    <span class="notif-text">
                        <strong class="notif-actor-name">${escapeHtml(n.actorName)}</strong> ${actionText}
                    </span>
                    ${unreadBadge}
                </div>
                ${snippetText}
                <span class="notif-timestamp">${formatTimeAgo(n.createdAt)}</span>
            </div>

            <button type="button" class="btn-delete-notif" data-delete-notif="${n.id}" title="Remove notification">
                <i data-lucide="x"></i>
            </button>
        </div>
      `;
    })
    .join("");
}

function attachNotifPageListeners() {
  const container = document.querySelector(".notifications-page-container");
  if (!container) return;

  container.querySelectorAll("[data-notif-filter]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      currentFilter = tabBtn.dataset.notifFilter;
      renderNotificationsPage();
    });
  });

  const markReadBtn = document.getElementById("btn-mark-all-read");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", async () => {
      await markAllNotificationsAsRead();
      renderNotificationsPage();
    });
  }

  const clearBtn = document.getElementById("btn-clear-all-notif");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear all notifications?")) {
        await clearAllNotifications();
        renderNotificationsPage();
      }
    });
  }

  const listItems = document.getElementById("notif-list-items");
  if (listItems) {
    listItems.addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest("[data-delete-notif]");
      if (deleteBtn) {
        e.stopPropagation();
        const notifId = deleteBtn.dataset.deleteNotif;
        const allNotifs = getLocalNotifications().filter((n) => n.id !== notifId);
        try {
          localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(allNotifs));
        } catch (err) {}
        if (supabaseClient && currentUser) {
          try {
            await supabaseClient.from("notifications").delete().eq("id", notifId);
          } catch (err) {}
        }
        renderNotificationsPage();
        return;
      }

      const item = e.target.closest(".notif-item");
      if (item) {
        const notifId = item.dataset.notifId;
        const postId = item.dataset.postId;

        if (notifId) await markNotificationAsRead(notifId);

        if (postId) {
          switchModule("home");
          setTimeout(() => {
            const targetPost = document.getElementById(`post-${postId}`);
            if (targetPost) {
              targetPost.scrollIntoView({ behavior: "smooth", block: "center" });
              targetPost.classList.add("post-card-highlight");
              setTimeout(() => {
                targetPost.classList.remove("post-card-highlight");
              }, 2500);
            }
          }, 200);
        } else {
          renderNotificationsPage();
        }
      }
    });
  }
}
