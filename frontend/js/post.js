function getSlugFromQuery() {
  return new URLSearchParams(window.location.search).get("slug");
}

function commentHtml(comment, currentUser) {
  const canDelete =
    currentUser && (currentUser.id === comment.author.id || currentUser.role === "admin");
  return `
    <div class="comment" data-id="${comment.id}">
      <div class="comment-header">
        <span><strong>${comment.author.full_name}</strong> · ${formatDate(comment.created_at)}</span>
        ${canDelete ? '<button class="btn danger delete-comment-btn" style="padding:4px 10px;font-size:0.8rem">Delete</button>' : ""}
      </div>
      <p>${comment.content}</p>
    </div>
  `;
}

async function loadComments(postId, currentUser) {
  const comments = await apiRequest(`/posts/${postId}/comments`);
  const listEl = document.getElementById("comments-list");
  listEl.innerHTML = comments.length
    ? comments.map((c) => commentHtml(c, currentUser)).join("")
    : '<p class="muted">No comments yet.</p>';

  listEl.querySelectorAll(".delete-comment-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const commentEl = e.target.closest(".comment");
      try {
        await apiRequest(`/comments/${commentEl.dataset.id}`, { method: "DELETE", auth: true });
        loadComments(postId, currentUser);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function render() {
  const slug = getSlugFromQuery();
  const container = document.getElementById("post-container");
  if (!slug) {
    container.innerHTML = '<p class="error-box">No post specified.</p>';
    return;
  }

  const currentUser = await loadMe();
  renderNavAuthSlot(currentUser);

  try {
    const post = await apiRequest(`/posts/${encodeURIComponent(slug)}`, { auth: true });
    const tags = post.tags.map((t) => `<span class="tag">#${t.name}</span>`).join("");
    const statusBadge = post.status === "draft" ? '<span class="badge">Draft</span>' : "";

    container.innerHTML = `
      <a href="index.html" class="muted">&larr; Back to posts</a>
      <img class="post-cover" src="${coverImageUrl(post.cover_image)}" alt="" />
      <h1>${post.title} ${statusBadge}</h1>
      <div class="muted">
        By ${post.author.full_name} · ${formatDate(post.created_at)}
        ${post.category ? " · " + post.category.name : ""} · ${post.views} views
      </div>
      <div class="tags">${tags}</div>
      <div class="post-content">${post.content}</div>

      <h2>Comments</h2>
      <div id="comments-list"></div>
      <div id="comment-form-slot"></div>
    `;

    await loadComments(post.id, currentUser);

    const formSlot = document.getElementById("comment-form-slot");
    if (currentUser) {
      formSlot.innerHTML = `
        <form id="comment-form" class="card" style="margin-top:16px">
          <div class="form-group">
            <label for="comment-content">Add a comment</label>
            <textarea id="comment-content" rows="3" required></textarea>
          </div>
          <button class="btn" type="submit">Post comment</button>
        </form>
      `;
      document.getElementById("comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = document.getElementById("comment-content").value.trim();
        if (!content) return;
        try {
          await apiRequest(`/posts/${post.id}/comments`, {
            method: "POST",
            body: { content },
            auth: true,
          });
          document.getElementById("comment-content").value = "";
          loadComments(post.id, currentUser);
        } catch (err) {
          alert(err.message);
        }
      });
    } else {
      formSlot.innerHTML = `<p class="muted"><a href="login.html">Login</a> to leave a comment.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", render);
