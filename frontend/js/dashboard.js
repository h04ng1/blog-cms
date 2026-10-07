let currentUser = null;
let categoriesCache = [];

function switchTab(tabName) {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.getElementById("tab-posts").style.display = tabName === "posts" ? "" : "none";
  document.getElementById("tab-editor").style.display = tabName === "editor" ? "" : "none";
  document.getElementById("tab-categories").style.display = tabName === "categories" ? "" : "none";
}

function resetForm() {
  document.getElementById("post-form").reset();
  document.getElementById("post-id").value = "";
  document.getElementById("editor-title").textContent = "New post";
  document.getElementById("cover-image-group").style.display = "none";
}

async function loadCategoriesIntoSelect() {
  categoriesCache = await apiRequest("/categories");
  const select = document.getElementById("category_id");
  select.innerHTML = '<option value="">None</option>';
  categoriesCache.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function renderCategoriesTable() {
  const tbody = document.getElementById("categories-tbody");
  tbody.innerHTML = categoriesCache
    .map(
      (c) => `
      <tr data-id="${c.id}">
        <td>${c.name}</td>
        <td>${c.slug}</td>
        <td><button class="btn danger delete-category-btn" style="padding:4px 10px;font-size:0.8rem">Delete</button></td>
      </tr>`
    )
    .join("");
  tbody.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      if (!confirm("Delete this category?")) return;
      try {
        await apiRequest(`/categories/${id}`, { method: "DELETE", auth: true });
        await loadCategoriesIntoSelect();
        renderCategoriesTable();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function postRowHtml(post) {
  return `
    <tr data-id="${post.id}" data-slug="${post.slug}">
      <td><a href="post.html?slug=${post.slug}">${post.title}</a></td>
      <td>${post.status}</td>
      <td>${post.category ? post.category.name : "-"}</td>
      <td>${post.views}</td>
      <td>${formatDate(post.created_at)}</td>
      <td class="row">
        <button class="btn secondary edit-post-btn" style="padding:4px 10px;font-size:0.8rem">Edit</button>
        <button class="btn danger delete-post-btn" style="padding:4px 10px;font-size:0.8rem">Delete</button>
      </td>
    </tr>
  `;
}

async function loadPostsTable() {
  const slot = document.getElementById("posts-table-slot");
  const params = new URLSearchParams({ page_size: 50 });
  if (currentUser.role !== "admin") params.set("author_id", currentUser.id);

  try {
    const result = await apiRequest(`/posts?${params.toString()}`, { auth: true });
    if (result.items.length === 0) {
      slot.innerHTML = '<p class="muted">No posts yet. Create your first one!</p>';
      return;
    }
    slot.innerHTML = `
      <table>
        <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Views</th><th>Created</th><th></th></tr></thead>
        <tbody>${result.items.map(postRowHtml).join("")}</tbody>
      </table>
    `;
    slot.querySelectorAll(".edit-post-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.target.closest("tr");
        editPost(Number(row.dataset.id));
      });
    });
    slot.querySelectorAll(".delete-post-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest("tr");
        if (!confirm("Delete this post?")) return;
        try {
          await apiRequest(`/posts/${row.dataset.id}`, { method: "DELETE", auth: true });
          loadPostsTable();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    slot.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}

async function editPost(postId) {
  const params = new URLSearchParams({ page_size: 50 });
  if (currentUser.role !== "admin") params.set("author_id", currentUser.id);
  const result = await apiRequest(`/posts?${params.toString()}`, { auth: true });
  const post = result.items.find((p) => p.id === postId);
  if (!post) return;

  document.getElementById("post-id").value = post.id;
  document.getElementById("title").value = post.title;
  document.getElementById("summary").value = post.summary;
  document.getElementById("category_id").value = post.category ? post.category.id : "";
  document.getElementById("status").value = post.status;
  document.getElementById("tags").value = post.tags.map((t) => t.name).join(", ");
  document.getElementById("editor-title").textContent = "Edit post";
  document.getElementById("cover-image-group").style.display = "";

  const full = await apiRequest(`/posts/${post.slug}`, { auth: true });
  document.getElementById("content").value = full.content;

  switchTab("editor");
}

function parseTags(value) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function handlePostSubmit(e) {
  e.preventDefault();
  const errorSlot = document.getElementById("editor-error-slot");
  errorSlot.innerHTML = "";

  const postId = document.getElementById("post-id").value;
  const payload = {
    title: document.getElementById("title").value,
    summary: document.getElementById("summary").value,
    content: document.getElementById("content").value,
    status: document.getElementById("status").value,
    category_id: document.getElementById("category_id").value
      ? Number(document.getElementById("category_id").value)
      : null,
    tag_names: parseTags(document.getElementById("tags").value),
  };

  try {
    let post;
    if (postId) {
      post = await apiRequest(`/posts/${postId}`, { method: "PUT", body: payload, auth: true });
    } else {
      post = await apiRequest("/posts", { method: "POST", body: payload, auth: true });
    }

    const fileInput = document.getElementById("cover-image");
    if (fileInput.files && fileInput.files[0]) {
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      await apiRequest(`/posts/${post.id}/cover-image`, {
        method: "POST",
        body: formData,
        auth: true,
        isForm: true,
      });
    }

    resetForm();
    switchTab("posts");
    loadPostsTable();
  } catch (err) {
    errorSlot.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}

async function init() {
  currentUser = await loadMe();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }
  renderNavAuthSlot(currentUser);

  if (currentUser.role === "admin") {
    document.getElementById("categories-tab-btn").style.display = "";
  }

  await loadCategoriesIntoSelect();
  if (currentUser.role === "admin") renderCategoriesTable();
  await loadPostsTable();

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  document.getElementById("post-form").addEventListener("submit", handlePostSubmit);
  document.getElementById("cancel-edit-btn").addEventListener("click", () => {
    resetForm();
    switchTab("posts");
  });
  document.getElementById("category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("new-category-name");
    if (!input.value.trim()) return;
    try {
      await apiRequest("/categories", {
        method: "POST",
        body: { name: input.value.trim() },
        auth: true,
      });
      input.value = "";
      await loadCategoriesIntoSelect();
      renderCategoriesTable();
    } catch (err) {
      alert(err.message);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
