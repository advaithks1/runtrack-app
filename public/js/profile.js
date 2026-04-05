document.addEventListener("DOMContentLoaded", () => {
  const profileUserText = document.getElementById("profileUserText");
  const profileMainName = document.getElementById("profileMainName");

  const profileRunsValue = document.getElementById("profileRunsValue");
  const profileDistanceValue = document.getElementById("profileDistanceValue");
  const profileWeeklyValue = document.getElementById("profileWeeklyValue");
  const profileStreakValue = document.getElementById("profileStreakValue");

  const profileAccountText = document.getElementById("profileAccountText");

  const profileLogoutBtn = document.getElementById("profileLogoutBtn");
  const profileGoHomeBtn = document.getElementById("profileGoHomeBtn");
  const profileGoRunBtn = document.getElementById("profileGoRunBtn");

  const profileNavHome = document.getElementById("profileNavHome");
  const profileNavRun = document.getElementById("profileNavRun");
  const profileNavHistory = document.getElementById("profileNavHistory");
  const profileNavProfile = document.getElementById("profileNavProfile");

  // Navigation
  if (profileGoHomeBtn) {
    profileGoHomeBtn.addEventListener("click", () => {
      window.location.href = "/home";
    });
  }

  if (profileGoRunBtn) {
    profileGoRunBtn.addEventListener("click", () => {
      window.location.href = "/run";
    });
  }

  if (profileNavHome) {
    profileNavHome.addEventListener("click", () => {
      window.location.href = "/home";
    });
  }

  if (profileNavRun) {
    profileNavRun.addEventListener("click", () => {
      window.location.href = "/run";
    });
  }

  if (profileNavHistory) {
    profileNavHistory.addEventListener("click", () => {
      window.location.href = "/history";
    });
  }

  if (profileNavProfile) {
    profileNavProfile.addEventListener("click", () => {
      window.location.href = "/profile";
    });
  }

  // Logout
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include"
        });

        if (res.ok) {
          window.location.href = "/";
        } else {
          alert("Logout failed. Please try again.");
        }
      } catch (error) {
        console.error("Logout error:", error);
        alert("Server error while logging out.");
      }
    });
  }

  // Load profile data
  loadProfile();

  async function loadProfile() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.user) {
        if (profileAccountText) {
          profileAccountText.textContent = "Failed to load profile.";
        }
        return;
      }

      const user = data.user;

      // Basic user info
      if (profileUserText) {
        profileUserText.textContent = `Logged in as ${user.userId}`;
      }

      if (profileMainName) {
        profileMainName.textContent = user.userId;
      }

      if (profileAccountText) {
        profileAccountText.textContent = "Logged in securely with session cookie.";
      }

      // Stats (safe defaults until run stats API is connected)
      if (profileRunsValue) profileRunsValue.textContent = "0";
      if (profileDistanceValue) profileDistanceValue.textContent = "0.00";
      if (profileWeeklyValue) profileWeeklyValue.textContent = "0.00";
      if (profileStreakValue) profileStreakValue.textContent = "0";

    } catch (error) {
      console.error("Profile load error:", error);

      if (profileAccountText) {
        profileAccountText.textContent = "Server not responding.";
      }
    }
  }
});