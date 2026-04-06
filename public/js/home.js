const homeUserText = document.getElementById("homeUserText");
const homeLogoutBtn = document.getElementById("homeLogoutBtn");

const homeGoalText = document.getElementById("homeGoalText");
const homeTotalRuns = document.getElementById("homeTotalRuns");
const homeTotalDistance = document.getElementById("homeTotalDistance");
const homeWeeklyDistance = document.getElementById("homeWeeklyDistance");
const homeAvgSpeed = document.getElementById("homeAvgSpeed");
const homeTotalCalories = document.getElementById("homeTotalCalories");
const homeLongestRun = document.getElementById("homeLongestRun");
const homeStreakDays = document.getElementById("homeStreakDays");
const homeStreakBadge = document.getElementById("homeStreakBadge");
const homeMotivationText = document.getElementById("homeMotivationText");

const homeStartRunBtn = document.getElementById("homeStartRunBtn");
const homeHistoryBtn = document.getElementById("homeHistoryBtn");
const homeProfileBtn = document.getElementById("homeProfileBtn");

const homeNavHome = document.getElementById("homeNavHome");
const homeNavRun = document.getElementById("homeNavRun");
const homeNavHistory = document.getElementById("homeNavHistory");
const homeNavProfile = document.getElementById("homeNavProfile");

const RUN_STATE_KEY = "makeURunLiveState";

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function readLiveRunState() {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    if (!data || typeof data !== "object" || typeof data.isRunning !== "boolean") {
      localStorage.removeItem(RUN_STATE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Live run state read error:", error);
    localStorage.removeItem(RUN_STATE_KEY);
    return null;
  }
}

function hasActiveLiveRun() {
  const data = readLiveRunState();
  return !!(data && data.isRunning);
}

function setDefaultHomeStats() {
  if (homeTotalRuns) homeTotalRuns.textContent = "0";
  if (homeTotalDistance) homeTotalDistance.textContent = "0.00";
  if (homeWeeklyDistance) homeWeeklyDistance.textContent = "0.00";
  if (homeAvgSpeed) homeAvgSpeed.textContent = "0.00";
  if (homeTotalCalories) homeTotalCalories.textContent = "0";
  if (homeLongestRun) homeLongestRun.textContent = "0.00";
  if (homeStreakDays) homeStreakDays.textContent = "0";
  if (homeStreakBadge) homeStreakBadge.textContent = "0 days streak";
}

function updateStartButtonLabel() {
  if (!homeStartRunBtn) return;

  if (hasActiveLiveRun()) {
    homeStartRunBtn.textContent = "Resume Live Run";
  } else {
    homeStartRunBtn.textContent = "Start Live Run";
  }
}

function setGoalAndMotivation(stats = {}) {
  const weeklyKm = safeNumber(stats.weeklyDistanceKm, 0);
  const totalRuns = safeNumber(stats.totalRuns, 0);
  const streakDays = safeNumber(stats.streakDays, 0);
  const longestRunKm = safeNumber(stats.longestRunKm, 0);
  const avgSpeedKmh = safeNumber(stats.overallAvgSpeedKmh, 0);

  if (homeGoalText) {
    if (totalRuns === 0) {
      homeGoalText.textContent = "Start your first run today. One run is all it takes to begin.";
    } else if (weeklyKm >= 25) {
      homeGoalText.textContent = "Elite consistency this week. Focus on recovery and keep the momentum strong.";
    } else if (weeklyKm >= 15) {
      homeGoalText.textContent = "Great week so far. One more solid run can push you to the next level.";
    } else if (streakDays >= 5) {
      homeGoalText.textContent = "Your streak is building well. Protect it with one focused run today.";
    } else if (longestRunKm >= 5) {
      homeGoalText.textContent = "You already proved you can go far. Build consistency and stack more quality runs.";
    } else {
      homeGoalText.textContent = "One more run today can improve your weekly progress. Stay consistent.";
    }
  }

  if (homeMotivationText) {
    if (streakDays >= 10) {
      homeMotivationText.textContent = `🔥 ${streakDays}-day streak! That is serious discipline. Keep showing up.`;
    } else if (streakDays >= 5) {
      homeMotivationText.textContent = `Strong work — ${streakDays}-day streak. Consistency is becoming your identity.`;
    } else if (avgSpeedKmh >= 8) {
      homeMotivationText.textContent = "Nice pace overall. Keep training smart and your endurance will rise fast.";
    } else if (totalRuns > 0) {
      homeMotivationText.textContent = "Every run counts. Even a short run builds discipline and momentum.";
    } else {
      homeMotivationText.textContent = "Your first run creates the habit. Start small and stay regular.";
    }
  }

  if (homeStreakBadge) {
    homeStreakBadge.textContent = `${streakDays} day${streakDays === 1 ? "" : "s"} streak`;
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
    console.error("Home auth check error:", error);
    window.location.href = "/index.html";
    return null;
  }
}

async function loadHomeStats() {
  try {
    const res = await fetch("/api/runs/stats/overview", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load home stats");
    }

    const totalRuns = Math.max(0, Math.floor(safeNumber(data.totalRuns, 0)));
    const totalDistanceKm = Math.max(0, safeNumber(data.totalDistanceKm, 0));
    const weeklyDistanceKm = Math.max(0, safeNumber(data.weeklyDistanceKm, 0));
    const overallAvgSpeedKmh = Math.max(0, safeNumber(data.overallAvgSpeedKmh, 0));
    const totalCalories = Math.max(0, Math.round(safeNumber(data.totalCalories, 0)));
    const longestRunKm = Math.max(0, safeNumber(data.longestRunKm, 0));
    const streakDays = Math.max(0, Math.floor(safeNumber(data.streakDays, 0)));

    if (homeTotalRuns) homeTotalRuns.textContent = String(totalRuns);
    if (homeTotalDistance) homeTotalDistance.textContent = totalDistanceKm.toFixed(2);
    if (homeWeeklyDistance) homeWeeklyDistance.textContent = weeklyDistanceKm.toFixed(2);
    if (homeAvgSpeed) homeAvgSpeed.textContent = overallAvgSpeedKmh.toFixed(2);
    if (homeTotalCalories) homeTotalCalories.textContent = String(totalCalories);
    if (homeLongestRun) homeLongestRun.textContent = longestRunKm.toFixed(2);
    if (homeStreakDays) homeStreakDays.textContent = String(streakDays);

    setGoalAndMotivation({
      totalRuns,
      weeklyDistanceKm,
      streakDays,
      longestRunKm,
      overallAvgSpeedKmh
    });
  } catch (error) {
    console.error("Load home stats error:", error);
    setDefaultHomeStats();
    setGoalAndMotivation();
  }
}

async function logoutUser() {
  const confirmLogout = confirm("Logout now?");
  if (!confirmLogout) return;

  try {
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
    alert("Could not logout right now. Please try again.");
  }
}

function goToRunPage() {
  window.location.href = "/run.html";
}

async function initHomePage() {
  const user = await ensureAuth();
  if (!user) return;

  if (homeUserText) {
    homeUserText.textContent = `Welcome back, ${user.userId}`;
  }

  setDefaultHomeStats();
  updateStartButtonLabel();
  await loadHomeStats();
}

/* Top button */
if (homeLogoutBtn) {
  homeLogoutBtn.addEventListener("click", logoutUser);
}

/* Main action buttons */
if (homeStartRunBtn) {
  homeStartRunBtn.addEventListener("click", goToRunPage);
}

if (homeHistoryBtn) {
  homeHistoryBtn.addEventListener("click", () => {
    window.location.href = "/history.html";
  });
}

if (homeProfileBtn) {
  homeProfileBtn.addEventListener("click", () => {
    window.location.href = "/profile.html";
  });
}

/* Bottom nav */
if (homeNavHome) {
  homeNavHome.addEventListener("click", () => {
    window.location.href = "/home.html";
  });
}

if (homeNavRun) {
  homeNavRun.addEventListener("click", goToRunPage);
}

if (homeNavHistory) {
  homeNavHistory.addEventListener("click", () => {
    window.location.href = "/history.html";
  });
}

if (homeNavProfile) {
  homeNavProfile.addEventListener("click", () => {
    window.location.href = "/profile.html";
  });
}

initHomePage();