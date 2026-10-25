import { supabaseClient } from "../config/supabase.js";
import {
  generateInitialsAvatar,
  formatTimeAgo,
  escapeHtml,
  formatCount,
} from "../utils/helpers.js";
import { getLocalShares, isPostSaved, getPrivacySettings, registerUserPrivacySettings, extractAndRegisterPrivacy, isBlockedWithCurrentUser } from "../utils/storage.js";
import { getNetworkState } from "../pages/friends.js";
import { currentUser, currentProfile } from "./auth.js";

let currentModule = "home";
let campusPosts = [];

export function getCurrentModule() {
  return currentModule;
}
export function setCurrentModule(mod) {
  currentModule = mod;
}
export function getCampusPosts() {
  return campusPosts;
}

export async function fetchPostsFromSupabase(moduleId) {
  if (!supabaseClient) return [];
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

    if (moduleId !== "home") {
      query = query.eq("category", moduleId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let dbCommentLikes = [];
    try {
      const { data: likesData } = await supabaseClient
        .from("comment_likes")
        .select("comment_id, user_id");
      if (likesData) dbCommentLikes = likesData;
    } catch (e) {
      console.warn("Could not query comment_likes table:", e);
    }

    return data.map((dbPost) => {
      if (dbPost.profiles) {
        extractAndRegisterPrivacy(dbPost.profiles);
      }
      const authorName = dbPost.profiles ? dbPost.profiles.name : "Campus User";
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

      return {
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
              if (c.profiles) {
                extractAndRegisterPrivacy(c.profiles);
              }
              const likesForThisComment = dbCommentLikes.filter(
                (l) => String(l.comment_id) === String(c.id),
              );
              const isCommentLikedByMe = currentUser
                ? likesForThisComment.some((l) => l.user_id === currentUser.id)
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
    });
  } catch (err) {
    console.error("Error fetching posts from Supabase:", err);
    return [];
  }
}

export function renderPostCardHTML(post) {
  const localShares = getLocalShares();
  const sharesCount =
    localShares[post.id] !== undefined
      ? localShares[post.id]
      : post.sharesCount;
  const catDisplay =
    post.category === "home" || post.category === "general"
      ? "GENERAL"
      : post.category.toUpperCase();

  const isOwnPost =
    currentUser && post.authorId && post.authorId === currentUser.id;

  const authorPrivacy = getPrivacySettings(post.authorId);
  const likesDisabled = !authorPrivacy.allowPostLikes && !isOwnPost;
  const commentsDisabled = !authorPrivacy.allowPostComments && !isOwnPost;

  const saved = isPostSaved(post.id, currentUser ? currentUser.id : null);
  const saveActionText = saved ? "Unsave Post" : "Save Post";
  const saveActionIcon = saved ? "bookmark-check" : "bookmark";

  const popoverMenuHTML = isOwnPost
    ? `
      <button class="popover-btn" data-action="My Profile" data-author-id="${post.authorId || ""}">
          <i data-lucide="user"></i> <span>My Profile</span>
      </button>
      <button class="popover-btn" data-action="${saveActionText}" data-post-id="${post.id}">
          <i data-lucide="${saveActionIcon}"></i> <span>${saveActionText}</span>
      </button>
      <button class="popover-btn text-danger" data-action="Delete Post" data-post-id="${post.id}">
          <i data-lucide="trash-2"></i> <span>Delete Post</span>
      </button>
    `
    : `
      <button class="popover-btn" data-action="Add Friend" data-author="${escapeHtml(post.author)}">
          <i data-lucide="user-plus"></i> <span>Add Friend</span>
      </button>
      <button class="popover-btn" data-action="${saveActionText}" data-post-id="${post.id}">
          <i data-lucide="${saveActionIcon}"></i> <span>${saveActionText}</span>
      </button>
      <button class="popover-btn text-danger" data-action="Block User" data-author="${escapeHtml(post.author)}">
          <i data-lucide="shield-alert"></i> <span>Block User</span>
      </button>
      <button class="popover-btn text-danger" data-action="Report Post" data-author="${escapeHtml(post.author)}" data-author-id="${post.authorId || ""}" data-post-id="${post.id}">
          <i data-lucide="flag"></i> <span>Report Post</span>
      </button>
    `;

  // Detect whether attachment is video or image
  const isVideoMedia =
    post.image &&
    (post.image.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) ||
      post.image.includes("/video/upload/"));

  const mediaHTML = post.image
    ? isVideoMedia
      ? `<div class="post-media video-media">
           <video src="${post.image}" controls loading="lazy" playsinline></video>
           <button class="media-fullscreen-btn" data-video-src="${post.image}" aria-label="View video full screen" title="View video full screen">
             <i data-lucide="maximize-2"></i> <span>Full Screen</span>
           </button>
         </div>`
      : `<div class="post-media photo-media">
           <img src="${post.image}" alt="Attachment" loading="lazy">
           <button class="media-fullscreen-btn" data-img-src="${post.image}" aria-label="View photo full screen" title="View photo full screen">
             <i data-lucide="maximize-2"></i> <span>Full Screen</span>
           </button>
         </div>`
    : "";

  let activityHTML = "";
  let taggedHTML = "";
  let cleanText = post.text || "";

  // Parse [privacy:{...}] tag from post content if present
  if (cleanText && cleanText.includes("[privacy:")) {
    const privMatch = cleanText.match(/\[privacy:(.+?)\]\n?/);
    if (privMatch) {
      try {
        const parsedPriv = JSON.parse(privMatch[1]);
        if (post.authorId) {
          registerUserPrivacySettings(post.authorId, parsedPriv);
        }
      } catch (e) {}
      cleanText = cleanText.replace(privMatch[0], "");
    }
  }

  // Parse [tagged:id1|Name1,id2|Name2]
  let taggedFriends = [];
  if (cleanText && cleanText.includes("[tagged:")) {
    const tagMatch = cleanText.match(/\[tagged:(.+?)\]\n?/);
    if (tagMatch) {
      const rawTagged = tagMatch[1];
      cleanText = cleanText.replace(tagMatch[0], "");
      rawTagged.split(",").forEach((item) => {
        const parts = item.split("|");
        if (parts.length >= 2) {
          taggedFriends.push({ id: parts[0], name: parts[1] });
        } else if (parts[0]) {
          taggedFriends.push({ id: parts[0], name: parts[0] });
        }
      });
    }
  }

  // Parse [activity:...]
  if (cleanText && cleanText.includes("[activity:")) {
    const match = cleanText.match(/\[activity:(.+?)\]\n?/);
    if (match) {
      const actText = match[1];
      cleanText = cleanText.replace(match[0], "");
      activityHTML = ` <span class="post-activity-inline">${escapeHtml(actText)}</span>`;
    }
  }

  if (taggedFriends.length > 0) {
    let friendLinks = "";
    if (taggedFriends.length === 1) {
      const f = taggedFriends[0];
      friendLinks = `<span class="post-author-clickable tagged-friend-link" data-author-id="${f.id}" data-author-name="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>`;
    } else if (taggedFriends.length === 2) {
      const f1 = taggedFriends[0];
      const f2 = taggedFriends[1];
      friendLinks = `<span class="post-author-clickable tagged-friend-link" data-author-id="${f1.id}" data-author-name="${escapeHtml(f1.name)}">${escapeHtml(f1.name)}</span> and <span class="post-author-clickable tagged-friend-link" data-author-id="${f2.id}" data-author-name="${escapeHtml(f2.name)}">${escapeHtml(f2.name)}</span>`;
    } else if (taggedFriends.length === 3) {
      const f1 = taggedFriends[0];
      const f2 = taggedFriends[1];
      const f3 = taggedFriends[2];
      friendLinks = `<span class="post-author-clickable tagged-friend-link" data-author-id="${f1.id}" data-author-name="${escapeHtml(f1.name)}">${escapeHtml(f1.name)}</span>, <span class="post-author-clickable tagged-friend-link" data-author-id="${f2.id}" data-author-name="${escapeHtml(f2.name)}">${escapeHtml(f2.name)}</span> and <span class="post-author-clickable tagged-friend-link" data-author-id="${f3.id}" data-author-name="${escapeHtml(f3.name)}">${escapeHtml(f3.name)}</span>`;
    } else {
      const f1 = taggedFriends[0];
      const count = taggedFriends.length - 1;
      friendLinks = `<span class="post-author-clickable tagged-friend-link" data-author-id="${f1.id}" data-author-name="${escapeHtml(f1.name)}">${escapeHtml(f1.name)}</span> and ${count} others`;
    }
    taggedHTML = ` <span class="post-tagged-inline"><span class="tagged-label">with</span> ${friendLinks}</span>`;
  }

  // Store tagged friends on post object for notification lookups
  post.taggedFriends = taggedFriends;
  post.taggedFriendIds = taggedFriends.map((f) => f.id);

  // Filter out comments from blocked users
  const visibleComments = (post.comments || []).filter(
    (c) => !isBlockedWithCurrentUser(c.authorId, c.author)
  );

  return `
        <article class="post-card" id="post-${post.id}">
            <div class="post-header">
                <div class="post-author-wrapper">
                    <img src="${post.avatar}" alt="${escapeHtml(post.author)}" class="post-avatar post-avatar-clickable" data-author-id="${post.authorId || ""}" data-author-name="${escapeHtml(post.author)}">
                    <div class="post-meta">
                        <div class="post-title-line">
                            <span class="post-author post-author-clickable" data-author-id="${post.authorId || ""}" data-author-name="${escapeHtml(post.author)}">${escapeHtml(post.author)}</span>${activityHTML}${taggedHTML}
                        </div>
                        <p class="post-time">${post.time} • <span class="post-cat-tag">${catDisplay}</span></p>
                    </div>
                </div>
                
                <div class="post-menu-container">
                    <button class="btn-more" aria-label="More Options">
                        <i data-lucide="more-horizontal"></i>
                    </button>
                    <div class="post-popover-menu" id="popover-${post.id}">
                        <div class="popover-author-header">
                            <img src="${post.avatar}" class="popover-avatar post-avatar-clickable" alt="${escapeHtml(post.author)}" data-author-id="${post.authorId || ""}" data-author-name="${escapeHtml(post.author)}">
                            <div class="popover-author-info">
                                <p class="popover-author-name post-author-clickable" data-author-id="${post.authorId || ""}" data-author-name="${escapeHtml(post.author)}">${escapeHtml(post.author)}</p>
                                <span class="popover-author-badge">${escapeHtml(post.badge)}</span>
                            </div>
                        </div>
                        <div class="popover-actions">
                            ${popoverMenuHTML}
                        </div>
                    </div>
                </div>
            </div>

            <div class="post-body">
                ${cleanText.trim() ? `<p class="post-text">${escapeHtml(cleanText).replace(/\n/g, "<br>")}</p>` : ""}
                ${mediaHTML}
            </div>

            <div class="post-stats">
                <div class="reactions-count">
                    <span class="reaction-icon">❤️</span>
                    <span class="stats-num" id="like-count-${post.id}">${formatCount(post.likes, "reaction", "reactions")}</span>
                </div>
                <div class="comments-shares-count">
                    <span id="comment-count-${post.id}">${formatCount(visibleComments.length, "comment", "comments")}</span>
                    <span>•</span>
                    <span id="share-count-${post.id}">${formatCount(sharesCount, "share", "shares")}</span>
                </div>
            </div>

            <div class="post-actions">
                ${
                  likesDisabled
                    ? `<button class="action-btn disabled" disabled title="Likes disabled by post author" id="like-btn-${post.id}">
                        <i data-lucide="heart-off"></i>
                        <span id="like-text-${post.id}">Likes Off</span>
                      </button>`
                    : `<button class="action-btn ${post.liked ? "liked" : ""}" id="like-btn-${post.id}" data-postid="${post.id}">
                        <i data-lucide="heart" class="${post.liked ? "heart-active" : ""}"></i>
                        <span id="like-text-${post.id}">${post.liked ? "Liked" : "Like"}</span>
                      </button>`
                }
                <button class="action-btn" data-toggle-comment="${post.id}">
                    <i data-lucide="message-square"></i>
                    <span>Comment</span>
                </button>
                <button class="action-btn" data-shareid="${post.id}">
                    <i data-lucide="share-2"></i>
                    <span>Share</span>
                </button>
            </div>

            <div class="post-comments-box" id="comments-${post.id}">
                <div class="post-comments-inner">
                    <div class="comments-list" id="comments-list-${post.id}">
                        ${visibleComments
                          .map((c) => {
                            let commentCleanText = c.text || "";
                            if (commentCleanText && commentCleanText.includes("[privacy:")) {
                              const cPrivMatch = commentCleanText.match(/\[privacy:(.+?)\]\n?/);
                              if (cPrivMatch) {
                                try {
                                  const parsedCPriv = JSON.parse(cPrivMatch[1]);
                                  if (c.authorId) {
                                    registerUserPrivacySettings(c.authorId, parsedCPriv);
                                  }
                                } catch (e) {}
                                commentCleanText = commentCleanText.replace(cPrivMatch[0], "");
                              }
                            }

                            const canDeleteComment =
                              currentUser &&
                              (c.authorId === currentUser.id ||
                                post.authorId === currentUser.id);

                            const cPrivacy = getPrivacySettings(c.authorId);
                            const cLikesDisabled = !cPrivacy.allowCommentLikes && (!currentUser || currentUser.id !== c.authorId);
                            const cRepliesDisabled = !cPrivacy.allowCommentReplies && (!currentUser || currentUser.id !== c.authorId);

                            return `
                            <div class="comment-item" id="comment-${post.id}-${c.id}">
                                <div class="comment-content">
                                    <a href="#" class="comment-author-link" data-author-id="${c.authorId || ""}" data-author-name="${escapeHtml(c.author)}">${escapeHtml(c.author)}</a>
                                    <span class="comment-text">${escapeHtml(commentCleanText)}</span>
                                </div>
                                <div class="comment-actions-row">
                                    ${
                                      cLikesDisabled
                                        ? `<span class="btn-comment-action disabled" style="opacity:0.6; cursor:default;">Likes Off</span>`
                                        : `<button class="btn-comment-action btn-comment-like ${c.liked ? "liked" : ""}" id="comment-like-btn-${post.id}-${c.id}" data-postid="${post.id}" data-commentid="${c.id}">
                                            ${c.liked ? "Liked" : "Like"}${c.likes > 0 ? ` ❤️ ${c.likes}` : ""}
                                          </button>`
                                    }
                                    <span>•</span>
                                    ${
                                      cRepliesDisabled
                                        ? `<span class="btn-comment-action disabled" style="opacity:0.6; cursor:default;">Replies Off</span>`
                                        : `<button class="btn-comment-action btn-comment-reply" data-reply-author="${escapeHtml(c.author)}" data-comment-author-id="${c.authorId || ""}" data-postid="${post.id}">
                                            Reply
                                          </button>`
                                    }
                                    ${
                                      canDeleteComment
                                        ? `
                                        <span>•</span>
                                        <button class="btn-comment-action btn-comment-delete text-danger" data-postid="${post.id}" data-commentid="${c.id}">
                                            Delete
                                        </button>
                                    `
                                        : `
                                        <span>•</span>
                                        <button class="btn-comment-action btn-comment-report text-danger" data-commentid="${c.id}" data-author="${escapeHtml(c.author)}">
                                            Report
                                        </button>
                                    `
                                    }
                                </div>
                            </div>
                        `;
                          })
                          .join("")}
                    </div>

                    ${
                      commentsDisabled
                        ? `<div class="comments-disabled-banner"><i data-lucide="message-square-off"></i> <span>Comments disabled by post author.</span></div>`
                        : `<div class="add-comment-row">
                            <input type="text" placeholder="Write a comment..." id="comment-input-${post.id}" data-postid="${post.id}" aria-label="Write a comment">
                            <button data-submit-comment="${post.id}" aria-label="Submit comment"><i data-lucide="send"></i></button>
                          </div>`
                    }
                </div>
            </div>
        </article>
    `;
}

function isPostVisibleToViewer(post, netState) {
  if (!post) return false;
  const authorId = post.authorId || (post.profiles && post.profiles.id);
  const authorName = post.author;

  if (isBlockedWithCurrentUser(authorId, authorName)) {
    return false;
  }

  const privacy = getPrivacySettings(authorId);
  if (privacy.activityVisibility === "friends") {
    if (currentUser && authorId && authorId === currentUser.id) return true;
    if (typeof currentProfile !== "undefined" && currentProfile && ((currentProfile.id && currentProfile.id === authorId) || (currentProfile.name && currentProfile.name === post.author))) return true;

    if (netState && netState.friends) {
      const isFriend = netState.friends.some((f) => {
        if (typeof f === "string") {
          return f === authorId || f === post.author;
        }
        return (f.id && f.id === authorId) || (f.name && f.name === post.author);
      });
      if (isFriend) return true;
    }
    return false;
  }
  return true;
}

export async function renderFeed(moduleId) {
  const postsFeed = document.getElementById("posts-feed");
  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");

  if (!postsFeed) return;

  campusPosts = await fetchPostsFromSupabase(moduleId);

  // Filter posts based on Rule 7: activityVisibility
  const netState = getNetworkState();
  const visiblePosts = campusPosts.filter((post) => isPostVisibleToViewer(post, netState));

  if (feedTitle) {
    feedTitle.innerText =
      moduleId === "home"
        ? "Campus Feed Updates"
        : `${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)} Feed Posts`;
  }
  if (feedFilterTag) {
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> ${
      moduleId === "home" ? "All Campus" : `${moduleId.toUpperCase()} TOPIC`
    }`;
  }

  if (visiblePosts.length === 0) {
    postsFeed.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="message-square-off"></i>
                <p>No posts in this category yet. Be the first to share an update!</p>
            </div>
        `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  postsFeed.innerHTML = visiblePosts
    .map((post) => renderPostCardHTML(post))
    .join("");
  if (window.lucide) window.lucide.createIcons();
}
