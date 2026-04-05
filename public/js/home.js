const homeUserText = document.getElementById("homeUserText");
const totalRunsValue = document.getElementById("totalRunsValue");
const totalDistanceValue = document.getElementById("totalDistanceValue");
const totalCaloriesValue = document.getElementById("totalCaloriesValue");
const weeklyDistanceValue = document.getElementById("weeklyDistanceValue");
const longestRunValue = document.getElementById("longestRunValue");
const totalTimeValue = document.getElementById("totalTimeValue");
const streakValue = document.getElementById("streakValue");
const motivationText = document.getElementById("motivationText");

const homeLogoutBtn = document.getElementById("homeLogoutBtn");

const goRunBtn = document.getElementById("goRunBtn");
const goHistoryBtn = document.getElementById("goHistoryBtn");
const goSummaryBtn = document.getElementById("goSummaryBtn");
const goProfileBtn = document.getElementById("goProfileBtn");

const homeNavHome = document.getElementById("homeNavHome");
const homeNavRun = document.getElementById("homeNavRun");
const homeNavHistory = document.getElementById("homeNavHistory");
const homeNavProfile = document.getElementById("homeNavProfile");

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function getMotivation(stats) {
  if (stats.totalRuns === 0) return "Start your first run today and build your streak.";
  if (stats.streakDays >= 7) return `🔥 Amazing! You are on a ${stats.streakDays}-day streak.`;
  if (stats.weeklyDistanceKm >= 20) return "Strong week! Keep pushing your pace and consistency.";
  if (stats.totalRuns >= 10) return "You’re building real momentum. Keep showing up.";
  return "One more run today can make your progress even stronger.";
}

async function ensureAuth() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      window.location.href = "/";
      return null;
    }

    const data = await res.json();
    return data.user;
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/";
    return null;
  }
}

async function loadHome() {
  const user = await ensureAuth();
  if (!user) return;

  homeUserText.textContent = `Welcome back, ${user.userId}`;

  try {
    const res = await fetch("/api/runs/stats/overview", {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Failed to fetch stats");
    }

    const stats = await res.json();

    totalRunsValue.textContent = stats.totalRuns || 0;
    totalDistanceValue.textContent = (stats.totalDistanceKm || 0).toFixed(2);
    totalCaloriesValue.textContent = Math.round(stats.totalCalories || 0);
    weeklyDistanceValue.textContent = (stats.weeklyDistanceKm || 0).toFixed(2);
    longestRunValue.textContent = (stats.longestRunKm || 0).toFixed(2);
    totalTimeValue.textContent = formatDuration(stats.totalDurationSec || 0);
    streakValue.textContent = stats.streakDays || 0;

    motivationText.textContent = getMotivation(stats);
  } catch (error) {
    console.error("Load home stats error:", error);
    motivationText.textContent = "Could not load stats right now. Try again after your next refresh.";
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.href = "/";
  }
}

homeLogoutBtn.addEventListener("click", logout);

goRunBtn.addEventListener("click", () => (window.location.href = "/run"));
goHistoryBtn.addEventListener("click", () => (window.location.href = "/history"));
goSummaryBtn.addEventListener("click", () => (window.location.href = "/summary"));
goProfileBtn.addEventListener("click", () => (window.location.href = "/profile"));

homeNavHome.addEventListener("click", () => (window.location.href = "/home"));
homeNavRun.addEventListener("click", () => (window.location.href = "/run"));
homeNavHistory.addEventListener("click", () => (window.location.href = "/history"));
homeNavProfile.addEventListener("click", () => (window.location.href = "/profile"));

loadHome();