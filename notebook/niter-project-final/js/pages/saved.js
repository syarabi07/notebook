import { supabaseClient } from "../config/supabase.js";
import {
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
} from "../utils/helpers.js";
import { currentUser, currentProfile } from "../modules/auth.js";
import {
  renderPostCardHTML,
  setCurrentModule,
  fetchPostsFromSupabase,
} from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import { getSavedPostIds } from "../utils/storage.js";
import { removeProfileHeaderCard } from "./profile.js";

export async function renderSavedPage() {
  setCurrentModule("saved");
  clearNavActiveStates();
  renderRightSidebar("standard");
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

  if (pageTitle) pageTitle.innerText = "Saved Posts";
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText =
      "Access all the campus updates, announcements, and posts you have bookmarked.";
  if (moduleBadge) moduleBadge.innerText = "SAVED";

  if (feedTitle) feedTitle.innerText = "Bookmarked Posts";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> SAVED COLLECTION`;

  if (!currentUser || !currentProfile) {
    if (postsFeed) {
      postsFeed.innerHTML = `
        <div class="network-auth-required-card">
          <div class="network-auth-icon">
            <i data-lucide="bookmark"></i>
          </div>
          <h3>Saved Posts Collection</h3>
          <p>Please <strong>Log In</strong> or <strong>Sign Up</strong> to access and view your saved campus posts and bookmarked updates.</p>
          <div class="network-auth-actions">
            <button class="btn btn-primary" id="saved-login-btn">
              <i data-lucide="log-in"></i> <span>Log In</span>
            </button>
            <button class="btn btn-outline" id="saved-signup-btn">
              <i data-lucide="user-plus"></i> <span>Sign Up</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      const loginBtn = document.getElementById("saved-login-btn");
      const signupBtn = document.getElementById("saved-signup-btn");
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
      { label: "Saved Posts", val: "0" },
      { label: "Collection", val: "Private" },
    ]);
    return;
  }

  if (postsFeed) {
    postsFeed.innerHTML = `<div class="infinite-feed-loader"><div class="skeleton-pill"></div></div>`;
  }

  // Fetch all posts from Supabase (or home module)
  const allPosts = await fetchPostsFromSupabase("home");
  const savedIds = getSavedPostIds(currentUser.id);

  const savedPosts = allPosts.filter((post) =>
    savedIds.includes(String(post.id)),
  );

  renderMetrics([
    { label: "Saved Posts", val: String(savedPosts.length) },
    { label: "Collection", val: "Private" },
  ]);

  if (!postsFeed) return;

  if (savedPosts.length === 0) {
    postsFeed.innerHTML = `
      <div class="empty-feed">
        <i data-lucide="bookmark-x"></i>
        <p>You haven't saved any posts yet. Click the three dots (<i data-lucide="more-horizontal" style="vertical-align: middle;"></i>) on any post to bookmark it for later!</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  postsFeed.innerHTML = savedPosts.map((post) => renderPostCardHTML(post)).join("");
  if (window.lucide) window.lucide.createIcons();
}

