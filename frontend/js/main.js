let currentPage = 1;
let debounceTimer = null;

function postCardHtml(post) {
  const statusBadge =
    post.status === "draft" ? '<span class="badge">Draft</span>' : "";
  const tags = post.tags
    .map((t) => `<span class="tag">#${t.name}</span>`)
    .join("");
  return `
    <a href="post.html?slug=${encodeURIComponent(post.slug)}" style="text-decoration:none;color:inherit">
      <div class="card post-card">
        <img src="${coverImageUrl(post.cover_image)}" alt="" />
        <div class="post-body">
          <h2>${post.title} ${statusBadge}</h2>
          <p>${post.summary || ""}</p>
          <div class="muted">
            By ${post.author.full_name} · ${formatDate(post.created_at)}
            ${post.category ? " · " + post.category.name : ""} · ${post.views} views
          </div>
          <div class="tags">${tags}</div>
        </div>
      </div>
    </a>
  `;
}

async function loadFilters() {
  const [categories, tags] = await Promise.all([
    apiRequest("/categories"),
    apiRequest("/tags"),
  ]);
  const categorySelect = document.getElementById("category-select");
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.slug;
    opt.textContent = c.name;
    categorySelect.appendChild(opt);
  });
  const tagSelect = document.getElementById("tag-select");
  tags.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.slug;
    opt.textContent = `#${t.name}`;
    tagSelect.appendChild(opt);
  });
}

async function loadPosts() {
  const listEl = document.getElementById("posts-list");
  const paginationEl = document.getElementById("pagination");
  const search = document.getElementById("search-input").value.trim();
  const category = document.getElementById("category-select").value;
  const tag = document.getElementById("tag-select").value;

  const params = new URLSearchParams({ page: currentPage, page_size: 6 });
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);

  listEl.innerHTML = '<p class="muted">Loading...</p>';
  try {
    const result = await apiRequest(`/posts?${params.toString()}`, { auth: true });
    if (result.items.length === 0) {
      listEl.innerHTML = '<p class="muted">No posts found.</p>';
    } else {
      listEl.innerHTML = result.items.map(postCardHtml).join("");
    }
    renderPagination(result, paginationEl);
  } catch (err) {
    listEl.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
}

function renderPagination(result, el) {
  if (result.pages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 1; i <= result.pages; i++) {
    html += `<button class="btn ${i === result.page ? "" : "secondary"}" data-page="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = Number(btn.dataset.page);
      loadPosts();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadFilters();
  loadPosts();

  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 1;
      loadPosts();
    }, 350);
  });
  document.getElementById("category-select").addEventListener("change", () => {
    currentPage = 1;
    loadPosts();
  });
  document.getElementById("tag-select").addEventListener("change", () => {
    currentPage = 1;
    loadPosts();
  });
});
