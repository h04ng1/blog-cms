async function loadMe() {
  if (!isLoggedIn()) return null;
  try {
    const user = await apiRequest("/users/me", { auth: true });
    setCurrentUser(user);
    return user;
  } catch {
    clearToken();
    return null;
  }
}

function renderNavAuthSlot(user) {
  const slot = document.getElementById("nav-auth-slot");
  if (!slot) return;
  if (user) {
    slot.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <span class="muted">${user.full_name}</span>
      <button class="btn secondary" id="logout-btn">Logout</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", logout);
  } else {
    slot.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html" class="btn">Sign up</a>
    `;
  }
}

async function initNav() {
  const user = await loadMe();
  renderNavAuthSlot(user);
}

document.addEventListener("DOMContentLoaded", initNav);
