const summaryUserText = document.getElementById("summaryUserText");
const latestDistance = document.getElementById("latestDistance");
const latestTime = document.getElementById("latestTime");
const latestCalories = document.getElementById("latestCalories");
const latestPace = document.getElementById("latestPace");
const summaryStatus = document.getElementById("summaryStatus");

const summaryBackHomeBtn = document.getElementById("summaryBackHomeBtn");
const summaryRunAgainBtn = document.getElementById("summaryRunAgainBtn");
const summaryGoHistoryBtn = document.getElementById("summaryGoHistoryBtn");
const summaryGoProfileBtn = document.getElementById("summaryGoProfileBtn");

const summaryNavHome = document.getElementById("summaryNavHome");
const summaryNavRun = document.getElementById("summaryNavRun");
const summaryNavHistory = document.getElementById("summaryNavHistory");
const summaryNavProfile = document.getElementById("summaryNavProfile");

let summaryMap = null;
let summaryRouteLine = null;
let summaryMarker = null;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);

  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatPace(value) {
  const safePace = Number(value);

  if (!Number.isFinite(safePace) || safePace <= 0) {
    return "--";
  }

  return `${safePace.toFixed(2)} min/km`;
}

function sanitizeRun(run = {}) {
  return {
    distanceKm: Math.max(0, Number(run.distanceKm) || 0),
    durationSec: Math.max(0, Math.floor(Number(run.durationSec) || 0)),
    calories: Math.max(0, Math.round(Number(run.calories) || 0)),
    avgPaceMinPerKm: Number(run.avgPaceMinPerKm) || 0,
    routePoints: Array.isArray(run.routePoints) ? run.routePoints : []
  };
}

function setSummaryValues(run = {}) {
  const safeRun = sanitizeRun(run);

  if (latestDistance) {
    latestDistance.textContent = safeRun.distanceKm.toFixed(2);
  }

  if (latestTime) {
    latestTime.textContent = formatTime(safeRun.durationSec);
  }

  if (latestCalories) {
    latestCalories.textContent = safeRun.calories;
  }

  if (latestPace) {
    latestPace.textContent = formatPace(safeRun.avgPaceMinPerKm);
  }
}

function setSummaryStatus(text) {
  if (summaryStatus) {
    summaryStatus.textContent = text;
  }
}

function initSummaryMap() {
  const mapEl = document.getElementById("summaryMap");
  if (!mapEl || typeof L === "undefined") return;

  if (summaryMap) return;

  summaryMap = L.map("summaryMap").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(summaryMap);

  summaryRouteLine = L.polyline([], { weight: 5 }).addTo(summaryMap);

  setTimeout(() => {
    if (summaryMap) {
      summaryMap.invalidateSize();
    }
  }, 250);
}

function clearSummaryMap() {
  if (summaryRouteLine) {
    summaryRouteLine.setLatLngs([]);
  }

  if (summaryMarker && summaryMap) {
    summaryMap.removeLayer(summaryMarker);
    summaryMarker = null;
  }
}

function renderSummaryRoute(routePoints = []) {
  if (!summaryMap || !summaryRouteLine) return;

  const validPoints = Array.isArray(routePoints)
    ? routePoints.filter(
        (point) =>
          point &&
          Number.isFinite(Number(point.lat)) &&
          Number.isFinite(Number(point.lng))
      ).map((point) => ({
        lat: Number(point.lat),
        lng: Number(point.lng)
      }))
    : [];

  clearSummaryMap();

  if (validPoints.length === 0) {
    summaryMap.setView([20.5937, 78.9629], 5);
    setSummaryStatus("Run loaded. Route unavailable.");
    return;
  }

  const latLngs = validPoints.map((point) => [point.lat, point.lng]);

  summaryRouteLine.setLatLngs(latLngs);

  const last = validPoints[validPoints.length - 1];
  summaryMarker = L.marker([last.lat, last.lng]).addTo(summaryMap);

  if (validPoints.length > 1) {
    const bounds = L.latLngBounds(latLngs);
    summaryMap.fitBounds(bounds, { padding: [20, 20] });
  } else {
    summaryMap.setView([last.lat, last.lng], 17);
  }

  setSummaryStatus("Latest run loaded successfully.");
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
    console.error("Summary auth check error:", error);
    window.location.href = "/";
    return null;
  }
}

async function loadLatestRun() {
  try {
    setSummaryStatus("Loading latest run...");

    const res = await fetch("/api/runs/latest", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load latest run");
    }

    const run = sanitizeRun(data.run || {});

    setSummaryValues(run);
    renderSummaryRoute(run.routePoints);
  } catch (error) {
    console.error("Load latest run error:", error);

    setSummaryValues({
      distanceKm: 0,
      durationSec: 0,
      calories: 0,
      avgPaceMinPerKm: 0
    });

    clearSummaryMap();

    if (summaryMap) {
      summaryMap.setView([20.5937, 78.9629], 5);
    }

    setSummaryStatus("No latest run found yet. Complete a run first.");
  }
}

async function initSummaryPage() {
  const user = await ensureAuth();
  if (!user) return;

  if (summaryUserText) {
    summaryUserText.textContent = `Latest result for ${user.userId}`;
  }

  initSummaryMap();
  await loadLatestRun();
}

/* Top/Home button */
if (summaryBackHomeBtn) {
  summaryBackHomeBtn.addEventListener("click", () => {
    window.location.href = "/home";
  });
}

/* Action buttons */
if (summaryRunAgainBtn) {
  summaryRunAgainBtn.addEventListener("click", () => {
    window.location.href = "/run";
  });
}

if (summaryGoHistoryBtn) {
  summaryGoHistoryBtn.addEventListener("click", () => {
    window.location.href = "/history";
  });
}

if (summaryGoProfileBtn) {
  summaryGoProfileBtn.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}

/* Bottom nav */
if (summaryNavHome) {
  summaryNavHome.addEventListener("click", () => {
    window.location.href = "/home";
  });
}

if (summaryNavRun) {
  summaryNavRun.addEventListener("click", () => {
    window.location.href = "/run";
  });
}

if (summaryNavHistory) {
  summaryNavHistory.addEventListener("click", () => {
    window.location.href = "/history";
  });
}

if (summaryNavProfile) {
  summaryNavProfile.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}

setSummaryValues();
initSummaryPage();