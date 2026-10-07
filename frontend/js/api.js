const API_BASE = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  clearToken();
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

async function apiRequest(path, { method = "GET", body = null, auth = false, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && data.detail ? data.detail : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function coverImageUrl(path) {
  if (!path) return "https://placehold.co/600x360?text=No+Image";
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
