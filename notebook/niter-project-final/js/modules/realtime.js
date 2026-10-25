import { supabaseClient } from "../config/supabase.js";
import { renderFeed, getCurrentModule, getCampusPosts } from "./feed.js";
import { formatCount, escapeHtml } from "../utils/helpers.js";
import { currentUser } from "./auth.js";
import { renderNotificationsPage, updateNavNotifBadge } from "../pages/notifications.js";

let realtimeChannel = null;

export function initRealtimeFeed() {
  if (!supabaseClient) {
    console.warn("Supabase client not initialized. Realtime disabled.");
    return;
  }

  // Avoid duplicate subscriptions
  if (realtimeChannel) {
    return;
  }

  console.log("Initializing Supabase Real-time Feed Subscriptions...");

  realtimeChannel = supabaseClient
    .channel("realtime-campus-feed")
    // 1. LISTEN TO REAL-TIME POST CHANGES (INSERT, UPDATE, DELETE)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      async (payload) => {
        console.log("⚡ Real-time Post Event received:", payload.eventType, payload);
        const currentMod = getCurrentModule();

        if (payload.eventType === "INSERT") {
          const newPostCat = payload.new.category;
          // Refresh feed if viewing Home or the post's specific category or profile
          if (currentMod === "home" || currentMod === newPostCat || currentMod === "profile") {
            await renderFeed(currentMod);
            showRealtimeNotification("📢 New campus update posted!");
          }
        } else if (payload.eventType === "DELETE") {
          const deletedId = payload.old.id;
          const postCard = document.getElementById(`post-${deletedId}`);
          if (postCard) {
            postCard.style.transition = "all 0.3s ease";
            postCard.style.opacity = "0";
            postCard.style.transform = "scale(0.95)";
            setTimeout(() => postCard.remove(), 300);
          }
        } else if (payload.eventType === "UPDATE") {
          if (currentMod !== "profile") {
            await renderFeed(currentMod);
          }
        }
      },
    )
    // 2. LISTEN TO REAL-TIME COMMENT CHANGES (INSERT, DELETE)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      async (payload) => {
        console.log("⚡ Real-time Comment Event received:", payload.eventType, payload);

        if (payload.eventType === "INSERT") {
          const postId = payload.new.post_id;
          const commentId = payload.new.id;

          // Update comment counter in UI
          await updatePostCommentCount(postId);

          // If comment list is expanded for this post, append the new comment dynamically
          const commentsList = document.getElementById(`comments-list-${postId}`);
          if (commentsList) {
            // Fetch author profile for newly inserted comment
            let authorName = "Campus Student";
            let authorId = payload.new.author_id;

            if (payload.new.author_id) {
              const { data: prof } = await supabaseClient
                .from("profiles")
                .select("name")
                .eq("id", payload.new.author_id)
                .maybeSingle();
              if (prof) authorName = prof.name;
            }

            // Check if element already exists in DOM (e.g. inserted optimistically)
            const existingEl = document.getElementById(`comment-${postId}-${commentId}`);
            if (!existingEl) {
              const commentDiv = document.createElement("div");
              commentDiv.className = "comment-item";
              commentDiv.id = `comment-${postId}-${commentId}`;
              commentDiv.innerHTML = `
                <div class="comment-content">
                    <a href="#" class="comment-author-link" data-author-id="${authorId}" data-author-name="${escapeHtml(authorName)}">${escapeHtml(authorName)}</a>
                    <span class="comment-text">${escapeHtml(payload.new.content)}</span>
                </div>
                <div class="comment-actions-row">
                    <button class="btn-comment-action btn-comment-like" id="comment-like-btn-${postId}-${commentId}" data-postid="${postId}" data-commentid="${commentId}">
                        Like
                    </button>
                    <span>•</span>
                    <button class="btn-comment-action btn-comment-reply" data-reply-author="${escapeHtml(authorName)}" data-postid="${postId}">
                        Reply
                    </button>
                    <span>•</span>
                    <button class="btn-comment-action btn-comment-report text-danger" data-commentid="${commentId}" data-author="${escapeHtml(authorName)}">
                        Report
                    </button>
                </div>
              `;
              commentsList.appendChild(commentDiv);
            }
          }
        } else if (payload.eventType === "DELETE") {
          const deletedCommentId = payload.old.id;
          const commentEl = document.querySelector(`[data-commentid="${deletedCommentId}"]`)?.closest(".comment-item");
          if (commentEl) {
            const postId = commentEl.id.split("-")[1];
            commentEl.remove();
            if (postId) updatePostCommentCount(postId);
          }
        }
      },
    )
    // 3. LISTEN TO REAL-TIME POST LIKES (INSERT, DELETE)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_likes" },
      async (payload) => {
        console.log("⚡ Real-time Post Likes Event:", payload.eventType, payload);
        const postId = payload.new ? payload.new.post_id : payload.old ? payload.old.post_id : null;
        if (postId) {
          await updatePostLikeCount(postId);
        }
      },
    )
    // 4. LISTEN TO REAL-TIME COMMENT LIKES (INSERT, DELETE)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comment_likes" },
      async (payload) => {
        console.log("⚡ Real-time Comment Likes Event:", payload.eventType, payload);
        const commentId = payload.new ? payload.new.comment_id : payload.old ? payload.old.comment_id : null;
        if (commentId) {
          await updateCommentLikeCount(commentId);
        }
      },
    )
    // 5. LISTEN TO REAL-TIME NOTIFICATIONS (INSERT)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      async (payload) => {
        console.log("⚡ Real-time Notification Event received:", payload);
        const newNotif = payload.new;
        if (!newNotif) return;

        const isForMe = currentUser && (newNotif.recipient_id === currentUser.id || newNotif.recipient_id === "all");
        if (isForMe || !currentUser) {
          let actionLabel = "interacted with your post";
          if (newNotif.type === "like_post") actionLabel = "liked your post";
          else if (newNotif.type === "like_comment") actionLabel = "liked your comment";
          else if (newNotif.type === "comment_post") actionLabel = "commented on your post";
          else if (newNotif.type === "reply_comment") actionLabel = "replied to your comment";

          showRealtimeNotification(`🔔 ${escapeHtml(newNotif.actor_name || "Someone")} ${actionLabel}`);

          if (getCurrentModule() === "notifications") {
            await renderNotificationsPage();
          } else {
            updateNavNotifBadge();
          }
        }
      },
    )
    .subscribe((status) => {
      console.log("📡 Supabase Realtime Subscription Status:", status);
    });
}

// Helper: Real-time helper to sync post comment counts from DB
async function updatePostCommentCount(postId) {
  try {
    const { count, error } = await supabaseClient
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (!error && count !== null) {
      const commentCountEls = document.querySelectorAll(`[id="comment-count-${postId}"]`);
      const formattedText = formatCount(count, "comment", "comments");
      commentCountEls.forEach((el) => {
        el.innerText = formattedText;
      });
    }
  } catch (err) {
    console.error("Error updating realtime comment count:", err);
  }
}

// Helper: Real-time helper to sync post like counts from DB
async function updatePostLikeCount(postId) {
  try {
    const { count, error } = await supabaseClient
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (!error && count !== null) {
      const likeCountEls = document.querySelectorAll(`[id="like-count-${postId}"]`);
      const formattedText = formatCount(count, "reaction", "reactions");
      likeCountEls.forEach((el) => {
        el.innerText = formattedText;
      });
    }
  } catch (err) {
    console.error("Error updating realtime post like count:", err);
  }
}

// Helper: Real-time helper to sync comment like counts from DB
async function updateCommentLikeCount(commentId) {
  try {
    const { count, error } = await supabaseClient
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", commentId);

    if (!error && count !== null) {
      const likeBtns = document.querySelectorAll(`[data-commentid="${commentId}"].btn-comment-like`);
      likeBtns.forEach((btn) => {
        const isLiked = btn.classList.contains("liked");
        const countText = count > 0 ? ` ❤️ ${count}` : "";
        btn.innerHTML = isLiked ? `Liked${countText}` : `Like${countText}`;
      });
    }
  } catch (err) {
    console.error("Error updating realtime comment like count:", err);
  }
}

// Helper: Subtle toast banner notification when new content arrives
function showRealtimeNotification(msg) {
  let toast = document.getElementById("realtime-toast-banner");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "realtime-toast-banner";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0D0F14;
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: var(--font-body);
      font-size: 0.85rem;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 250;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block;"></span> <span>${escapeHtml(msg)}</span>`;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
  }, 3500);
}
