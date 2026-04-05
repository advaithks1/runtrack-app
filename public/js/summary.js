const summarySubText = document.getElementById("summarySubText");
const summaryDate = document.getElementById("summaryDate");
const summaryDistance = document.getElementById("summaryDistance");
const summaryTime = document.getElementById("summaryTime");
const summaryCalories = document.getElementById("summaryCalories");
const summaryPace = document.getElementById("summaryPace");

const summaryHomeBtn = document.getElementById("summaryHomeBtn");
const goHistoryBtn = document.getElementById("goHistoryBtn");
const goRunAgainBtn = document.getElementById("goRunAgainBtn");

const summaryNavHome = document.getElementById("summaryNavHome");
const summaryNavRun = document.getElementById("summaryNavRun");
const summaryNavHistory = document.getElementById("summaryNavHistory");
const summaryNavProfile = document.getElementById("summaryNavProfile");

let summaryMap;
let summaryRouteLine;

function formatTime(totalSeconds) {
  const total = Number(totalSeconds) || 0;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

function initSummaryMap() {
  summaryMap = L.map("summaryMap").setView([8.0883, 77.5385], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(summaryMap);

  summaryRouteLine = L.polyline([], { weight: 5 }).addTo(summaryMap);
}

function renderRoute(routePoints) {
  if (!Array.isArray(routePoints) || routePoints.length === 0) {
    summarySubText.textContent = "No route points available for this run";
    return;
  }

  const latLngs = routePoints.map((p) => [p.lat, p.lng]);
  summaryRouteLine.setLatLngs(latLngs);

  L.marker(latLngs[0]).addTo(summaryMap);
  L.marker(latLngs[latLngs.length - 1]).addTo(summaryMap);

  summaryMap.fitBounds(summaryRouteLine.getBounds(), { padding: [20, 20] });
}

async function loadSummary() {
  const user = await ensureAuth();
  if (!user) return;

  initSummaryMap();

  try {
    const res = await fetch("/api/runs/latest", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      summarySubText.textContent = "No saved runs yet";
      return;
    }

    const run = data.run;

    summarySubText.textContent = `Latest run for ${user.userId}`;
    summaryDate.textContent = new Date(run.createdAt).toLocaleString();
    summaryDistance.textContent = (run.distanceKm || 0).toFixed(2);
    summaryTime.textContent = formatTime(run.durationSec || 0);
    summaryCalories.textContent = Math.round(run.calories || 0);
    summaryPace.textContent = `${(run.avgPaceMinPerKm || 0).toFixed(2)} min/km`;

    renderRoute(run.routePoints || []);
  } catch (error) {
    console.error("Summary load error:", error);
    summarySubText.textContent = "Failed to load summary";
  }
}

summaryHomeBtn.addEventListener("click", () => (window.location.href = "/home"));
goHistoryBtn.addEventListener("click", () => (window.location.href = "/history"));
goRunAgainBtn.addEventListener("click", () => (window.location.href = "/run"));

summaryNavHome.addEventListener("click", () => (window.location.href = "/home"));
summaryNavRun.addEventListener("click", () => (window.location.href = "/run"));
summaryNavHistory.addEventListener("click", () => (window.location.href = "/history"));
summaryNavProfile.addEventListener("click", () => (window.location.href = "/profile"));

loadSummary();