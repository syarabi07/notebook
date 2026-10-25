import { supabaseClient } from "../config/supabase.js";
import { escapeHtml, formatCount, showToast } from "../utils/helpers.js";
import { getLocalShares, setLocalShares, getPrivacySettings } from "../utils/storage.js";
import { requireAuth, currentUser, currentProfile } from "./auth.js";
import { getCampusPosts, renderFeed, getCurrentModule } from "./feed.js";
import { addNotification } from "../pages/notifications.js";

export const CLOUDINARY_CONFIG = {
  cloudName: "d35qqwv1",
  uploadPreset: "notebook_preset",
};

export let selectedCategoryValue = "general";
let selectedMediaFile = null;
export let selectedActivity = null;
export let selectedTaggedFriends = [];
let availableFriendsList = [];

export const FEELINGS_DATA = [
  { emoji: "😊", text: "Happy", full: "is feeling 😊 Happy" },
  { emoji: "😇", text: "Blessed", full: "is feeling 😇 Blessed" },
  { emoji: "😎", text: "Excited", full: "is feeling 😎 Excited" },
  { emoji: "☕", text: "Relaxed", full: "is feeling ☕ Relaxed" },
  { emoji: "📚", text: "Studying", full: "is feeling 📚 Studying" },
  { emoji: "🔥", text: "Focused", full: "is feeling 🔥 Focused" },
  { emoji: "🎓", text: "Proud", full: "is feeling 🎓 Proud" },
  { emoji: "😴", text: "Sleepy", full: "is feeling 😴 Sleepy" },
  { emoji: "🎉", text: "Celebrating", full: "is feeling 🎉 Celebrating" },
  { emoji: "💡", text: "Inspired", full: "is feeling 💡 Inspired" },
  { emoji: "🍕", text: "Hungry", full: "is feeling 🍕 Hungry" },
  { emoji: "🎧", text: "Chill", full: "is feeling 🎧 Chill" },
  { emoji: "🏆", text: "Accomplished", full: "is feeling 🏆 Accomplished" },
  { emoji: "💬", text: "Chatty", full: "is feeling 💬 Chatty" },
  { emoji: "⚡", text: "Energized", full: "is feeling ⚡ Energized" },
  { emoji: "💡", text: "Curious", full: "is feeling 💡 Curious" },
  { emoji: "🌿", text: "Calm", full: "is feeling 🌿 Calm" },
  { emoji: "☕", text: "Caffeinated", full: "is feeling ☕ Caffeinated" },
];

export const ACTIVITIES_DATA = [
  { emoji: "🎧", verb: "Listening to", placeholder: "e.g. Lofi Beats, Course Lecture, Podcast" },
  { emoji: "📖", verb: "Reading", placeholder: "e.g. Textbook, Research Paper, Novel" },
  { emoji: "🍿", verb: "Watching", placeholder: "e.g. Tutorial, Anime, YouTube, Movie" },
  { emoji: "🎮", verb: "Playing", placeholder: "e.g. Valorant, FIFA, Chess, Cricket" },
  { emoji: "🚌", verb: "Traveling to", placeholder: "e.g. Campus, Library, Home, Lab" },
  { emoji: "🍕", verb: "Eating", placeholder: "e.g. Snacks, Lunch, Pizza, Coffee" },
  { emoji: "💻", verb: "Coding", placeholder: "e.g. Web App, Python Project, React" },
  { emoji: "🏋️", verb: "Working out at", placeholder: "e.g. Campus Gym, Sports Field" },
  { emoji: "🎨", verb: "Creating", placeholder: "e.g. Presentation, Digital Art, Video" },
  { emoji: "☕", verb: "Drinking", placeholder: "e.g. Coffee, Milk Tea, Energy Drink" },
  { emoji: "🎓", verb: "Attending", placeholder: "e.g. Physics Seminar, Tech Fest, Workshop" },
];

let selectedActivityVerb = null;

export function openActivityModal() {
  const modal = document.getElementById("activity-modal");
  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.removeAttribute("inert");
    document.body.style.overflow = "hidden";
    renderFeelingsGrid(FEELINGS_DATA);
    renderActivitiesList(ACTIVITIES_DATA);
  }
}

export function closeActivityModal() {
  const modal = document.getElementById("activity-modal");
  if (modal) {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    document.body.style.overflow = "";
    resetActivityDetailView();
  }
}

export function selectActivity(activityText) {
  selectedActivity = { text: activityText };
  const chipContainer = document.getElementById("activity-chip-container");
  const chipText = document.getElementById("activity-chip-text");

  if (chipContainer && chipText) {
    chipText.innerText = activityText;
    chipContainer.style.display = "inline-flex";
  }
  closeActivityModal();
}

export function removeActivity() {
  selectedActivity = null;
  const chipContainer = document.getElementById("activity-chip-container");
  if (chipContainer) chipContainer.style.display = "none";
}

function renderFeelingsGrid(feelings) {
  const grid = document.getElementById("feelings-grid");
  if (!grid) return;
  grid.innerHTML = feelings
    .map(
      (f) => `
      <div class="activity-item" data-feeling-full="${escapeHtml(f.full)}">
          <span class="item-emoji">${f.emoji}</span>
          <span>${escapeHtml(f.text)}</span>
      </div>
    `,
    )
    .join("");
}

function renderActivitiesList(activities) {
  const list = document.getElementById("activities-list");
  if (!list) return;
  list.innerHTML = activities
    .map(
      (a) => `
      <div class="activity-item" data-activity-verb="${escapeHtml(a.verb)}" data-activity-emoji="${a.emoji}" data-activity-placeholder="${escapeHtml(a.placeholder)}">
          <span class="item-emoji">${a.emoji}</span>
          <span>${escapeHtml(a.verb)}...</span>
      </div>
    `,
    )
    .join("");
}

function resetActivityDetailView() {
  const detailWrapper = document.getElementById("activity-detail-wrapper");
  const activitiesList = document.getElementById("activities-list");
  if (detailWrapper) detailWrapper.style.display = "none";
  if (activitiesList) activitiesList.style.display = "flex";
  selectedActivityVerb = null;
}

export function initActivitySelector() {
  const tabFeelings = document.getElementById("tab-feelings");
  const tabActivities = document.getElementById("tab-activities");
  const panelFeelings = document.getElementById("panel-feelings");
  const panelActivities = document.getElementById("panel-activities");
  const searchInput = document.getElementById("activity-search-input");

  if (tabFeelings && tabActivities && panelFeelings && panelActivities) {
    tabFeelings.addEventListener("click", () => {
      tabFeelings.classList.add("active");
      tabActivities.classList.remove("active");
      panelFeelings.classList.add("active");
      panelActivities.classList.remove("active");
      if (searchInput) searchInput.value = "";
      renderFeelingsGrid(FEELINGS_DATA);
    });

    tabActivities.addEventListener("click", () => {
      tabActivities.classList.add("active");
      tabFeelings.classList.remove("active");
      panelActivities.classList.add("active");
      panelFeelings.classList.remove("active");
      if (searchInput) searchInput.value = "";
      renderActivitiesList(ACTIVITIES_DATA);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const feelingsActive = tabFeelings?.classList.contains("active");

      if (feelingsActive) {
        const filtered = FEELINGS_DATA.filter(
          (f) =>
            f.text.toLowerCase().includes(q) ||
            f.full.toLowerCase().includes(q),
        );
        renderFeelingsGrid(filtered);
      } else {
        const filtered = ACTIVITIES_DATA.filter((a) =>
          a.verb.toLowerCase().includes(q),
        );
        renderActivitiesList(filtered);
      }
    });
  }

  // Feelings item click
  const feelingsGrid = document.getElementById("feelings-grid");
  if (feelingsGrid) {
    feelingsGrid.addEventListener("click", (e) => {
      const item = e.target.closest("[data-feeling-full]");
      if (item) {
        const fullText = item.dataset.feelingFull;
        if (fullText) selectActivity(fullText);
      }
    });
  }

  // Activity item click -> show detail input field
  const activitiesList = document.getElementById("activities-list");
  const detailWrapper = document.getElementById("activity-detail-wrapper");
  const prefixText = document.getElementById("selected-activity-prefix");
  const detailInput = document.getElementById("activity-detail-input");

  if (activitiesList) {
    activitiesList.addEventListener("click", (e) => {
      const item = e.target.closest("[data-activity-verb]");
      if (item) {
        const verb = item.dataset.activityVerb;
        const emoji = item.dataset.activityEmoji;
        const placeholder = item.dataset.activityPlaceholder;

        selectedActivityVerb = { verb, emoji };
        if (prefixText) prefixText.innerText = `${emoji} ${verb}...`;
        if (detailInput) {
          detailInput.placeholder = placeholder || "Type activity details...";
          detailInput.value = "";
        }

        if (detailWrapper) detailWrapper.style.display = "block";
        if (activitiesList) activitiesList.style.display = "none";
        if (detailInput) detailInput.focus();
      }
    });
  }

  const btnBack = document.getElementById("btn-back-activity");
  if (btnBack) {
    btnBack.addEventListener("click", resetActivityDetailView);
  }

  const btnSaveDetail = document.getElementById("btn-save-activity-detail");
  const saveActivityFromInput = () => {
    if (!selectedActivityVerb) return;
    const detail = detailInput ? detailInput.value.trim() : "";
    const actText = detail
      ? `is ${selectedActivityVerb.emoji} ${selectedActivityVerb.verb} ${detail}`
      : `is ${selectedActivityVerb.emoji} ${selectedActivityVerb.verb}`;
    selectActivity(actText);
  };

  if (btnSaveDetail) {
    btnSaveDetail.addEventListener("click", saveActivityFromInput);
  }

  if (detailInput) {
    detailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveActivityFromInput();
      }
    });
  }

  // Close button & Remove activity button
  const closeBtn = document.getElementById("activity-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeActivityModal);

  const removeChipBtn = document.getElementById("btn-remove-activity");
  if (removeChipBtn) removeChipBtn.addEventListener("click", removeActivity);
}

export async function getUserFriendsList() {
  try {
    const { loadRegisteredClassmates, getNetworkState, fetchNetworkStateFromSupabase } = await import("../pages/friends.js");
    const classmates = await loadRegisteredClassmates();
    await fetchNetworkStateFromSupabase();
    const netState = getNetworkState();
    const friendIds = netState.friends || [];

    const selfId = currentProfile ? currentProfile.id : (currentUser ? currentUser.id : null);
    const selfName = currentProfile ? currentProfile.name : null;

    return classmates.filter((c) => friendIds.includes(c.id) && c.id !== selfId && c.name !== selfName);
  } catch (err) {
    console.warn("Could not load friends list:", err);
    return [];
  }
}

export async function openTagFriendsModal() {
  if (!requireAuth("tag friends in your post")) return;

  const modal = document.getElementById("tag-friends-modal");
  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.removeAttribute("inert");
    document.body.style.overflow = "hidden";

    availableFriendsList = await getUserFriendsList();
    renderTagFriendsList(availableFriendsList);
    updateTagFriendsModalFooter();
  }
}

export function closeTagFriendsModal() {
  const modal = document.getElementById("tag-friends-modal");
  if (modal) {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    document.body.style.overflow = "";
  }
}

export function renderTagFriendsList(friends) {
  const container = document.getElementById("tag-friends-list");
  if (!container) return;

  if (!friends || friends.length === 0) {
    container.innerHTML = `
      <div class="network-empty-state" style="padding: 2rem 1rem; margin: 0;">
        <i data-lucide="users" style="width: 36px; height: 36px; margin-bottom: 0.5rem; color: #9CA3AF;"></i>
        <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--ink);">No Friends Found</h3>
        <p style="font-size: 0.8rem; color: var(--ink-soft);">Add friends from the Network page to tag them in your post.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = friends
    .map((f) => {
      const isSelected = selectedTaggedFriends.some((tf) => tf.id === f.id);
      const avatar = f.avatar_url || (f.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=2A46FF&color=fff` : "");
      const fPrivacy = getPrivacySettings(f.id);
      const taggingDisabled = !fPrivacy.allowFriendTagging;

      return `
        <div class="tag-friend-item ${isSelected ? "selected" : ""} ${taggingDisabled ? "disabled" : ""}" data-friend-id="${f.id}" style="${taggingDisabled ? "opacity:0.65; cursor:not-allowed;" : ""}">
          <div class="tag-friend-info">
            <img src="${avatar}" alt="${escapeHtml(f.name)}" class="tag-friend-avatar">
            <div class="tag-friend-details">
              <span class="tag-friend-name">${escapeHtml(f.name)}</span>
              <span class="tag-friend-sub">${taggingDisabled ? `<span class="tag-disabled-text">Tagging Disabled</span>` : `${escapeHtml(f.department || "Campus")} • ${escapeHtml(f.year || "Student")}`}</span>
            </div>
          </div>
          <div class="tag-friend-checkbox">
            ${taggingDisabled ? '<i data-lucide="shield-alert"></i>' : isSelected ? '<i data-lucide="check"></i>' : ""}
          </div>
        </div>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();

  container.querySelectorAll(".tag-friend-item").forEach((item) => {
    item.addEventListener("click", () => {
      const friendId = item.dataset.friendId;
      const targetFriend = availableFriendsList.find((f) => f.id === friendId);
      if (targetFriend) {
        const fPrivacy = getPrivacySettings(targetFriend.id);
        if (!fPrivacy.allowFriendTagging) {
          showToast(`${targetFriend.name} has disabled friend tagging in privacy settings.`, "info");
          return;
        }
        toggleTagFriend(targetFriend);
      }
    });
  });
}

export function toggleTagFriend(friend) {
  const idx = selectedTaggedFriends.findIndex((tf) => tf.id === friend.id);
  if (idx > -1) {
    selectedTaggedFriends.splice(idx, 1);
  } else {
    selectedTaggedFriends.push({
      id: friend.id,
      name: friend.name,
      avatar: friend.avatar_url,
    });
  }

  renderTagFriendsList(availableFriendsList);
  updateTagFriendsModalFooter();
  updateTaggedFriendsChip();
}

export function updateTagFriendsModalFooter() {
  const badge = document.getElementById("tagged-count-badge");
  if (badge) {
    const count = selectedTaggedFriends.length;
    badge.innerText = `${count} friend${count === 1 ? "" : "s"} selected`;
  }
}

export function updateTaggedFriendsChip() {
  const container = document.getElementById("tagged-friends-chip-container");
  const textEl = document.getElementById("tagged-friends-chip-text");

  if (!container || !textEl) return;

  if (selectedTaggedFriends.length > 0) {
    const names = selectedTaggedFriends.map((f) => f.name).join(", ");
    textEl.innerText = `With ${names}`;
    container.style.display = "inline-flex";
  } else {
    container.style.display = "none";
  }
}

export function removeTaggedFriends() {
  selectedTaggedFriends = [];
  updateTaggedFriendsChip();
  if (availableFriendsList.length > 0) {
    renderTagFriendsList(availableFriendsList);
    updateTagFriendsModalFooter();
  }
}

export function initTagFriendsSelector() {
  const closeBtn = document.getElementById("tag-friends-close-btn");
  const saveBtn = document.getElementById("btn-save-tag-friends");
  const removeChipBtn = document.getElementById("btn-remove-tagged-friends");
  const searchInput = document.getElementById("tag-friends-search-input");

  if (closeBtn) closeBtn.addEventListener("click", closeTagFriendsModal);
  if (saveBtn) saveBtn.addEventListener("click", closeTagFriendsModal);
  if (removeChipBtn) removeChipBtn.addEventListener("click", removeTaggedFriends);

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderTagFriendsList(availableFriendsList);
      } else {
        const filtered = availableFriendsList.filter((f) =>
          f.name.toLowerCase().includes(q) || (f.department && f.department.toLowerCase().includes(q))
        );
        renderTagFriendsList(filtered);
      }
    });
  }
}

export function handleFileSelect(e) {
  const file = e.target.files ? e.target.files[0] : null;
  if (!file) return;

  // Max size limit check (50 MB)
  if (file.size > 50 * 1024 * 1024) {
    alert(
      "Selected file is too large. Please select a photo or video under 50 MB.",
    );
    e.target.value = "";
    return;
  }

  selectedMediaFile = file;
  showMediaPreview(file);
}

export function showMediaPreview(file) {
  const container = document.getElementById("media-preview-container");
  const imgPreview = document.getElementById("media-preview-img");
  const videoPreview = document.getElementById("media-preview-video");

  if (!container || !imgPreview || !videoPreview) return;

  const objectUrl = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    imgPreview.style.display = "none";
    videoPreview.src = objectUrl;
    videoPreview.style.display = "block";
  } else {
    videoPreview.style.display = "none";
    imgPreview.src = objectUrl;
    imgPreview.style.display = "block";
  }

  container.style.display = "block";
}

export function removeMediaPreview() {
  selectedMediaFile = null;

  const fileInput = document.getElementById("post-file-input");
  if (fileInput) fileInput.value = "";

  const container = document.getElementById("media-preview-container");
  const imgPreview = document.getElementById("media-preview-img");
  const videoPreview = document.getElementById("media-preview-video");

  if (imgPreview) imgPreview.src = "";
  if (videoPreview) videoPreview.src = "";
  if (container) container.style.display = "none";
}

export async function uploadToCloudinary(file) {
  if (
    !CLOUDINARY_CONFIG.cloudName ||
    CLOUDINARY_CONFIG.cloudName === "YOUR_CLOUDINARY_CLOUD_NAME"
  ) {
    throw new Error(
      "Cloudinary Credentials Missing. Please check CLOUDINARY_CONFIG.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || "Failed to upload file to Cloudinary.",
    );
  }

  const data = await response.json();
  return data.secure_url;
}

export function toggleCustomDropdown(e) {
  if (e) e.stopPropagation();
  const dropdownMenu = document.getElementById("dropdown-menu");
  const triggerBtn = document.getElementById("dropdown-trigger-btn");

  if (dropdownMenu && triggerBtn) {
    const isOpen = dropdownMenu.classList.contains("show");
    dropdownMenu.classList.toggle("show", !isOpen);
    triggerBtn.classList.toggle("open", !isOpen);
  }
}

export function selectPostCategory(val, labelText) {
  selectedCategoryValue = val;

  const selectedTextEl = document.getElementById("dropdown-selected-text");
  if (selectedTextEl) selectedTextEl.innerText = labelText;

  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.classList.remove("active");
    if (item.innerText.trim() === labelText.trim())
      item.classList.add("active");
  });

  const dropdownMenu = document.getElementById("dropdown-menu");
  const triggerBtn = document.getElementById("dropdown-trigger-btn");
  if (dropdownMenu) dropdownMenu.classList.remove("show");
  if (triggerBtn) triggerBtn.classList.remove("open");
}

export function togglePostPopover(e, btnMoreElement) {
  if (e) e.stopPropagation();

  let postCard = null;
  let targetPopover = null;

  if (typeof btnMoreElement === "string") {
    postCard = document.getElementById(`post-${btnMoreElement}`);
    targetPopover = document.getElementById(`popover-${btnMoreElement}`);
  } else if (btnMoreElement && btnMoreElement.nodeType) {
    postCard = btnMoreElement.closest(".post-card");
    targetPopover = postCard
      ? postCard.querySelector(".post-popover-menu")
      : null;
  }

  document.querySelectorAll(".post-card").forEach((card) => {
    if (card !== postCard) card.classList.remove("menu-open");
  });
  document.querySelectorAll(".post-popover-menu").forEach((menu) => {
    if (menu !== targetPopover) menu.classList.remove("show");
  });

  if (targetPopover && postCard) {
    const isOpen = targetPopover.classList.contains("show");
    if (!isOpen) {
      targetPopover.classList.add("show");
      postCard.classList.add("menu-open");
    } else {
      targetPopover.classList.remove("show");
      postCard.classList.remove("menu-open");
    }
  }
}

export function handleAuthorAction(actionType, authorName) {
  alert(`${actionType} requested for "${authorName}"!`);
  document
    .querySelectorAll(".post-popover-menu")
    .forEach((m) => m.classList.remove("show"));
  document
    .querySelectorAll(".post-card")
    .forEach((card) => card.classList.remove("menu-open"));
}

export async function toggleLike(postId) {
  if (!requireAuth("like posts")) return;

  const campusPosts = getCampusPosts();
  const matchingPosts = campusPosts.filter((p) => p.id == postId);
  if (matchingPosts.length === 0) return;

  const post = matchingPosts[0];

  if (post && post.authorId && currentUser && post.authorId !== currentUser.id) {
    const authorPrivacy = getPrivacySettings(post.authorId);
    if (!authorPrivacy.allowPostLikes) {
      showToast("The author has disabled likes on their posts.", "error");
      return;
    }
  }

  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;

  matchingPosts.forEach((p) => {
    p.liked = post.liked;
    p.likes = post.likes;
  });

  const formattedCount = formatCount(post.likes, "reaction", "reactions");

  const likeBtns = document.querySelectorAll(`[id="like-btn-${postId}"]`);
  const likeCounts = document.querySelectorAll(`[id="like-count-${postId}"]`);
  const likeTexts = document.querySelectorAll(`[id="like-text-${postId}"]`);

  likeBtns.forEach((btn) => {
    btn.classList.toggle("liked", post.liked);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.setAttribute("class", post.liked ? "heart-active liked-heart-anim" : "");
      if (post.liked) {
        setTimeout(() => icon.classList.remove("liked-heart-anim"), 500);
      }
    }
  });

  likeTexts.forEach((el) => {
    el.innerText = post.liked ? "Liked" : "Like";
  });

  likeCounts.forEach((el) => {
    el.innerText = formattedCount;
  });

  if (post.liked) {
    const cleanSnippet = post.text
      ? post.text.replace(/\[(activity|tagged):.*?\]/g, "").trim().substring(0, 70)
      : "a campus update";

    const actorId = currentUser ? currentUser.id : (currentProfile ? currentProfile.id : "");
    const actorName = currentProfile ? currentProfile.name : "Campus User";

    addNotification({
      recipientId: post.authorId || post.author,
      actorId: actorId,
      actorName: actorName,
      type: "like_post",
      postId: post.id,
      postSnippet: cleanSnippet || "a campus update",
    });

    let taggedFriends = post.taggedFriends || [];
    if (!taggedFriends.length && post.text && post.text.includes("[tagged:")) {
      const match = post.text.match(/\[tagged:(.+?)\]/);
      if (match) {
        taggedFriends = match[1].split(",").map((item) => {
          const parts = item.split("|");
          return { id: parts[0], name: parts[1] || parts[0] };
        });
      }
    }

    taggedFriends.forEach((tf) => {
      const isPostAuthor = (tf.id && tf.id === (post.authorId || post.author)) || (tf.name && tf.name === post.author);
      const isActor = (tf.id && (tf.id === actorId || tf.id === currentUser?.id || tf.id === currentProfile?.id)) ||
                      (tf.name && (tf.name === actorName || tf.name === currentProfile?.name));

      if (!isPostAuthor && !isActor) {
        addNotification({
          recipientId: tf.id || tf.name,
          actorId: actorId,
          actorName: actorName,
          type: "like_post",
          postId: post.id,
          postSnippet: cleanSnippet || "a campus update",
        });
      }
    });
  }

  if (window.lucide) window.lucide.createIcons();

  if (post.isDbPost && supabaseClient && currentUser) {
    try {
      if (post.liked) {
        await supabaseClient
          .from("post_likes")
          .insert([{ user_id: currentUser.id, post_id: post.id }]);
      } else {
        await supabaseClient
          .from("post_likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("post_id", post.id);
      }
    } catch (err) {
      console.error("Supabase like error:", err);
    }
  }
}

export async function sharePost(postId) {
  const campusPosts = getCampusPosts();
  const matchingPosts = campusPosts.filter((p) => p.id == postId);
  if (matchingPosts.length === 0) return;

  const post = matchingPosts[0];
  const shareUrl = window.location.href;
  const shareData = {
    title: `Notebook — ${post.author}'s Post`,
    text: post.text
      ? post.text.substring(0, 120) + "..."
      : "Check out this campus update!",
    url: shareUrl,
  };

  const updateShareUI = () => {
    post.sharesCount += 1;
    matchingPosts.forEach((p) => (p.sharesCount = post.sharesCount));

    const localShares = getLocalShares();
    localShares[post.id] = post.sharesCount;
    setLocalShares(localShares);

    const formattedShareText = formatCount(post.sharesCount, "share", "shares");
    const shareEls = document.querySelectorAll(`[id="share-count-${postId}"]`);
    shareEls.forEach((el) => {
      el.innerText = formattedShareText;
    });
  };

  const fallbackClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
    alert("Post link copied to clipboard!");
    updateShareUI();
  };

  if (navigator.share && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      updateShareUI();
    } catch (err) {
      if (err.name !== "AbortError") {
        await fallbackClipboard();
      }
    }
  } else {
    await fallbackClipboard();
  }
}

export async function submitNewPost() {
  if (!requireAuth("create a post")) return;

  const input = document.getElementById("post-input");
  const btnPublish = document.getElementById("btn-publish");

  const textContent = input ? input.value.trim() : "";

  let fullContent = textContent;
  if (selectedActivity && selectedActivity.text) {
    fullContent = `[activity:${selectedActivity.text}]\n${textContent}`;
  }
  if (selectedTaggedFriends && selectedTaggedFriends.length > 0) {
    const taggedStr = selectedTaggedFriends.map((f) => `${f.id}|${f.name}`).join(",");
    fullContent = `[tagged:${taggedStr}]\n${fullContent}`;
  }

  if (!fullContent.trim() && !selectedMediaFile) {
    alert("Please write something, choose an activity, tag friends, or attach a photo/video before posting!");
    return;
  }

  let mediaUrl = null;
  const originalBtnHTML = btnPublish ? btnPublish.innerHTML : "";

  if (btnPublish) {
    btnPublish.disabled = true;
    btnPublish.style.opacity = "0.7";
    btnPublish.innerHTML = `<i data-lucide="loader" class="spin"></i> <span>Posting...</span>`;
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    // Upload image or video to Cloudinary first
    if (selectedMediaFile) {
      mediaUrl = await uploadToCloudinary(selectedMediaFile);
    }

    let newPostId = "";
    if (supabaseClient && currentUser) {
      const { data: insertedPost, error } = await supabaseClient
        .from("posts")
        .insert([
          {
            author_id: currentUser.id,
            category: selectedCategoryValue,
            content: fullContent,
            image_url: mediaUrl,
          },
        ])
        .select("id");

      if (error) {
        console.error("Error inserting post to Supabase:", error);
        alert("Failed to publish post: " + error.message);
        return;
      }

      if (insertedPost && insertedPost.length > 0) {
        newPostId = insertedPost[0].id;
      }
    }

    // Send tag notifications to tagged friends
    if (selectedTaggedFriends && selectedTaggedFriends.length > 0) {
      const actorName = currentProfile ? currentProfile.name : "Campus User";
      selectedTaggedFriends.forEach((friend) => {
        addNotification({
          recipientId: friend.id,
          actorId: currentUser ? currentUser.id : "",
          actorName: actorName,
          type: "tag_post",
          postId: newPostId || "",
          postSnippet: textContent ? textContent.substring(0, 70) : "a campus update",
        });
      });
    }

    if (input) input.value = "";
    removeMediaPreview();
    removeActivity();
    removeTaggedFriends();

    await renderFeed(getCurrentModule());
  } catch (err) {
    console.error("Submit post error:", err);
    alert(err.message || "Failed to create post.");
  } finally {
    if (btnPublish) {
      btnPublish.disabled = false;
      btnPublish.style.opacity = "1";
      btnPublish.innerHTML = originalBtnHTML;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}
