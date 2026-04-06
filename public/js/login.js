const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

const showLoginBtn = document.getElementById("showLoginBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");

const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");

const loginUserId = document.getElementById("loginUserId");
const loginPassword = document.getElementById("loginPassword");

const registerUserId = document.getElementById("registerUserId");
const registerPassword = document.getElementById("registerPassword");

const loginTogglePassword = document.getElementById("loginTogglePassword");
const registerTogglePassword = document.getElementById("registerTogglePassword");

function setAuthMessage(text, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = text;
  authMessage.style.color = isError ? "#f87171" : "";
}

function showLoginSection() {
  if (loginSection) loginSection.classList.remove("hidden");
  if (registerSection) registerSection.classList.add("hidden");

  if (showLoginBtn) showLoginBtn.classList.add("active");
  if (showRegisterBtn) showRegisterBtn.classList.remove("active");

  setAuthMessage("Welcome back! Login to continue.");
}

function showRegisterSection() {
  if (registerSection) registerSection.classList.remove("hidden");
  if (loginSection) loginSection.classList.add("hidden");

  if (showRegisterBtn) showRegisterBtn.classList.add("active");
  if (showLoginBtn) showLoginBtn.classList.remove("active");

  setAuthMessage("Create your account to start tracking runs.");
}

function togglePassword(inputEl, toggleBtn) {
  if (!inputEl || !toggleBtn) return;

  const isPassword = inputEl.type === "password";
  inputEl.type = isPassword ? "text" : "password";
  toggleBtn.textContent = isPassword ? "Hide" : "Show";
}

function setFormLoading(formType, isLoading) {
  const submitBtn =
    formType === "login"
      ? loginForm?.querySelector('button[type="submit"]')
      : registerForm?.querySelector('button[type="submit"]');

  if (!submitBtn) return;

  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading
    ? formType === "login"
      ? "Logging in..."
      : "Creating..."
    : formType === "login"
      ? "Login"
      : "Create Account";
}

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (res.ok) {
      window.location.href = "/home";
    }
  } catch (error) {
    console.error("Auto-login check error:", error);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const userId = loginUserId?.value.trim();
  const password = loginPassword?.value.trim();

  if (!userId || !password) {
    setAuthMessage("Please enter User ID and Password.", true);
    return;
  }

  setFormLoading("login", true);
  setAuthMessage("Logging in...");

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
      throw new Error(data.message || "Login failed");
    }

    setAuthMessage("Login successful! Redirecting...");
    window.location.href = "/home";
  } catch (error) {
    console.error("Login error:", error);
    setAuthMessage(error.message || "Login failed. Please try again.", true);
  } finally {
    setFormLoading("login", false);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const userId = registerUserId?.value.trim();
  const password = registerPassword?.value.trim();

  if (!userId || !password) {
    setAuthMessage("Please enter User ID and Password.", true);
    return;
  }

  if (userId.length < 3) {
    setAuthMessage("User ID must be at least 3 characters.", true);
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return;
  }

  setFormLoading("register", true);
  setAuthMessage("Creating account...");

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
      throw new Error(data.message || "Registration failed");
    }

    setAuthMessage("Account created successfully! Redirecting...");
    window.location.href = "/home";
  } catch (error) {
    console.error("Register error:", error);
    setAuthMessage(error.message || "Registration failed. Please try again.", true);
  } finally {
    setFormLoading("register", false);
  }
}

/* Toggle buttons */
if (showLoginBtn) {
  showLoginBtn.addEventListener("click", showLoginSection);
}

if (showRegisterBtn) {
  showRegisterBtn.addEventListener("click", showRegisterSection);
}

/* Password toggle buttons */
if (loginTogglePassword) {
  loginTogglePassword.addEventListener("click", () => {
    togglePassword(loginPassword, loginTogglePassword);
  });
}

if (registerTogglePassword) {
  registerTogglePassword.addEventListener("click", () => {
    togglePassword(registerPassword, registerTogglePassword);
  });
}

/* Form submit */
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}

/* Init */
showLoginSection();
checkAlreadyLoggedIn();