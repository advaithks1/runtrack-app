const profileUserText = document.getElementById("profileUserText");
const profileStatus = document.getElementById("profileStatus");
const profileBadge = document.getElementById("profileBadge");
const profileMotivationText = document.getElementById("profileMotivationText");

const profileUserId = document.getElementById("profileUserId");
const profileTotalRuns = document.getElementById("profileTotalRuns");
const profileTotalDistance = document.getElementById("profileTotalDistance");
const profileTotalCalories = document.getElementById("profileTotalCalories");
const profileAvgSpeed = document.getElementById("profileAvgSpeed");
const profileLongestRun = document.getElementById("profileLongestRun");
const profileWeeklyDistance = document.getElementById("profileWeeklyDistance");
const profileStreakDays = document.getElementById("profileStreakDays");

const profileBackHomeBtn = document.getElementById("profileBackHomeBtn");
const profileGoRunBtn = document.getElementById("profileGoRunBtn");
const profileGoHistoryBtn = document.getElementById("profileGoHistoryBtn");
const profileLogoutBtn = document.getElementById("profileLogoutBtn");

const profileNavHome = document.getElementById("profileNavHome");
const profileNavRun = document.getElementById("profileNavRun");
const profileNavHistory = document.getElementById("profileNavHistory");
const profileNavProfile = document.getElementById("profileNavProfile");

const RUN_STATE_KEY = "makeURunLiveState";

function setProfileStatus(text) {
  if (profileStatus) {
    profileStatus.textContent = text;
  }
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function hasActiveLiveRun() {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    return !!data.isRunning;
  } catch (error) {
    console.error("Profile live run state error:", error);
    return false;
  }
}

function updateRunButtonLabel() {
  if (!profileGoRunBtn) return;

  profileGoRunBtn.textContent = hasActiveLiveRun() ? "Resume Run" : "Start Run";
}

function setDefaultStats() {
  if (profileUserId) profileUserId.textContent = "-";
  if (profileTotalRuns) profileTotalRuns.textContent = "0";
  if (profileTotalDistance) profileTotalDistance.textContent = "0.00";
  if (profileTotalCalories) profileTotalCalories.textContent = "0";
  if (profileAvgSpeed) profileAvgSpeed.textContent = "0.00";
  if (profileLongestRun) profileLongestRun.textContent = "0.00";
  if (profileWeeklyDistance) profileWeeklyDistance.textContent = "0.00";
  if (profileStreakDays) profileStreakDays.textContent = "0";
  if (profileBadge) profileBadge.textContent = "Runner";
}

function setProfileInsights(stats = {}) {
  const totalRuns = Math.max(0, Math.floor(safeNumber(stats.totalRuns, 0)));
  const totalDistanceKm = Math.max(0, safeNumber(stats.totalDistanceKm, 0));
  const overallAvgSpeedKmh = Math.max(0, safeNumber(stats.overallAvgSpeedKmh, 0));
  const longestRunKm = Math.max(0, safeNumber(stats.longestRunKm, 0));
  const streakDays = Math.max(0, Math.floor(safeNumber(stats.streakDays, 0)));

  if (profileBadge) {
    if (streakDays >= 15) {
      profileBadge.textContent = "Consistency Beast";
    } else if (streakDays >= 7) {
      profileBadge.textContent = "Streak Runner";
    } else if (totalDistanceKm >= 50) {
      profileBadge.textContent = "Distance Builder";
    } else if (totalRuns >= 10) {
      profileBadge.textContent = "Committed Runner";
    } else if (totalRuns > 0) {
      profileBadge.textContent = "Active Runner";
    } else {
      profileBadge.textContent = "New Runner";
    }
  }

  if (profileMotivationText) {
    if (streakDays >= 10) {
      profileMotivationText.textContent = `🔥 ${streakDays}-day streak! You are building a strong identity as a runner.`;
    } else if (longestRunKm >= 10) {
      profileMotivationText.textContent = "You have already proven your endurance. Keep training consistently and recover well.";
    } else if (overallAvgSpeedKmh >= 8) {
      profileMotivationText.textContent = "Nice average pace overall. Stay steady and your endurance will keep improving.";
    } else if (totalRuns >= 5) {
      profileMotivationText.textContent = "Your profile is growing well. Stack consistent runs and the results will follow.";
    } else if (totalRuns > 0) {
      profileMotivationText.textContent = "Good start. Keep showing up and your profile will improve every week.";
    } else {
      profileMotivationText.textContent = "Your running profile updates automatically as you save more runs. Build your streak and improve every week.";
    }
  }
}

async function ensureAuth() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      window.location.href = "/index.html";
      return null;
    }

    const data = await res.json();
    return data.user;
  } catch (error) {
    console.error("Profile auth check error:", error);
    window.location.href = "/index.html";
    return null;
  }
}

async function loadOverviewStats() {
  try {
    setProfileStatus("Loading profile stats...");

    const res = await fetch("/api/runs/stats/overview", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load stats");
    }

    const totalRuns = Math.max(0, Math.floor(safeNumber(data.totalRuns, 0)));
    const totalDistanceKm = Math.max(0, safeNumber(data.totalDistanceKm, 0));
    const totalCalories = Math.max(0, Math.round(safeNumber(data.totalCalories, 0)));
    const overallAvgSpeedKmh = Math.max(0, safeNumber(data.overallAvgSpeedKmh, 0));
    const longestRunKm = Math.max(0, safeNumber(data.longestRunKm, 0));
    const weeklyDistanceKm = Math.max(0, safeNumber(data.weeklyDistanceKm, 0));
    const streakDays = Math.max(0, Math.floor(safeNumber(data.streakDays, 0)));

    if (profileTotalRuns) profileTotalRuns.textContent = String(totalRuns);
    if (profileTotalDistance) profileTotalDistance.textContent = totalDistanceKm.toFixed(2);
    if (profileTotalCalories) profileTotalCalories.textContent = String(totalCalories);
    if (profileAvgSpeed) profileAvgSpeed.textContent = overallAvgSpeedKmh.toFixed(2);
    if (profileLongestRun) profileLongestRun.textContent = longestRunKm.toFixed(2);
    if (profileWeeklyDistance) profileWeeklyDistance.textContent = weeklyDistanceKm.toFixed(2);
    if (profileStreakDays) profileStreakDays.textContent = String(streakDays);

    setProfileInsights({
      totalRuns,
      totalDistanceKm,
      overallAvgSpeedKmh,
      longestRunKm,
      streakDays
    });

    setProfileStatus("Profile loaded successfully.");
  } catch (error) {
    console.error("Load profile stats error:", error);
    setDefaultStats();
    setProfileStatus("Could not load profile stats right now.");
  }
}

async function logoutUser() {
  const confirmLogout = confirm("Logout now?");
  if (!confirmLogout) return;

  try {
    setProfileStatus("Logging out...");

    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Logout failed");
    }

    localStorage.removeItem(RUN_STATE_KEY);
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Logout error:", error);
    setProfileStatus("Logout failed. Please try again.");
    alert("Could not logout right now.");
  }
}

async function initProfilePage() {
  const user = await ensureAuth();
  if (!user) return;

  if (profileUserText) {
    profileUserText.textContent = `Welcome, ${user.userId}`;
  }

  if (profileUserId) {
    profileUserId.textContent = user.userId;
  }

  updateRunButtonLabel();
  await loadOverviewStats();
}

/* Top buttons */
if (profileBackHomeBtn) {
  profileBackHomeBtn.addEventListener("click", () => {
    window.location.href = "/home.html";
  });
}

/* Action buttons */
if (profileGoRunBtn) {
  profileGoRunBtn.addEventListener("click", () => {
    window.location.href = "/run.html";
  });
}

if (profileGoHistoryBtn) {
  profileGoHistoryBtn.addEventListener("click", () => {
    window.location.href = "/history.html";
  });
}

if (profileLogoutBtn) {
  profileLogoutBtn.addEventListener("click", logoutUser);
}

/* Bottom nav */
if (profileNavHome) {
  profileNavHome.addEventListener("click", () => {
    window.location.href = "/home.html";
  });
}

if (profileNavRun) {
  profileNavRun.addEventListener("click", () => {
    window.location.href = "/run.html";
  });
}

if (profileNavHistory) {
  profileNavHistory.addEventListener("click", () => {
    window.location.href = "/history.html";
  });
}

if (profileNavProfile) {
  profileNavProfile.addEventListener("click", () => {
    window.location.href = "/profile.html";
  });
}

setDefaultStats();
updateRunButtonLabel();
initProfilePage();