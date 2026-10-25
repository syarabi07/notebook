import { NITER_DEPTS } from "../config/constants.js";
import { updateNavNotifBadge } from "../pages/notifications.js";
import { requireAuth } from "../modules/auth.js";
import {
  getRelationshipStatus,
  addFriend,
  unfriendUser,
  acceptFriendRequest,
  cancelFriendRequest,
  blockUser,
  unblockUser,
} from "../pages/friends.js";

export let DOM = {};

export function cacheDomElements() {
  DOM.mainContent = document.querySelector(".main-content");
  DOM.dynamicLinks = document.getElementById("dynamic-links");
  DOM.pageTitle = document.getElementById("page-title");
  DOM.pageEyebrow = document.getElementById("page-eyebrow");
  DOM.pageSub = document.getElementById("page-sub");
  DOM.moduleBadge = document.getElementById("module-badge");
  DOM.headerMetrics = document.getElementById("header-metrics");
  DOM.contentGrid = document.getElementById("content-grid");
  DOM.contentInner = document.getElementById("content-inner");
  DOM.cardsSubtitle = document.getElementById("cards-subtitle");
  DOM.postsFeed = document.getElementById("posts-feed");
  DOM.feedTitle = document.getElementById("feed-title");
  DOM.feedFilterTag = document.getElementById("feed-filter-tag");

  DOM.createPostCard = document.getElementById("create-post-card");
  DOM.leftSidebar = document.getElementById("left-sidebar");
  DOM.rightSidebar = document.getElementById("right-sidebar");
  DOM.overlay = document.getElementById("overlay");
  DOM.brandArea = document.getElementById("brand-area");
  DOM.userArea = document.getElementById("user-area");
}

export function parseNiterStudentId(idString) {
  if (!idString)
    return { deptName: "General", deptCode: "GEN", year: "1st Year" };

  const cleanId = idString.trim().toUpperCase();
  const match = cleanId.match(/^([A-Z]{2})\s*(\d{2})/);

  let deptCode = "GEN";
  let deptName = "Campus";
  let yearStr = "1st Year";

  if (match) {
    const prefix = match[1];
    const yrDigits = parseInt(match[2], 10);

    if (NITER_DEPTS[prefix]) {
      deptName = NITER_DEPTS[prefix].name;
      deptCode = NITER_DEPTS[prefix].code;
    } else {
      deptCode = prefix;
      deptName = prefix;
    }

    if (!isNaN(yrDigits)) {
      const admissionYear = 2000 + yrDigits;
      const currentYear = 2026;
      const diff = currentYear - admissionYear + 1;

      if (diff <= 1) yearStr = "1st Year";
      else if (diff === 2) yearStr = "2nd Year";
      else if (diff === 3) yearStr = "3rd Year";
      else yearStr = "4th Year";
    }
  }

  return { deptName, deptCode, year: yearStr };
}

export function getInitials(name) {
  if (!name || typeof name !== "string") return "GU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "GU";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function generateInitialsAvatar(
  name,
  bg = "#2A46FF",
  color = "#FFFFFF",
) {
  const initials = getInitials(name);
  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" rx="50%" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="38" font-weight="700" fill="${color}">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
}

export function formatTimeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}

export function formatCount(count, singular, plural) {
  const num = typeof count === "number" ? count : 0;
  const label = num <= 1 ? singular : plural || singular + "s";
  return `${num} ${label}`;
}

export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

export function clearNavActiveStates() {
  document.querySelectorAll(".module-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-current", "false");
  });
  document.querySelectorAll(".submenu-item").forEach((item) => {
    item.classList.remove("active");
  });
}

export function renderMetrics(metrics) {
  const headerMetrics = document.getElementById("header-metrics");
  if (!headerMetrics) return;
  headerMetrics.innerHTML = metrics
    .map(
      (m) => `
        <div class="metric-item">
            <span class="metric-label">${m.label}</span>
            <span class="metric-value">${m.val !== undefined && m.val !== null ? m.val : ""}</span>
        </div>
    `,
    )
    .join("");
}

export function renderViewProfileSidebar(targetProfile) {
  const dynamicLinks = document.getElementById("dynamic-links");
  if (!dynamicLinks) return;

  const targetName = targetProfile ? targetProfile.name : "Student";
  const targetId = targetProfile ? (targetProfile.id || targetProfile.name) : "Student";
  const rel = getRelationshipStatus(targetId);

  let friendBtnText = "Add Friend";
  let friendBtnIcon = "user-plus";
  let friendBtnClass = "primary";

  if (rel === "friend") {
    friendBtnText = "Unfriend";
    friendBtnIcon = "user-minus";
    friendBtnClass = "secondary";
  } else if (rel === "sent_request") {
    friendBtnText = "Cancel Request";
    friendBtnIcon = "clock";
    friendBtnClass = "secondary";
  } else if (rel === "received_request") {
    friendBtnText = "Accept Request";
    friendBtnIcon = "user-check";
    friendBtnClass = "primary";
  }

  let blockBtnText = rel === "blocked" ? "Unblock User" : "Block User";
  let blockBtnIcon = rel === "blocked" ? "shield-off" : "shield-alert";

  dynamicLinks.innerHTML = `
    <div class="profile-actions-sidebar">
        <p class="profile-actions-title">USER ACTIONS</p>

        <button class="profile-action-btn ${friendBtnClass}" id="profile-btn-friend-action">
            <i data-lucide="${friendBtnIcon}"></i>
            <span>${friendBtnText}</span>
        </button>

        <p class="profile-actions-title danger-title">SAFETY & MODERATION</p>

        <button class="profile-action-btn danger" id="profile-btn-block-action">
            <i data-lucide="${blockBtnIcon}"></i>
            <span>${blockBtnText}</span>
        </button>

        <button class="profile-action-btn danger" id="profile-btn-report-action">
            <i data-lucide="flag"></i>
            <span>Report Profile</span>
        </button>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Attach Event Listeners
  const friendBtn = document.getElementById("profile-btn-friend-action");
  if (friendBtn) {
    friendBtn.addEventListener("click", () => {
      if (rel === "friend") unfriendUser(targetId);
      else if (rel === "sent_request") cancelFriendRequest(targetId);
      else if (rel === "received_request") acceptFriendRequest(targetId);
      else addFriend(targetId);
      renderViewProfileSidebar(targetProfile);
    });
  }

  const blockBtn = document.getElementById("profile-btn-block-action");
  if (blockBtn) {
    blockBtn.addEventListener("click", () => {
      if (rel === "blocked") unblockUser(targetId);
      else blockUser(targetId);
      renderViewProfileSidebar(targetProfile);
    });
  }

  const reportBtn = document.getElementById("profile-btn-report-action");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      import("../modules/navigation.js").then(({ switchModule }) => {
        switchModule("report", {
          targetType: "profile",
          targetName: targetName,
          targetId: targetId,
        });
      });
    });
  }
}

export function showToast(message, type = "info") {
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
  }, 3200);
}

export function renderRightSidebar(mode = "standard") {
  const container = document.getElementById("static-right-links");
  if (!container) return;

  const myProfileBtn = document.getElementById("link-my-profile");
  const settingsBtn = document.getElementById("link-settings");
  const privacyBtn = document.getElementById("link-privacy");
  const supportBtn = document.getElementById("link-support-desk");
  const reportCenterBtn = document.getElementById("link-report-center");

  if (myProfileBtn) {
    if (mode === "my-profile") {
      myProfileBtn.classList.add("active");
    } else {
      myProfileBtn.classList.remove("active");
    }
  }

  if (settingsBtn) {
    if (mode === "settings") {
      settingsBtn.classList.add("active");
    } else {
      settingsBtn.classList.remove("active");
    }
  }

  if (privacyBtn) {
    if (mode === "privacy") {
      privacyBtn.classList.add("active");
    } else {
      privacyBtn.classList.remove("active");
    }
  }

  if (supportBtn) {
    if (mode === "support") {
      supportBtn.classList.add("active");
    } else {
      supportBtn.classList.remove("active");
    }
  }

  if (reportCenterBtn) {
    if (mode === "report") {
      reportCenterBtn.classList.add("active");
    } else {
      reportCenterBtn.classList.remove("active");
    }
  }

  updateNavNotifBadge();
}

