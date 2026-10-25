import { supabaseClient } from "../config/supabase.js";
import { escapeHtml, formatCount, showToast } from "../utils/helpers.js";
import { requireAuth, currentUser, currentProfile } from "./auth.js";
import { getCampusPosts } from "./feed.js";
import { addNotification } from "../pages/notifications.js";
import { getPrivacySettings } from "../utils/storage.js";

export async function toggleCommentLike(postId, commentId) {
  if (!requireAuth("like comments")) return;

  const campusPosts = getCampusPosts();
  const matchingPosts = campusPosts.filter((p) => p.id == postId);
  const post = matchingPosts.length > 0 ? matchingPosts[0] : null;

  let comment = post ? post.comments.find((c) => c.id == commentId) : null;

  if (comment && comment.authorId && currentUser && comment.authorId !== currentUser.id) {
    const cPrivacy = getPrivacySettings(comment.authorId);
    if (!cPrivacy.allowCommentLikes) {
      showToast("The comment author has disabled likes on their comments.", "info");
      return;
    }
  }

  const likeBtns = document.querySelectorAll(
    `[id="comment-like-btn-${postId}-${commentId}"]`,
  );

  let newLiked = false;
  let newLikesCount = 0;

  if (comment) {
    comment.liked = !comment.liked;
    comment.likes += comment.liked ? 1 : -1;
    newLiked = comment.liked;
    newLikesCount = comment.likes;

    const countText = comment.likes > 0 ? ` ❤️ ${comment.likes}` : "";
    const innerHTML = comment.liked ? `Liked${countText}` : `Like${countText}`;

    likeBtns.forEach((btn) => {
      btn.classList.toggle("liked", comment.liked);
      btn.innerHTML = innerHTML;
    });

    if (newLiked) {
      addNotification({
        recipientId: comment.authorId || comment.author,
        actorId: currentUser ? currentUser.id : "",
        actorName: currentProfile ? currentProfile.name : "Campus User",
        type: "like_comment",
        postId: postId,
        commentId: commentId,
        postSnippet: comment.text ? comment.text.substring(0, 70) : "your comment",
      });
    }
  } else if (likeBtns.length > 0) {
    const isLiked = likeBtns[0].classList.contains("liked");
    newLiked = !isLiked;
    newLikesCount = newLiked ? 1 : 0;
    const countText = newLikesCount > 0 ? ` ❤️ ${newLikesCount}` : "";

    likeBtns.forEach((btn) => {
      btn.classList.toggle("liked", newLiked);
      btn.innerHTML = newLiked ? `Liked${countText}` : "Like";
    });
  }

  // Save / Delete comment like in Supabase Database
  if (
    supabaseClient &&
    currentUser &&
    commentId &&
    !String(commentId).startsWith("comment_")
  ) {
    try {
      const queryId =
        !isNaN(commentId) &&
        typeof commentId === "string" &&
        commentId.trim() !== ""
          ? Number(commentId)
          : commentId;

      if (newLiked) {
        await supabaseClient
          .from("comment_likes")
          .insert([{ user_id: currentUser.id, comment_id: queryId }]);
      } else {
        await supabaseClient
          .from("comment_likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("comment_id", queryId);
      }
    } catch (err) {
      console.error("Supabase comment_likes error:", err);
    }
  }
}

export function replyToComment(postId, authorName, commentAuthorId = null) {
  if (!requireAuth("reply to comments")) return;

  if (commentAuthorId && currentUser && commentAuthorId !== currentUser.id) {
    const cPrivacy = getPrivacySettings(commentAuthorId);
    if (!cPrivacy.allowCommentReplies) {
      showToast("Replies are disabled by this comment's author.", "info");
      return;
    }
  }

  const input = document.getElementById(`comment-input-${postId}`);
  if (input) {
    input.value = `@${authorName} `;
    input.focus();
  }
}

export function toggleCommentsSection(postId) {
  const commentsBoxes = document.querySelectorAll(`[id="comments-${postId}"]`);
  commentsBoxes.forEach((box) => box.classList.toggle("active"));
}

export function handleCommentSubmit(e, postId) {
  if (e.key === "Enter") addComment(postId);
}

export async function addComment(postId) {
  if (!requireAuth("post comments")) return;

  const campusPosts = getCampusPosts();
  const matchingPosts = campusPosts.filter((p) => p.id == postId);
  const post = matchingPosts.length > 0 ? matchingPosts[0] : null;

  if (post && post.authorId && currentUser && post.authorId !== currentUser.id) {
    const authorPrivacy = getPrivacySettings(post.authorId);
    if (!authorPrivacy.allowPostComments) {
      showToast("Comments are disabled on this post by the author.", "info");
      return;
    }
  }

  const inputs = document.querySelectorAll(`[id="comment-input-${postId}"]`);
  let commentText = "";
  inputs.forEach((inp) => {
    if (inp.value.trim()) {
      commentText = inp.value.trim();
    }
  });

  if (!commentText) return;

  const commentAuthor = currentProfile ? currentProfile.name : "Campus User";
  const authorId = currentUser ? currentUser.id : "";
  const tempCommentId = `comment_${Date.now()}`;

  const commentObj = {
    id: tempCommentId,
    author: commentAuthor,
    authorId: authorId,
    text: commentText,
    likes: 0,
    liked: false,
  };

  matchingPosts.forEach((p) => {
    if (p.comments) p.comments.push(commentObj);
  });

  addNotification({
    recipientId: post ? (post.authorId || post.author) : "all",
    actorId: authorId,
    actorName: commentAuthor,
    type: commentText.startsWith("@") ? "reply_comment" : "comment_post",
    postId: postId,
    commentId: tempCommentId,
    postSnippet: commentText.substring(0, 70),
  });

  // Also notify tagged friends on this post
  if (post && post.text) {
    let taggedFriends = post.taggedFriends || [];
    if (!taggedFriends.length && post.text.includes("[tagged:")) {
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
      const isActor = (tf.id && (tf.id === authorId || tf.id === currentUser?.id || tf.id === currentProfile?.id)) ||
                      (tf.name && (tf.name === commentAuthor || tf.name === currentProfile?.name));

      if (!isPostAuthor && !isActor) {
        addNotification({
          recipientId: tf.id || tf.name,
          actorId: authorId,
          actorName: commentAuthor,
          type: "comment_post",
          postId: postId,
          commentId: tempCommentId,
          postSnippet: commentText.substring(0, 70),
        });
      }
    });
  }

  inputs.forEach((inp) => (inp.value = ""));

  const commentsLists = document.querySelectorAll(
    `[id="comments-list-${postId}"]`,
  );
  commentsLists.forEach((list) => {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.id = `comment-${postId}-${commentObj.id}`;
    div.innerHTML = `
            <div class="comment-content">
                <a href="#" class="comment-author-link" data-author-id="${authorId}" data-author-name="${escapeHtml(commentObj.author)}">${escapeHtml(commentObj.author)}</a>
                <span class="comment-text">${escapeHtml(commentObj.text)}</span>
            </div>
            <div class="comment-actions-row">
                <button class="btn-comment-action btn-comment-like" id="comment-like-btn-${postId}-${commentObj.id}" data-postid="${postId}" data-commentid="${commentObj.id}">
                    Like
                </button>
                <span>•</span>
                <button class="btn-comment-action btn-comment-reply" data-reply-author="${escapeHtml(commentObj.author)}" data-postid="${postId}">
                    Reply
                </button>
                <span>•</span>
                <button class="btn-comment-action btn-comment-delete text-danger" data-postid="${postId}" data-commentid="${commentObj.id}">
                    Delete
                </button>
            </div>
        `;
    list.appendChild(div);
  });

  const commentCountEls = document.querySelectorAll(
    `[id="comment-count-${postId}"]`,
  );
  const totalCount = post
    ? post.comments.length
    : commentsLists.length > 0
      ? commentsLists[0].children.length
      : 0;
  const formattedCommentText = formatCount(totalCount, "comment", "comments");
  commentCountEls.forEach((el) => {
    el.innerText = formattedCommentText;
  });

  const commentsBoxes = document.querySelectorAll(`[id="comments-${postId}"]`);
  commentsBoxes.forEach((box) => {
    if (!box.classList.contains("active")) {
      box.classList.add("active");
    }
  });

  const isDbPost = post
    ? post.isDbPost
    : typeof postId === "string" && !postId.startsWith("post_");

  if (isDbPost && supabaseClient && currentUser) {
    try {
      const { data, error } = await supabaseClient
        .from("comments")
        .insert([
          {
            post_id: postId,
            author_id: currentUser.id,
            content: commentText,
          },
        ])
        .select();

      if (data && data.length > 0) {
        const realCommentId = data[0].id;
        commentObj.id = realCommentId;

        const createdDivs = document.querySelectorAll(
          `[id="comment-${postId}-${tempCommentId}"]`,
        );
        createdDivs.forEach(
          (d) => (d.id = `comment-${postId}-${realCommentId}`),
        );

        const createdLikeBtns = document.querySelectorAll(
          `[id="comment-like-btn-${postId}-${tempCommentId}"]`,
        );
        createdLikeBtns.forEach((b) => {
          b.id = `comment-like-btn-${postId}-${realCommentId}`;
          b.dataset.commentid = realCommentId;
        });

        const createdDeleteBtns = document.querySelectorAll(
          `.btn-comment-delete[data-commentid="${tempCommentId}"]`,
        );
        createdDeleteBtns.forEach((b) => (b.dataset.commentid = realCommentId));
      }
    } catch (err) {
      console.error("Error inserting comment to Supabase:", err);
    }
  }
}

export async function deleteComment(postId, commentId) {
  if (!requireAuth("delete comments")) return;

  if (!confirm("Are you sure you want to delete this comment?")) return;

  const campusPosts = getCampusPosts();
  const matchingPosts = campusPosts.filter((p) => p.id == postId);

  // If it's a persistent DB comment, perform Supabase delete with .select() verification
  if (
    supabaseClient &&
    commentId &&
    !String(commentId).startsWith("comment_")
  ) {
    try {
      let targetId = commentId;
      if (
        !isNaN(commentId) &&
        typeof commentId === "string" &&
        commentId.trim() !== ""
      ) {
        targetId = Number(commentId);
      }

      let { data, error } = await supabaseClient
        .from("comments")
        .delete()
        .eq("id", targetId)
        .select();

      // Try string format if numeric query returned 0 rows
      if ((!data || data.length === 0) && typeof targetId === "number") {
        const retry = await supabaseClient
          .from("comments")
          .delete()
          .eq("id", String(commentId))
          .select();

        if (retry.data && retry.data.length > 0) {
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        console.error("Supabase comment delete error:", error);
        alert("Failed to delete comment from database: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.warn("Database deletion returned 0 affected rows.");
        alert("Permission denied or comment not found in database.");
        return;
      }
    } catch (err) {
      console.error("Error deleting comment from Supabase:", err);
      alert("Error deleting comment: " + err.message);
      return;
    }
  }

  // Remove comment from memory state
  matchingPosts.forEach((p) => {
    if (p.comments) {
      p.comments = p.comments.filter((c) => c.id != commentId);
    }
  });

  // Remove comment elements from DOM
  const commentEls = document.querySelectorAll(
    `[id="comment-${postId}-${commentId}"]`,
  );
  commentEls.forEach((el) => {
    el.style.transition = "all 0.25s ease";
    el.style.opacity = "0";
    el.style.transform = "scale(0.95)";
    setTimeout(() => el.remove(), 250);
  });

  // Update total comment counter
  setTimeout(() => {
    const post = matchingPosts.length > 0 ? matchingPosts[0] : null;
    const commentsLists = document.querySelectorAll(
      `[id="comments-list-${postId}"]`,
    );
    const totalCount = post
      ? post.comments.length
      : commentsLists.length > 0
        ? commentsLists[0].children.length
        : 0;
    const formattedCommentText = formatCount(totalCount, "comment", "comments");

    const commentCountEls = document.querySelectorAll(
      `[id="comment-count-${postId}"]`,
    );
    commentCountEls.forEach((el) => {
      el.innerText = formattedCommentText;
    });
  }, 260);
}
