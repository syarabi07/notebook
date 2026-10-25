if (typeof window !== "undefined" && window.lucide && window.lucide.createIcons) {
  const origCreate = window.lucide.createIcons;
  window.lucide.createIcons = function (options) {
    return origCreate(Object.assign({ icons: window.lucide.icons }, options || {}));
  };
}

import { cacheDomElements, DOM } from "./utils/helpers.js";
import {
  checkUserSession,
  handleLogin,
  handleSignup,
  handleResetPassword,
  handleLogoutOrLogin,
  openAuthModal,
  closeAuthModal,
  switchAuthTab,
  handleUserAreaClick,
  currentUser,
  currentProfile,
  requireAuth,
} from "./modules/auth.js";
import {
  switchModule,
  toggleCardsSection,
  applyCardsVisibilityState,
  setupScrollListeners,
  toggleSubmenu,
  selectSubmenuItem,
  openDrawer,
  closeDrawers,
  renderCards,
} from "./modules/navigation.js";
import {
  toggleCustomDropdown,
  selectPostCategory,
  submitNewPost,
  togglePostPopover,
  handleAuthorAction,
  toggleLike,
  sharePost,
  handleFileSelect,
  removeMediaPreview,
  openActivityModal,
  closeActivityModal,
  initActivitySelector,
  openTagFriendsModal,
  closeTagFriendsModal,
  initTagFriendsSelector,
} from "./modules/post-interactions.js";
import {
  toggleCommentLike,
  replyToComment,
  toggleCommentsSection,
  addComment,
  deleteComment,
} from "./modules/comments.js";
import {
  renderProfilePage,
  renderUserProfilePage,
  deleteUserPost,
} from "./pages/profile.js";
import { setCurrentModule, getCurrentModule, renderFeed } from "./modules/feed.js";
import { renderSavedPage } from "./pages/saved.js";
import { initThemeListener } from "./pages/settings.js";
import { toggleSavePost } from "./utils/storage.js";
import { initRealtimeFeed } from "./modules/realtime.js";
import { updateNavNotifBadge, fetchNotifications } from "./pages/notifications.js";
import {
  renderFriendsPage,
  addFriend,
  blockUser,
} from "./pages/friends.js";
import { initPWA } from "./modules/pwa.js";

// Lightbox Modal Helper Functions
function openLightbox(mediaSrc, isVideo = false) {
  const modal = document.getElementById("image-lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxVideo = document.getElementById("lightbox-video");
  if (modal) {
    if (isVideo) {
      if (lightboxImg) {
        lightboxImg.src = "";
        lightboxImg.style.display = "none";
      }
      if (lightboxVideo) {
        lightboxVideo.src = mediaSrc;
        lightboxVideo.style.display = "block";
        lightboxVideo.play().catch(() => {});
      }
    } else {
      if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.src = "";
        lightboxVideo.style.display = "none";
      }
      if (lightboxImg) {
        lightboxImg.src = mediaSrc;
        lightboxImg.style.display = "block";
      }
    }
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.removeAttribute("inert");
    document.body.style.overflow = "hidden";
    if (window.lucide) window.lucide.createIcons();
  }
}

function closeLightbox() {
  const modal = document.getElementById("image-lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxVideo = document.getElementById("lightbox-video");
  if (modal) {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    document.body.style.overflow = "";
    if (lightboxVideo) {
      lightboxVideo.pause();
    }
    setTimeout(() => {
      if (lightboxImg) {
        lightboxImg.src = "";
        lightboxImg.style.display = "none";
      }
      if (lightboxVideo) {
        lightboxVideo.src = "";
        lightboxVideo.style.display = "none";
      }
    }, 300);
  }
}

function hideAppLoader() {
  const loader = document.getElementById("app-loader");
  if (loader && !loader.classList.contains("loaded")) {
    loader.classList.add("loaded");
    setTimeout(() => {
      loader.style.display = "none";
    }, 600);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const fallbackTimer = setTimeout(() => hideAppLoader(), 3000);

  initPWA();
  initThemeListener();
  cacheDomElements();
  setupScrollListeners();
  switchModule("home");
  applyCardsVisibilityState();
  await checkUserSession();
  if (getCurrentModule() === "home") {
    await renderCards("home");
  }
  updateNavNotifBadge();
  fetchNotifications();

  // Initialize Supabase Real-time Feed Listener
  initRealtimeFeed();

  // Initialize Activity & Tag Friends Selector Modals
  initActivitySelector();
  initTagFriendsSelector();

  clearTimeout(fallbackTimer);
  setTimeout(() => hideAppLoader(), 250);

  // Event Listeners for Nav & Drawers
  if (DOM.brandArea) {
    DOM.brandArea.addEventListener("click", () => openDrawer(DOM.leftSidebar));
    DOM.brandArea.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openDrawer(DOM.leftSidebar);
    });
  }

  if (DOM.userArea) {
    DOM.userArea.addEventListener("click", handleUserAreaClick);
    DOM.userArea.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleUserAreaClick();
    });
  }

  if (DOM.overlay) {
    DOM.overlay.addEventListener("click", closeDrawers);
  }

  // Direct Close Button Listeners for Mobile Drawers ("X" button fix)
  const leftCloseBtn = document.getElementById("left-close-btn");
  if (leftCloseBtn) leftCloseBtn.addEventListener("click", closeDrawers);

  const rightCloseBtn = document.getElementById("right-close-btn");
  if (rightCloseBtn) rightCloseBtn.addEventListener("click", closeDrawers);

  // Gallery Media File Input Listeners
  const btnMedia = document.getElementById("btn-option-media");
  const postFileInput = document.getElementById("post-file-input");
  const btnRemoveMedia = document.getElementById("btn-remove-media");

  if (btnMedia && postFileInput) {
    btnMedia.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      postFileInput.click();
    });
    postFileInput.addEventListener("change", (e) => handleFileSelect(e));
  }

  if (btnRemoveMedia) {
    btnRemoveMedia.addEventListener("click", removeMediaPreview);
  }

  // Activity Option Button Listener
  const btnActivity = document.getElementById("btn-option-activity");
  if (btnActivity) {
    btnActivity.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openActivityModal();
    });
  }

  // Friends Option Button Listener
  const btnFriends = document.getElementById("btn-option-friends");
  if (btnFriends) {
    btnFriends.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTagFriendsModal();
    });
  }

  // Keydown listener for comment input submission on Enter key, Lightbox ESC close, and Modals ESC close
  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.matches && e.target.matches("input[data-postid]") && e.key === "Enter") {
      e.preventDefault();
      const postId = e.target.dataset.postid;
      addComment(postId);
    }
    if (e.key === "Escape") {
      closeLightbox();
      closeActivityModal();
      closeTagFriendsModal();
    }
  });

  // Module Switch Buttons
  document.querySelectorAll(".module-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const moduleName = btn.dataset.module;
      if (moduleName) switchModule(moduleName);
    });
  });

  // Event Delegation
  document.addEventListener("click", async (e) => {
    // Lightbox media preview (full screen option for photo and video)
    const mediaFullscreenBtn = e.target.closest(".media-fullscreen-btn");
    if (mediaFullscreenBtn) {
      e.preventDefault();
      e.stopPropagation();
      const videoSrc = mediaFullscreenBtn.dataset.videoSrc;
      const imgSrc = mediaFullscreenBtn.dataset.imgSrc;
      if (videoSrc) {
        openLightbox(videoSrc, true);
      } else if (imgSrc) {
        openLightbox(imgSrc, false);
      }
      return;
    }

    const postMediaImg = e.target.closest(".post-media img");
    if (postMediaImg) {
      e.preventDefault();
      openLightbox(postMediaImg.src, false);
      return;
    }

    const lightboxClose = e.target.closest("#lightbox-close-btn") || e.target.id === "image-lightbox-modal";
    if (lightboxClose) {
      e.preventDefault();
      closeLightbox();
      return;
    }

    const authBtn = e.target.closest("#btn-auth-action");
    if (authBtn) {
      e.preventDefault();
      handleLogoutOrLogin();
      return;
    }

    const mobileCloseBtn = e.target.closest(
      "#left-close-btn, #right-close-btn, .close-btn",
    );
    if (mobileCloseBtn) {
      closeDrawers();
      return;
    }

    const profileNavMod = e.target.closest(".profile-nav-module[data-module]");
    if (profileNavMod) {
      e.preventDefault();
      const mod = profileNavMod.dataset.module;
      if (mod) switchModule(mod);
      return;
    }

    const myProfileLink = e.target.closest("#link-my-profile");
    if (myProfileLink) {
      e.preventDefault();
      switchModule("profile");
      return;
    }

    const settingsLink = e.target.closest("#link-settings");
    if (settingsLink) {
      e.preventDefault();
      switchModule("settings");
      return;
    }

    const privacyLink = e.target.closest("#link-privacy");
    if (privacyLink) {
      e.preventDefault();
      switchModule("privacy");
      return;
    }

    const supportLink = e.target.closest("#link-support-desk, .support-trigger");
    if (supportLink) {
      e.preventDefault();
      switchModule("support");
      return;
    }

    const reportCenterLink = e.target.closest("#link-report-center, .report-center-trigger");
    if (reportCenterLink) {
      e.preventDefault();
      switchModule("report");
      return;
    }

    const notifLink = e.target.closest(
      "#link-notifications, #link-notif-all, #top-nav-bell, .notif-trigger",
    );
    if (notifLink) {
      e.preventDefault();
      switchModule("notifications");
      return;
    }

    const authorClickable = e.target.closest(
      ".post-avatar-clickable, .post-author-clickable, .comment-author-link",
    );
    if (authorClickable) {
      e.preventDefault();
      const authorId = authorClickable.dataset.authorId;
      const authorName = authorClickable.dataset.authorName;

      setCurrentModule("profile");

      if (
        (currentUser && authorId && authorId === currentUser.id) ||
        (currentProfile && authorName && authorName === currentProfile.name)
      ) {
        renderProfilePage();
      } else {
        renderUserProfilePage(authorId, authorName);
      }
      closeDrawers();
      return;
    }

    const menuBtn = e.target.closest(".menu-item-btn");
    if (menuBtn && menuBtn.closest(".nav-group")) {
      const action = menuBtn.dataset.action;
      const btnText = menuBtn.querySelector(".menu-item-left span")?.innerText?.trim();
      if (action === "saved" || btnText === "Saved Posts" || btnText === "Saved Items") {
        e.preventDefault();
        switchModule("saved");
        return;
      }
      if (menuBtn.querySelector(".chevron-icon")) {
        toggleSubmenu(menuBtn);
      }
    }

    const subItem = e.target.closest(".submenu-item");
    if (subItem) {
      e.preventDefault();
      selectSubmenuItem(subItem);
      const subText = subItem.innerText.trim().toLowerCase();
      if (subText.includes("online friend") || subText.includes("my friend") || subText === "my friends") {
        renderFriendsPage("online-friends");
      } else if (subText.includes("classmate") || subText === "all classmates") {
        renderFriendsPage("all-classmates");
      } else if (subText.includes("friend request") || subText === "friend requests") {
        renderFriendsPage("friend-requests");
      } else if (subText.includes("blocked list") || subText === "blocked list") {
        renderFriendsPage("blocked-list");
      }
      closeDrawers();
    }

    const cardShortcut = e.target.closest(".card");
    if (cardShortcut && !cardShortcut.classList.contains("skeleton")) {
      const title = cardShortcut.querySelector(".card-title")?.innerText.trim();
      if (title === "My Profile") {
        e.preventDefault();
        renderProfilePage();
        return;
      }
      if (title === "Friends & Network") {
        e.preventDefault();
        renderFriendsPage("online-friends");
        return;
      }
      if (title === "Saved Posts" || title === "Saved Items") {
        e.preventDefault();
        switchModule("saved");
        return;
      }
    }

    const btnMore = e.target.closest(".btn-more");
    if (btnMore) {
      togglePostPopover(e, btnMore);
      return;
    }

    const popoverBtn = e.target.closest(".popover-btn");
    if (popoverBtn) {
      const action = popoverBtn.dataset.action;
      const author = popoverBtn.dataset.author;
      const postId = popoverBtn.dataset.postId;

      document
        .querySelectorAll(".post-popover-menu")
        .forEach((m) => m.classList.remove("show"));
      document
        .querySelectorAll(".post-card")
        .forEach((c) => c.classList.remove("menu-open"));

      if (action === "My Profile") {
        switchModule("profile");
      } else if (action === "Add Friend") {
        addFriend(author || "Student");
      } else if (action === "Delete Post") {
        if (!requireAuth("delete posts")) return;
        if (postId) deleteUserPost(postId);
      } else if (action === "Save Post" || action === "Unsave Post") {
        if (!requireAuth("save posts")) {
          return;
        }
        if (postId) {
          const isNowSaved = await toggleSavePost(postId, currentUser.id);
          const currentMod = getCurrentModule();
          if (currentMod === "saved") {
            renderSavedPage();
          } else if (
            ["home", "health", "transport", "academic", "logistics"].includes(
              currentMod,
            )
          ) {
            renderFeed(currentMod);
          } else if (currentMod === "profile") {
            renderProfilePage();
          }
        }
      } else if (action === "Block User") {
        blockUser(author || "Student");
      } else if (action === "Report Post" || action === "Report User") {
        const authorId = popoverBtn.dataset.authorId;
        switchModule("report", {
          targetType: "post",
          targetName: author || "Campus User",
          targetId: authorId || (postId ? `Post #${postId}` : "Campus Student"),
          postId: postId || null,
        });
      } else if (action && author) {
        handleAuthorAction(action, author);
      }
      return;
    }

    if (
      !e.target.closest(".btn-more") &&
      !e.target.closest(".post-popover-menu")
    ) {
      document
        .querySelectorAll(".post-popover-menu")
        .forEach((m) => m.classList.remove("show"));
      document
        .querySelectorAll(".post-card")
        .forEach((c) => c.classList.remove("menu-open"));
    }

    const likeBtn = e.target.closest(".action-btn[data-postid]");
    if (likeBtn) {
      const postId = likeBtn.dataset.postid;
      toggleLike(postId);
    }

    const commentBtn = e.target.closest(".action-btn[data-toggle-comment]");
    if (commentBtn) {
      const postId = commentBtn.dataset.toggleComment;
      toggleCommentsSection(postId);
    }

    const submitCommentBtn = e.target.closest("[data-submit-comment]");
    if (submitCommentBtn) {
      const postId = submitCommentBtn.dataset.submitComment;
      addComment(postId);
    }

    const shareBtn = e.target.closest(".action-btn[data-shareid]");
    if (shareBtn) {
      const postId = shareBtn.dataset.shareid;
      sharePost(postId);
    }

    const deleteCommentBtn = e.target.closest(
      ".btn-comment-delete, .btn-delete-comment",
    );
    if (deleteCommentBtn) {
      const postId = deleteCommentBtn.dataset.postid;
      const commentId = deleteCommentBtn.dataset.commentid;
      deleteComment(postId, commentId);
      return;
    }

    const reportCommentBtn = e.target.closest(".btn-comment-report");
    if (reportCommentBtn) {
      const author = reportCommentBtn.dataset.author || "Student";
      const commentAuthorId = reportCommentBtn.dataset.authorId || "";
      switchModule("report", {
        targetType: "comment",
        targetName: author,
        targetId: commentAuthorId || "Comment",
      });
      return;
    }

    const commentLikeBtn = e.target.closest(".btn-comment-like");
    if (commentLikeBtn) {
      const postId = commentLikeBtn.dataset.postid;
      const commentId = commentLikeBtn.dataset.commentid;
      toggleCommentLike(postId, commentId);
      return;
    }

    const replyBtn = e.target.closest(".btn-comment-reply");
    if (replyBtn) {
      const postId = replyBtn.dataset.postid;
      const author = replyBtn.dataset.replyAuthor;
      const commentAuthorId = replyBtn.dataset.commentAuthorId;
      replyToComment(postId, author, commentAuthorId);
      return;
    }
  });

  const dropdownTrigger = document.getElementById("dropdown-trigger-btn");
  if (dropdownTrigger) {
    dropdownTrigger.addEventListener("click", (e) => toggleCustomDropdown(e));
  }

  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", () => {
      const val = item.dataset.value;
      const label = item.dataset.label;
      if (val && label) selectPostCategory(val, label);
    });
  });

  const btnPublish = document.getElementById("btn-publish");
  if (btnPublish) {
    btnPublish.addEventListener("click", () => submitNewPost());
  }

  const formLogin = document.getElementById("form-login");
  if (formLogin) formLogin.addEventListener("submit", (e) => handleLogin(e));

  const formSignup = document.getElementById("form-signup");
  if (formSignup) formSignup.addEventListener("submit", (e) => handleSignup(e));

  const formReset = document.getElementById("form-reset");
  if (formReset) formReset.addEventListener("submit", (e) => handleResetPassword(e));

  const btnForgotPassword = document.getElementById("btn-forgot-password-link");
  if (btnForgotPassword)
    btnForgotPassword.addEventListener("click", () => switchAuthTab("reset"));

  const btnResetBack = document.getElementById("btn-reset-back");
  if (btnResetBack)
    btnResetBack.addEventListener("click", () => switchAuthTab("login"));

  const tabLogin = document.getElementById("tab-login");
  if (tabLogin)
    tabLogin.addEventListener("click", () => switchAuthTab("login"));

  const tabSignup = document.getElementById("tab-signup");
  if (tabSignup)
    tabSignup.addEventListener("click", () => switchAuthTab("signup"));

  const authCloseBtn = document.getElementById("auth-close-btn");
  if (authCloseBtn)
    authCloseBtn.addEventListener("click", () => closeAuthModal());

  const toggleCardsBtn = document.getElementById("toggle-cards-btn");
  if (toggleCardsBtn)
    toggleCardsBtn.addEventListener("click", () => toggleCardsSection());

  // Periodically sync notifications for real-time badge updates across all pages
  setInterval(() => {
    fetchNotifications();
  }, 15000);
});
