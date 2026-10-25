import {
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
  showToast,
} from "../utils/helpers.js";
import { currentUser } from "../modules/auth.js";
import { setCurrentModule } from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import { removeProfileHeaderCard } from "./profile.js";
import {
  getPrivacySettings,
  savePrivacySettings,
} from "../utils/storage.js";

export async function renderPrivacyPage() {
  setCurrentModule("privacy");
  clearNavActiveStates();
  renderRightSidebar("privacy");
  renderSidebarMenu("home");
  clearNavActiveStates();

  const contentInner = document.getElementById("content-inner");
  if (!contentInner) return;

  // Clean up any profile header card from profile views
  removeProfileHeaderCard();

  // Update Header Metadata
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");
  const postsFeed = document.getElementById("posts-feed");
  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  if (pageTitle) pageTitle.innerText = "Privacy & Security";
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText =
      "Control who can view your profile, interact with your posts, like or reply to your comments, and tag you in updates.";
  if (moduleBadge) moduleBadge.innerText = "PRIVACY";

  if (feedTitle) feedTitle.innerText = "Privacy Controls";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> SECURITY RULES`;

  const settings = getPrivacySettings();

  // Render Header Metrics Tag
  renderMetrics([
    { label: "Profile Access", val: settings.allowViewProfile ? "Public" : "Private" },
    { label: "Activity Scope", val: settings.activityVisibility === "friends" ? "Friends Only" : "Public" },
  ]);

  let guestNoticeHTML = "";
  if (!currentUser) {
    guestNoticeHTML = `
      <div class="network-auth-required-card" style="margin: 0 0 1.5rem 0;">
        <div class="network-auth-icon">
          <i data-lucide="shield-check"></i>
        </div>
        <h3>Custom Privacy & Security Preferences</h3>
        <p>Log in or create an account to persist your custom interaction rules across campus devices. Previewing local settings below:</p>
        <div class="network-auth-actions">
          <button class="btn btn-primary" id="privacy-login-btn">
            <i data-lucide="log-in"></i> <span>Log In</span>
          </button>
          <button class="btn btn-outline" id="privacy-signup-btn">
            <i data-lucide="user-plus"></i> <span>Sign Up</span>
          </button>
        </div>
      </div>
    `;
  }

  const privacyFormHTML = `
    ${guestNoticeHTML}
    <div class="privacy-container">
      
      <!-- CARD 1: PROFILE & ACTIVITY VISIBILITY -->
      <div class="privacy-card">
        <div class="privacy-card-header">
          <div class="privacy-card-icon">
            <i data-lucide="user-check"></i>
          </div>
          <div>
            <h3 class="privacy-card-title">Profile & Activity Visibility</h3>
            <p class="privacy-card-subtitle">Manage who can view your profile details and campus updates.</p>
          </div>
        </div>

        <div class="privacy-options-list">
          
          <!-- 1. View Profile Toggle -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow people to view your profile</span>
              <span class="privacy-toggle-desc">When disabled, other students cannot view your profile page, credentials, or bio.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowViewProfile ? "status-on" : "status-off"}" id="badge-allow-view-profile">${settings.allowViewProfile ? "ON" : "OFF"}</span>
              <label for="privacy-allow-view-profile" class="switch-label" title="Toggle profile visibility">
                <input type="checkbox" id="privacy-allow-view-profile" aria-label="Allow people to view your profile" ${settings.allowViewProfile ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- 7. Activity Visibility (Friends / Public) -->
          <div style="margin-top: 0.5rem;">
            <div class="privacy-toggle-info" style="margin-bottom: 0.5rem;">
              <span class="privacy-toggle-title">Make your activity (post, like, comment, reply etc.) visible to:</span>
              <span class="privacy-toggle-desc">Choose whether your campus feed activity is public to everyone or restricted to your confirmed friends.</span>
            </div>

            <div class="visibility-options-grid">
              <label for="vis-public" class="visibility-option-card ${settings.activityVisibility === "public" ? "active" : ""}" id="opt-vis-public">
                <input type="radio" id="vis-public" name="activityVisibility" value="public" ${settings.activityVisibility === "public" ? "checked" : ""}>
                <div class="visibility-option-meta">
                  <span class="visibility-option-title"><i data-lucide="globe"></i> Everyone (Public)</span>
                  <span class="visibility-option-desc">All NITER campus students can see your posts, likes, comments, and replies.</span>
                </div>
              </label>

              <label for="vis-friends" class="visibility-option-card ${settings.activityVisibility === "friends" ? "active" : ""}" id="opt-vis-friends">
                <input type="radio" id="vis-friends" name="activityVisibility" value="friends" ${settings.activityVisibility === "friends" ? "checked" : ""}>
                <div class="visibility-option-meta">
                  <span class="visibility-option-title"><i data-lucide="users"></i> Friends Only</span>
                  <span class="visibility-option-desc">Only your confirmed friends can view your feed updates and activity.</span>
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- CARD 2: POST INTERACTIONS -->
      <div class="privacy-card">
        <div class="privacy-card-header">
          <div class="privacy-card-icon">
            <i data-lucide="message-square-heart"></i>
          </div>
          <div>
            <h3 class="privacy-card-title">Post Interactions</h3>
            <p class="privacy-card-subtitle">Control how other users can interact with posts created by you.</p>
          </div>
        </div>

        <div class="privacy-options-list">
          
          <!-- 2. Like in your post -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow people to Like in your post</span>
              <span class="privacy-toggle-desc">When disabled, other students cannot react or like any posts published by you.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowPostLikes ? "status-on" : "status-off"}" id="badge-allow-post-likes">${settings.allowPostLikes ? "ON" : "OFF"}</span>
              <label for="privacy-allow-post-likes" class="switch-label" title="Toggle post likes">
                <input type="checkbox" id="privacy-allow-post-likes" aria-label="Allow people to Like in your post" ${settings.allowPostLikes ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- 3. Comment in your post -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow people to comment in your post</span>
              <span class="privacy-toggle-desc">When disabled, commenting is turned off for all posts authored by you.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowPostComments ? "status-on" : "status-off"}" id="badge-allow-post-comments">${settings.allowPostComments ? "ON" : "OFF"}</span>
              <label for="privacy-allow-post-comments" class="switch-label" title="Toggle post comments">
                <input type="checkbox" id="privacy-allow-post-comments" aria-label="Allow people to comment in your post" ${settings.allowPostComments ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- CARD 3: COMMENTS & TAGGING PERMISSIONS -->
      <div class="privacy-card">
        <div class="privacy-card-header">
          <div class="privacy-card-icon">
            <i data-lucide="message-circle"></i>
          </div>
          <div>
            <h3 class="privacy-card-title">Comment & Tagging Permissions</h3>
            <p class="privacy-card-subtitle">Manage interactions on your comments and friend tagging rules.</p>
          </div>
        </div>

        <div class="privacy-options-list">
          
          <!-- 4. Like in your comment -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow people to like in your comment</span>
              <span class="privacy-toggle-desc">When disabled, other students cannot give likes to comments written by you.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowCommentLikes ? "status-on" : "status-off"}" id="badge-allow-comment-likes">${settings.allowCommentLikes ? "ON" : "OFF"}</span>
              <label for="privacy-allow-comment-likes" class="switch-label" title="Toggle comment likes">
                <input type="checkbox" id="privacy-allow-comment-likes" aria-label="Allow people to like in your comment" ${settings.allowCommentLikes ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- 5. Reply in your comment -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow people to reply in your comment</span>
              <span class="privacy-toggle-desc">When disabled, direct replies to your comments are restricted.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowCommentReplies ? "status-on" : "status-off"}" id="badge-allow-comment-replies">${settings.allowCommentReplies ? "ON" : "OFF"}</span>
              <label for="privacy-allow-comment-replies" class="switch-label" title="Toggle comment replies">
                <input type="checkbox" id="privacy-allow-comment-replies" aria-label="Allow people to reply in your comment" ${settings.allowCommentReplies ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- 6. Friends tag you in their post -->
          <div class="privacy-toggle-item">
            <div class="privacy-toggle-info">
              <span class="privacy-toggle-title">Allow friends to tag you in there post</span>
              <span class="privacy-toggle-desc">When disabled, friends will not be able to select or tag your account when publishing posts.</span>
            </div>
            <div class="toggle-control-group">
              <span class="toggle-status-badge ${settings.allowFriendTagging ? "status-on" : "status-off"}" id="badge-allow-friend-tagging">${settings.allowFriendTagging ? "ON" : "OFF"}</span>
              <label for="privacy-allow-friend-tagging" class="switch-label" title="Toggle friend tagging">
                <input type="checkbox" id="privacy-allow-friend-tagging" aria-label="Allow friends to tag you in their post" ${settings.allowFriendTagging ? "checked" : ""}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

        </div>

        <div class="privacy-actions">
          <button type="button" id="btn-save-privacy-settings" class="btn btn-primary">
            <i data-lucide="shield-check"></i> <span>Save Privacy Settings</span>
          </button>
          <span id="privacy-save-msg" class="privacy-msg"></span>
        </div>
      </div>

    </div>
  `;

  if (postsFeed) {
    postsFeed.innerHTML = privacyFormHTML;
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Login / Signup triggers if guest
  const loginBtn = document.getElementById("privacy-login-btn");
  const signupBtn = document.getElementById("privacy-signup-btn");
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

  // Dynamic Switch Badge Handlers
  const toggleSwitches = [
    { inputId: "privacy-allow-view-profile", badgeId: "badge-allow-view-profile" },
    { inputId: "privacy-allow-post-likes", badgeId: "badge-allow-post-likes" },
    { inputId: "privacy-allow-post-comments", badgeId: "badge-allow-post-comments" },
    { inputId: "privacy-allow-comment-likes", badgeId: "badge-allow-comment-likes" },
    { inputId: "privacy-allow-comment-replies", badgeId: "badge-allow-comment-replies" },
    { inputId: "privacy-allow-friend-tagging", badgeId: "badge-allow-friend-tagging" },
  ];

  toggleSwitches.forEach(({ inputId, badgeId }) => {
    const inputEl = document.getElementById(inputId);
    const badgeEl = document.getElementById(badgeId);
    if (inputEl && badgeEl) {
      inputEl.addEventListener("change", () => {
        if (inputEl.checked) {
          badgeEl.textContent = "ON";
          badgeEl.className = "toggle-status-badge status-on";
        } else {
          badgeEl.textContent = "OFF";
          badgeEl.className = "toggle-status-badge status-off";
        }
      });
    }
  });

  // Activity Visibility Radio Selection Handlers
  const optPublic = document.getElementById("opt-vis-public");
  const optFriends = document.getElementById("opt-vis-friends");

  if (optPublic && optFriends) {
    optPublic.addEventListener("click", () => {
      optPublic.classList.add("active");
      optFriends.classList.remove("active");
      const radio = optPublic.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });

    optFriends.addEventListener("click", () => {
      optFriends.classList.add("active");
      optPublic.classList.remove("active");
      const radio = optFriends.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  }

  // Save Settings Click Handler
  const saveBtn = document.getElementById("btn-save-privacy-settings");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const allowViewProfile = !!document.getElementById("privacy-allow-view-profile")?.checked;
      const allowPostLikes = !!document.getElementById("privacy-allow-post-likes")?.checked;
      const allowPostComments = !!document.getElementById("privacy-allow-post-comments")?.checked;
      const allowCommentLikes = !!document.getElementById("privacy-allow-comment-likes")?.checked;
      const allowCommentReplies = !!document.getElementById("privacy-allow-comment-replies")?.checked;
      const allowFriendTagging = !!document.getElementById("privacy-allow-friend-tagging")?.checked;

      const activityVisibilityRadio = document.querySelector('input[name="activityVisibility"]:checked');
      const activityVisibility = activityVisibilityRadio ? activityVisibilityRadio.value : "public";

      const newSettings = {
        allowViewProfile,
        allowPostLikes,
        allowPostComments,
        allowCommentLikes,
        allowCommentReplies,
        allowFriendTagging,
        activityVisibility,
      };

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i data-lucide="loader"></i> <span>Saving...</span>`;
      if (window.lucide) window.lucide.createIcons();

      try {
        await savePrivacySettings(newSettings);

        const msgEl = document.getElementById("privacy-save-msg");
        if (msgEl) {
          msgEl.className = "privacy-msg success";
          msgEl.innerText = "Privacy settings saved successfully!";
        }

        renderMetrics([
          { label: "Profile Access", val: allowViewProfile ? "Public" : "Private" },
          { label: "Activity Scope", val: activityVisibility === "friends" ? "Friends Only" : "Public" },
        ]);

        showToast("Privacy settings updated!", "success");
      } catch (err) {
        console.error("Error saving privacy settings:", err);
        const msgEl = document.getElementById("privacy-save-msg");
        if (msgEl) {
          msgEl.className = "privacy-msg error";
          msgEl.innerText = "Error saving privacy settings.";
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="shield-check"></i> <span>Save Privacy Settings</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}
