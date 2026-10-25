import { supabaseClient } from "../config/supabase.js";
import {
  generateInitialsAvatar,
  escapeHtml,
  formatTimeAgo,
  clearNavActiveStates,
  renderRightSidebar,
  renderViewProfileSidebar,
  renderMetrics,
} from "../utils/helpers.js";
import { currentUser, currentProfile } from "../modules/auth.js";
import { renderPostCardHTML, setCurrentModule } from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import {
  getPrivacySettings,
  extractAndRegisterPrivacy,
  isBlockedWithCurrentUser,
  isUserDeleted,
} from "../utils/storage.js";
import { getNetworkState } from "./friends.js";

export async function renderProfilePage() {
  setCurrentModule("profile");
  clearNavActiveStates();
  renderRightSidebar("my-profile");
  renderSidebarMenu("home");
  clearNavActiveStates();

  const contentInner = document.getElementById("content-inner");
  if (!contentInner) return;

  // Remove any existing profile card from previous views
  removeProfileHeaderCard();

  // Update Header Metadata
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  if (!currentUser || !currentProfile) {
    if (pageTitle) pageTitle.innerText = "My Profile";
    if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
    if (pageSub)
      pageSub.innerText =
        "Manage your account details and view your published updates.";
    if (moduleBadge) moduleBadge.innerText = "PROFILE";

    const postsFeed = document.getElementById("posts-feed");
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="user"></i>
          </div>
          <h3>Account & Profile Access</h3>
          <p>Please <strong>Log In</strong> or <strong>Sign Up</strong> to view and manage your profile, account details, and published notebook posts.</p>
          <div class="network-auth-actions">
            <button class="btn btn-primary" id="profile-login-btn">
              <i data-lucide="log-in"></i> <span>Log In</span>
            </button>
            <button class="btn btn-outline" id="profile-signup-btn">
              <i data-lucide="user-plus"></i> <span>Sign Up</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      const loginBtn = document.getElementById("profile-login-btn");
      const signupBtn = document.getElementById("profile-signup-btn");
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
    renderMetrics([
      { label: "Total Posts", val: "0" },
      { label: "Total Friends", val: "0" },
    ]);
    return;
  }

  if (pageTitle) pageTitle.innerText = `${currentProfile.name}'s Profile`;
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText =
      "Manage your account details and view your published updates.";
  if (moduleBadge) moduleBadge.innerText = "PROFILE";

  const avatarUrl = generateInitialsAvatar(
    currentProfile.name,
    "#2A46FF",
    "#FFFFFF",
  );

  const postsFeed = document.getElementById("posts-feed");
  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");

  if (feedTitle) feedTitle.innerText = "Posts & Activity";
  if (feedFilterTag) feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> MY POSTS`;

  // Insert Profile Header Card
  if (postsFeed && postsFeed.parentNode) {
    const profileCardEl = document.createElement("div");
    profileCardEl.id = "profile-header-card";
    profileCardEl.className = "profile-header-card";
    profileCardEl.innerHTML = `
            <img src="${avatarUrl}" class="profile-avatar-lg" alt="${escapeHtml(currentProfile.name)}">
            <div class="profile-info">
                <h2 class="profile-name-title">${escapeHtml(currentProfile.name)}</h2>
                <div class="profile-badges">
                    <span class="profile-badge-item">ID: ${escapeHtml(currentProfile.student_id)}</span>
                    <span class="profile-badge-item">${escapeHtml(currentProfile.department)}</span>
                    <span class="profile-badge-item">${escapeHtml(currentProfile.year)}</span>
                </div>
            </div>
        `;
    postsFeed.parentNode.insertBefore(profileCardEl, postsFeed);
  }

  // Fetch User's Real Posts from Supabase
  await fetchAndRenderUserPosts(currentProfile.id, true);
}

export async function renderUserProfilePage(targetUserId, targetAuthorName) {
  setCurrentModule("profile");
  clearNavActiveStates();

  const contentInner = document.getElementById("content-inner");
  if (!contentInner) return;

  // If clicking on own profile, render My Profile
  if (currentUser && targetUserId && targetUserId === currentUser.id) {
    return renderProfilePage();
  }

  // Remove existing profile header card
  removeProfileHeaderCard();

  let targetProfile = null;

  if (supabaseClient && targetUserId) {
    try {
      const { data } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle();

      if (data) {
        extractAndRegisterPrivacy(data);
        targetProfile = data;
      }
    } catch (err) {
      console.error("Error fetching target user profile:", err);
    }
  }

  const isDeleted = isUserDeleted(targetUserId) || isUserDeleted(targetAuthorName);

  if (!targetProfile || isDeleted) {
    const pageTitle = document.getElementById("page-title");
    const pageEyebrow = document.getElementById("page-eyebrow");
    const pageSub = document.getElementById("page-sub");
    const moduleBadge = document.getElementById("module-badge");
    const createPostCard = document.getElementById("create-post-card");
    const cardsSection = document.getElementById("cards-section");

    if (pageTitle) pageTitle.innerText = "Profile Not Found";
    if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
    if (pageSub) pageSub.innerText = "This profile is no longer available.";
    if (moduleBadge) moduleBadge.innerText = "PROFILE";
    if (createPostCard) createPostCard.style.display = "none";
    if (cardsSection) cardsSection.style.display = "none";

    renderRightSidebar("standard");

    const postsFeed = document.getElementById("posts-feed");
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444);">
            <i data-lucide="user-x"></i>
          </div>
          <h3>Account Deleted or Not Found</h3>
          <p>The profile for <strong>${escapeHtml(targetAuthorName || "this user")}</strong> no longer exists or the account has been permanently deleted from the campus network.</p>
          <button class="btn btn-primary" id="btn-back-to-home" style="margin-top: 1rem;">
            <i data-lucide="home"></i> <span>Return to Home</span>
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      document.getElementById("btn-back-to-home")?.addEventListener("click", async () => {
        const { switchModule } = await import("../modules/navigation.js");
        switchModule("home");
      });
    }
    renderMetrics([
      { label: "Profile Status", val: "Deleted" },
      { label: "Account State", val: "Purged" },
    ]);
    return;
  }

  // Update Header Metadata element references
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");

  // Fetch target user privacy settings
  const targetPrivacy = getPrivacySettings(targetProfile.id);
  const isSelf = currentUser && targetProfile.id && currentUser.id === targetProfile.id;

  // Check if target user or current user has blocked each other
  if (!isSelf && isBlockedWithCurrentUser(targetProfile.id, targetProfile.name)) {
    if (pageTitle) pageTitle.innerText = `${targetProfile.name}'s Profile`;
    if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
    if (pageSub) pageSub.innerText = "Profile content unavailable.";
    if (moduleBadge) moduleBadge.innerText = "PROFILE";
    if (createPostCard) createPostCard.style.display = "none";
    if (cardsSection) cardsSection.style.display = "none";

    renderRightSidebar("standard");
    renderViewProfileSidebar(targetProfile);

    const postsFeed = document.getElementById("posts-feed");
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="shield-alert" style="color: var(--danger-color, #ef4444);"></i>
          </div>
          <h3>Blocked Profile</h3>
          <p>Activity and posts for <strong>${escapeHtml(targetProfile.name)}</strong> are hidden because of blocking restrictions.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    renderMetrics([
      { label: "Profile Status", val: "Blocked" },
      { label: "Access Level", val: "Restricted" },
    ]);
    return;
  }

  // Check Rule 1: Allow others to view your profile
  if (!isSelf && !targetPrivacy.allowViewProfile) {
    if (pageTitle) pageTitle.innerText = `${targetProfile.name}'s Profile`;
    if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
    if (pageSub) pageSub.innerText = "Profile access restricted by user settings.";
    if (moduleBadge) moduleBadge.innerText = "PROFILE";
    if (createPostCard) createPostCard.style.display = "none";
    if (cardsSection) cardsSection.style.display = "none";

    renderRightSidebar("standard");
    renderViewProfileSidebar(targetProfile);

    const postsFeed = document.getElementById("posts-feed");
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="lock"></i>
          </div>
          <h3>Private Profile</h3>
          <p><strong>${escapeHtml(targetProfile.name)}</strong> has set their profile visibility to private. Only the owner can view profile details.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    renderMetrics([
      { label: "Profile Status", val: "Private" },
      { label: "Access Level", val: "Restricted" },
    ]);
    return;
  }

  // Check Rule 7: Activity Scope / Friends Only
  const netState = getNetworkState();
  const isFriend = netState && netState.friends && netState.friends.some((f) => {
    if (typeof f === "string") return f === targetProfile.id;
    return f.id === targetProfile.id || f.name === targetProfile.name;
  });

  if (!isSelf && targetPrivacy.activityVisibility === "friends" && !isFriend) {
    if (pageTitle) pageTitle.innerText = `${targetProfile.name}'s Profile`;
    if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
    if (pageSub) pageSub.innerText = "Profile activity restricted to confirmed friends.";
    if (moduleBadge) moduleBadge.innerText = "PROFILE";
    if (createPostCard) createPostCard.style.display = "none";
    if (cardsSection) cardsSection.style.display = "none";

    renderRightSidebar("standard");
    renderViewProfileSidebar(targetProfile);

    const postsFeed = document.getElementById("posts-feed");
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="users"></i>
          </div>
          <h3>Friends-Only Activity</h3>
          <p><strong>${escapeHtml(targetProfile.name)}</strong> only shares their posts and campus updates with confirmed friends.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    renderMetrics([
      { label: "Activity Scope", val: "Friends Only" },
      { label: "Access Level", val: "Restricted" },
    ]);
    return;
  }

  // Right sidebar remains standard
  renderRightSidebar("standard");

  // Left sidebar changes to show Add Friend, Block, Report, etc.
  renderViewProfileSidebar(targetProfile);

  if (pageTitle) pageTitle.innerText = `${targetProfile.name}'s Profile`;
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText = `View campus updates and posts shared by ${targetProfile.name}.`;
  if (moduleBadge) moduleBadge.innerText = "PROFILE";

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  const avatarUrl = generateInitialsAvatar(
    targetProfile.name,
    "#2A46FF",
    "#FFFFFF",
  );

  const postsFeed = document.getElementById("posts-feed");
  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");

  if (feedTitle) feedTitle.innerText = "Posts & Activity";
  if (feedFilterTag) feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> STUDENT POSTS`;

  // Insert Profile Header Card
  if (postsFeed && postsFeed.parentNode) {
    const profileCardEl = document.createElement("div");
    profileCardEl.id = "profile-header-card";
    profileCardEl.className = "profile-header-card";
    profileCardEl.innerHTML = `
            <img src="${avatarUrl}" class="profile-avatar-lg" alt="${escapeHtml(targetProfile.name)}">
            <div class="profile-info">
                <h2 class="profile-name-title">${escapeHtml(targetProfile.name)}</h2>
                <div class="profile-badges">
                    <span class="profile-badge-item">ID: ${escapeHtml(targetProfile.student_id)}</span>
                    <span class="profile-badge-item">${escapeHtml(targetProfile.department)}</span>
                    <span class="profile-badge-item">${escapeHtml(targetProfile.year)}</span>
                </div>
            </div>
        `;
    postsFeed.parentNode.insertBefore(profileCardEl, postsFeed);
  }

  // Check Rule 7: Activity Visibility (Friends Only vs Public)
  if (!isSelf && targetPrivacy.activityVisibility === "friends") {
    const netState = getNetworkState();
    const isFriend = netState && netState.friends && netState.friends.some(
      (f) => {
        if (typeof f === "string") return f === targetProfile.id || f === targetProfile.name;
        return (f.id && f.id === targetProfile.id) || (f.name && f.name === targetProfile.name);
      }
    );

    if (!isFriend) {
      if (postsFeed) {
        postsFeed.innerHTML = `
          <div class="network-auth-required-card">
            <div class="network-auth-icon">
              <i data-lucide="users"></i>
            </div>
            <h3>Friends-Only Activity</h3>
            <p><strong>${escapeHtml(targetProfile.name)}</strong>'s posts and activity are visible to confirmed friends only.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }
  }

  // Fetch target user's posts with isOwnProfile = false
  await fetchAndRenderUserPosts(targetProfile.id, false);

}

export function removeProfileHeaderCard() {
  const existing = document.getElementById("profile-header-card");
  if (existing) existing.remove();
}

export async function fetchAndRenderUserPosts(userId, isOwnProfile = true) {
  const postsFeed = document.getElementById("posts-feed");
  if (!postsFeed || !supabaseClient) return;

  postsFeed.innerHTML = `<div class="infinite-feed-loader"><div class="skeleton-pill"></div></div>`;

  // Calculate Total Friends Count for user
  let totalFriendsCount = 0;
  if (isOwnProfile || (currentUser && userId === currentUser.id)) {
    const netState = getNetworkState();
    totalFriendsCount = netState.friends ? netState.friends.length : 0;
  } else if (userId && supabaseClient) {
    try {
      const { data: friendNotifs } = await supabaseClient
        .from("notifications")
        .select("actor_id, recipient_id, type")
        .or(`recipient_id.eq.${userId},actor_id.eq.${userId}`)
        .in("type", ["friend_accept", "friend_unfriend", "friend_block"]);
      if (friendNotifs) {
        const friendIds = new Set();
        const latestEvents = new Map();
        friendNotifs.forEach((item) => {
          const otherId = item.actor_id === userId ? item.recipient_id : item.actor_id;
          if (!otherId || otherId === "all") return;
          latestEvents.set(otherId, item.type);
        });
        latestEvents.forEach((type, otherId) => {
          if (type === "friend_accept") friendIds.add(otherId);
        });
        totalFriendsCount = friendIds.size;
      }
    } catch (err) {
      console.warn("Could not query target user friends:", err);
    }
    const localNetState = getNetworkState();
    if (localNetState.friends && localNetState.friends.includes(userId) && totalFriendsCount === 0) {
      totalFriendsCount = 1;
    }
  }

  try {
    let query = supabaseClient
      .from("posts")
      .select(
        `
                id,
                category,
                content,
                image_url,
                created_at,
                profiles:author_id ( id, name, student_id, department, year, avatar_url ),
                post_likes ( user_id ),
                comments ( id, content, created_at, profiles:author_id ( id, name ) )
            `,
      )
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("author_id", userId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      renderMetrics([
        { label: "Total Posts", val: "0" },
        { label: "Total Friends", val: `${totalFriendsCount}` },
      ]);

      postsFeed.innerHTML = `
                <div class="empty-feed">
                    <i data-lucide="edit-3"></i>
                    <p>${isOwnProfile ? "You haven't published any posts yet. Create a post on the Home page!" : "This user hasn't published any posts yet."}</p>
                </div>
            `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Fetch Database Comment Likes from Supabase
    let dbCommentLikes = [];
    try {
      const { data: likesData } = await supabaseClient
        .from("comment_likes")
        .select("comment_id, user_id");
      if (likesData) dbCommentLikes = likesData;
    } catch (e) {
      console.warn("Could not query comment_likes table:", e);
    }

    // Calculate Total Posts & Total Reactions for Profile Header Metric Ribbon
    const totalPostsCount = data.length;
    const totalReactionsCount = data.reduce(
      (sum, p) => sum + (p.post_likes ? p.post_likes.length : 0),
      0,
    );

    renderMetrics([
      { label: "Total Posts", val: `${totalPostsCount}` },
      { label: "Total Friends", val: `${totalFriendsCount}` },
    ]);

    const postsHTML = data
      .map((dbPost) => {
        const authorName = dbPost.profiles
          ? dbPost.profiles.name
          : "Campus User";
        const authorId = dbPost.profiles ? dbPost.profiles.id : null;
        const dept = dbPost.profiles ? dbPost.profiles.department : "CSE";
        const yr = dbPost.profiles ? dbPost.profiles.year : "1st Year";
        const avatar = dbPost.profiles
          ? dbPost.profiles.avatar_url ||
            generateInitialsAvatar(authorName, "#2A46FF", "#FFFFFF")
          : generateInitialsAvatar(authorName, "#2A46FF", "#FFFFFF");
        const isLikedByMe = currentUser
          ? dbPost.post_likes.some((l) => l.user_id === currentUser.id)
          : false;

        const postObj = {
          id: dbPost.id,
          isDbPost: true,
          category: dbPost.category,
          author: authorName,
          authorId: authorId,
          avatar: avatar,
          badge: `${dept} • ${yr}`,
          time: formatTimeAgo(dbPost.created_at),
          text: dbPost.content,
          image: dbPost.image_url,
          likes: dbPost.post_likes.length,
          liked: isLikedByMe,
          commentsCount: dbPost.comments ? dbPost.comments.length : 0,
          sharesCount: 0,
          comments: dbPost.comments
            ? dbPost.comments.map((c) => {
                const likesForThisComment = dbCommentLikes.filter(
                  (l) => String(l.comment_id) === String(c.id),
                );
                const isCommentLikedByMe = currentUser
                  ? likesForThisComment.some(
                      (l) => l.user_id === currentUser.id,
                    )
                  : false;
                return {
                  id: c.id,
                  author: c.profiles ? c.profiles.name : "Campus User",
                  authorId: c.profiles ? c.profiles.id : null,
                  text: c.content,
                  likes: likesForThisComment.length,
                  liked: isCommentLikedByMe,
                };
              })
            : [],
        };

        return `
                <div class="profile-post-item-wrapper" id="profile-post-wrap-${dbPost.id}">
                    ${
                      isOwnProfile
                        ? `
                    <div class="profile-post-toolbar">
                        <div class="bulk-checkbox-container hidden">
                            <label class="bulk-post-checkbox-label">
                                <input type="checkbox" class="bulk-post-checkbox" data-post-id="${dbPost.id}" />
                                <span>Select Post</span>
                            </label>
                        </div>
                        <button class="btn-delete-post" onclick="deleteUserPost('${dbPost.id}')">
                            <i data-lucide="trash-2"></i> <span>Delete Post</span>
                        </button>
                    </div>
                    `
                        : ""
                    }
                    ${renderPostCardHTML(postObj)}
                </div>
            `;
      })
      .join("");

    const bulkToolbarHTML = isOwnProfile && data.length > 0
      ? `
        <div class="bulk-delete-toolbar" id="bulk-delete-toolbar">
          <div class="bulk-toolbar-info">
            <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-bulk-mode">
              <i data-lucide="check-square"></i> <span>Bulk Delete Posts</span>
            </button>
          </div>
          <div class="bulk-toolbar-actions hidden" id="bulk-toolbar-actions">
            <label class="bulk-select-all-label">
              <input type="checkbox" id="chk-select-all-posts" />
              <span>Select All</span>
            </label>
            <span class="bulk-count-badge" id="bulk-selected-count">0 selected</span>
            <button type="button" class="btn btn-danger btn-sm" id="btn-delete-selected" disabled>
              <i data-lucide="trash-2"></i> <span>Delete Selected (0)</span>
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-bulk">
              Cancel
            </button>
          </div>
        </div>
      `
      : "";

    postsFeed.innerHTML = `${bulkToolbarHTML}${postsHTML}`;

    if (isOwnProfile && data.length > 0) {
      setupBulkDeleteListeners(totalFriendsCount);
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("Error fetching user posts:", err);
    renderMetrics([
      { label: "Total Posts", val: "0" },
      { label: "Total Friends", val: `${totalFriendsCount}` },
    ]);
    postsFeed.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="alert-circle"></i>
                <p>Failed to load posts. Please try refreshing.</p>
            </div>
        `;
    if (window.lucide) window.lucide.createIcons();
  }
}

function setupBulkDeleteListeners(totalFriendsCount) {
  const toggleBtn = document.getElementById("btn-toggle-bulk-mode");
  const toolbarActions = document.getElementById("bulk-toolbar-actions");
  const selectAllChk = document.getElementById("chk-select-all-posts");
  const deleteSelectedBtn = document.getElementById("btn-delete-selected");
  const cancelBtn = document.getElementById("btn-cancel-bulk");
  const countBadge = document.getElementById("bulk-selected-count");

  if (!toggleBtn) return;

  const getCheckboxes = () => Array.from(document.querySelectorAll(".bulk-post-checkbox"));
  const getWrappers = () => Array.from(document.querySelectorAll(".bulk-checkbox-container"));
  const getSingleDeleteBtns = () => Array.from(document.querySelectorAll(".btn-delete-post"));

  const updateSelectionState = () => {
    const checkboxes = getCheckboxes();
    const selected = checkboxes.filter((c) => c.checked);
    const count = selected.length;

    if (countBadge) countBadge.innerText = `${count} selected`;
    if (deleteSelectedBtn) {
      deleteSelectedBtn.disabled = count === 0;
      deleteSelectedBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>Delete Selected (${count})</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
    if (selectAllChk) {
      selectAllChk.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
    }
  };

  toggleBtn.addEventListener("click", () => {
    toggleBtn.classList.add("hidden");
    toolbarActions?.classList.remove("hidden");
    getWrappers().forEach((w) => w.classList.remove("hidden"));
    getSingleDeleteBtns().forEach((b) => (b.style.display = "none"));
    updateSelectionState();
  });

  cancelBtn?.addEventListener("click", () => {
    toggleBtn.classList.remove("hidden");
    toolbarActions?.classList.add("hidden");
    getWrappers().forEach((w) => w.classList.add("hidden"));
    getSingleDeleteBtns().forEach((b) => (b.style.display = "inline-flex"));
    getCheckboxes().forEach((c) => (c.checked = false));
    updateSelectionState();
  });

  selectAllChk?.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    getCheckboxes().forEach((c) => (c.checked = isChecked));
    updateSelectionState();
  });

  const postsFeed = document.getElementById("posts-feed");
  postsFeed?.addEventListener("change", (e) => {
    if (e.target && e.target.classList.contains("bulk-post-checkbox")) {
      updateSelectionState();
    }
  });

  deleteSelectedBtn?.addEventListener("click", async () => {
    const selectedBoxes = getCheckboxes().filter((c) => c.checked);
    const selectedIds = selectedBoxes.map((c) => c.getAttribute("data-post-id")).filter(Boolean);

    if (selectedIds.length === 0) return;

    if (!confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected post(s)?`)) {
      return;
    }

    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.innerText = "Deleting...";

    await deleteMultipleUserPosts(selectedIds, totalFriendsCount);
  });
}

export async function deleteMultipleUserPosts(postIds, totalFriendsCount) {
  if (!currentUser || !postIds || postIds.length === 0) return;

  try {
    const { error } = await supabaseClient
      .from("posts")
      .delete()
      .in("id", postIds)
      .eq("author_id", currentUser.id);

    if (error) {
      alert("Error deleting posts: " + error.message);
      return;
    }

    postIds.forEach((postId) => {
      const postWrap = document.getElementById(`profile-post-wrap-${postId}`);
      const postCard = document.getElementById(`post-${postId}`);
      const targetEl = postWrap || postCard;
      if (targetEl) {
        targetEl.style.transition = "all 0.3s ease";
        targetEl.style.opacity = "0";
        targetEl.style.transform = "scale(0.95)";
        setTimeout(() => targetEl.remove(), 300);
      }
    });

    setTimeout(() => {
      const remaining = document.querySelectorAll(".profile-post-item-wrapper");
      const remainingCount = remaining.length;

      renderMetrics([
        { label: "Total Posts", val: `${remainingCount}` },
        { label: "Total Friends", val: `${totalFriendsCount}` },
      ]);

      if (remainingCount === 0) {
        const postsFeed = document.getElementById("posts-feed");
        if (postsFeed) {
          postsFeed.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="edit-3"></i>
                <p>You haven't published any posts yet. Create a post on the Home page!</p>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        const toggleBtn = document.getElementById("btn-toggle-bulk-mode");
        const toolbarActions = document.getElementById("bulk-toolbar-actions");
        if (toggleBtn) toggleBtn.classList.remove("hidden");
        if (toolbarActions) toolbarActions.classList.add("hidden");
        document.querySelectorAll(".bulk-checkbox-container").forEach((w) => w.classList.add("hidden"));
        document.querySelectorAll(".btn-delete-post").forEach((b) => (b.style.display = "inline-flex"));
      }
    }, 350);

    alert(`Successfully deleted ${postIds.length} post(s).`);
  } catch (err) {
    console.error("Bulk delete post error:", err);
  }
}

export async function deleteUserPost(postId) {
  if (!currentUser) return;

  if (!confirm("Are you sure you want to delete this post permanently?"))
    return;

  try {
    const { error } = await supabaseClient
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", currentUser.id);

    if (error) {
      alert("Error deleting post: " + error.message);
      return;
    }

    const postWrap = document.getElementById(`profile-post-wrap-${postId}`);
    const postCard = document.getElementById(`post-${postId}`);
    const targetEl = postWrap || postCard;

    if (targetEl) {
      targetEl.style.transition = "all 0.3s ease";
      targetEl.style.opacity = "0";
      targetEl.style.transform = "scale(0.95)";
      setTimeout(() => {
        targetEl.remove();

        const remaining = document.querySelectorAll(
          ".profile-post-item-wrapper, .post-card",
        );
        if (remaining.length === 0) {
          const postsFeed = document.getElementById("posts-feed");
          if (postsFeed) {
            postsFeed.innerHTML = `
              <div class="empty-feed">
                  <i data-lucide="edit-3"></i>
                  <p>You haven't published any posts yet. Create a post on the Home page!</p>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
          }
        } else {
          renderMetrics([
            { label: "Total Posts", val: `${remaining.length}` },
            { label: "Total Friends", val: `${totalFriendsCount || 0}` },
          ]);
        }
      }, 300);
    }

    alert("Post deleted successfully.");
  } catch (err) {
    console.error("Delete post error:", err);
  }
}

// Attach deleteUserPost and deleteMultipleUserPosts to window object for inline handlers
if (typeof window !== "undefined") {
  window.deleteUserPost = deleteUserPost;
  window.deleteMultipleUserPosts = deleteMultipleUserPosts;
}

