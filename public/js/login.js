const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

const showLoginBtn = document.getElementById("showLoginBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");

const loginTogglePassword = document.getElementById("loginTogglePassword");
const registerTogglePassword = document.getElementById("registerTogglePassword");

const loginPassword = document.getElementById("loginPassword");
const registerPassword = document.getElementById("registerPassword");

function showMessage(text, isError = true) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? "#dc2626" : "#15803d";
}

function showLoginTab() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  showLoginBtn.classList.add("active");
  showRegisterBtn.classList.remove("active");
  showMessage("");
}

function showRegisterTab() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  showRegisterBtn.classList.add("active");
  showLoginBtn.classList.remove("active");
  showMessage("");
}

function togglePassword(input, button) {
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
  } else {
    input.type = "password";
    button.textContent = "Show";
  }
}

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (res.status === 401) {
      console.log("User not logged in yet.");
      return;
    }

    if (!res.ok) {
      console.log("Unable to check login status.");
      return;
    }

    const data = await res.json();

    if (data.user) {
      window.location.href = "/home";
    }
  } catch (error) {
    console.log("checkAlreadyLoggedIn error:", error);
  }
}

showLoginBtn.addEventListener("click", showLoginTab);
showRegisterBtn.addEventListener("click", showRegisterTab);

loginTogglePassword.addEventListener("click", () => {
  togglePassword(loginPassword, loginTogglePassword);
});

registerTogglePassword.addEventListener("click", () => {
  togglePassword(registerPassword, registerTogglePassword);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("loginUserId").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!userId || !password) {
    showMessage("Please enter User ID and password.");
    return;
  }

  showMessage("Logging in...", false);

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Login failed.");
      return;
    }

    showMessage("Login successful. Redirecting...", false);

    setTimeout(() => {
      window.location.href = "/home";
    }, 700);
  } catch (error) {
    console.error("Login error:", error);
    showMessage("Server error. Please try again.");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("registerUserId").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!userId || !password) {
    showMessage("Please enter User ID and password.");
    return;
  }

  if (userId.length < 3) {
    showMessage("User ID must be at least 3 characters.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  showMessage("Creating account...", false);

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Registration failed.");
      return;
    }

    showMessage("Account created successfully. Redirecting...", false);

    setTimeout(() => {
      window.location.href = "/home";
    }, 800);
  } catch (error) {
    console.error("Register error:", error);
    showMessage("Server error. Please try again.");
  }
});

// Check if user already logged in
checkAlreadyLoggedIn();

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
      console.log("✅ Service worker registered");
    } catch (error) {
      console.log("Service worker registration failed:", error);
    }
  });
}