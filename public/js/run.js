const runUserText = document.getElementById("runUserText");
const gpsStatus = document.getElementById("gpsStatus");

const distanceValue = document.getElementById("distanceValue");
const timerValue = document.getElementById("timerValue");
const speedValue = document.getElementById("speedValue");
const caloriesValue = document.getElementById("caloriesValue");
const paceValue = document.getElementById("paceValue");

const startRunBtn = document.getElementById("startRunBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const stopRunBtn = document.getElementById("stopRunBtn");
const backHomeBtn = document.getElementById("backHomeBtn");
const recenterMapBtn = document.getElementById("recenterMapBtn");

const runNavHome = document.getElementById("runNavHome");
const runNavRun = document.getElementById("runNavRun");
const runNavHistory = document.getElementById("runNavHistory");
const runNavProfile = document.getElementById("runNavProfile");

const RUN_STATE_KEY = "makeURunLiveState";

// ===== GPS FILTER SETTINGS =====
const MAX_ACCEPTABLE_ACCURACY_METERS = 30; // ignore worse accuracy than this
const MIN_MOVEMENT_KM = 0.008; // 8m min movement to avoid GPS jitter
const MAX_JUMP_KM = 0.25; // 250m sudden jump protection

let map;
let routeLine;
let currentMarker;

let watchId = null;
let timerInterval = null;

let isRunning = false;
let isPaused = false;

let elapsedSeconds = 0;
let distanceKm = 0;
let calories = 0;
let avgPace = 0;
let avgSpeedKmh = 0;

let lastPosition = null;
let routePoints = [];
let runStartedAt = null;
let pausedAt = null;
let totalPausedMs = 0;
let lastSavedSecond = -1;

let followUser = true;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));

  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatPace(distance, seconds) {
  if (distance < 0.05 || seconds <= 0) return "--";
  const paceMin = (seconds / 60) / distance;
  return `${paceMin.toFixed(2)} min/km`;
}

function calculateCalories(distance) {
  // Simple beginner estimate: ~62 kcal per km
  if (distance <= 0) return 0;
  return Math.round(distance * 62);
}

function calculateAvgSpeed(distance, seconds) {
  if (distance <= 0 || seconds <= 0) return 0;
  const hours = seconds / 3600;
  return distance / hours;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateUI() {
  avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);

  if (distanceValue) distanceValue.textContent = distanceKm.toFixed(2);
  if (timerValue) timerValue.textContent = formatTime(elapsedSeconds);
  if (speedValue) speedValue.textContent = avgSpeedKmh.toFixed(2);
  if (caloriesValue) caloriesValue.textContent = calories;
  if (paceValue) paceValue.textContent = formatPace(distanceKm, elapsedSeconds);
}

function updateGPSStatus(text) {
  if (gpsStatus) {
    gpsStatus.textContent = text;
  }
}

function initMap() {
  const runMapEl = document.getElementById("runMap");

  if (!runMapEl) {
    updateGPSStatus("Map container not found.");
    return;
  }

  if (typeof L === "undefined") {
    updateGPSStatus("Map library failed to load.");
    return;
  }

  map = L.map("runMap").setView([8.0883, 77.5385], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  routeLine = L.polyline([], { weight: 5 }).addTo(map);

  // If user manually moves map, stop auto-follow
  map.on("dragstart zoomstart", () => {
    followUser = false;
  });

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 250);
}

function renderExistingRoute() {
  if (!map || !routeLine) return;

  routeLine.setLatLngs(routePoints.map((p) => [p.lat, p.lng]));

  if (routePoints.length > 0) {
    const last = routePoints[routePoints.length - 1];

    if (currentMarker) {
      currentMarker.setLatLng([last.lat, last.lng]);
    } else {
      currentMarker = L.marker([last.lat, last.lng]).addTo(map);
    }

    if (routePoints.length > 1) {
      const bounds = L.latLngBounds(routePoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView([last.lat, last.lng], 17);
    }
  }
}

function saveRunState() {
  const payload = {
    isRunning,
    isPaused,
    elapsedSeconds,
    distanceKm,
    calories,
    avgPace,
    avgSpeedKmh,
    lastPosition,
    routePoints,
    runStartedAt,
    pausedAt,
    totalPausedMs,
    followUser
  };

  localStorage.setItem(RUN_STATE_KEY, JSON.stringify(payload));
}

function loadRunState() {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    isRunning = !!data.isRunning;
    isPaused = !!data.isPaused;
    elapsedSeconds = Number(data.elapsedSeconds) || 0;
    distanceKm = Number(data.distanceKm) || 0;
    calories = Number(data.calories) || 0;
    avgPace = Number(data.avgPace) || 0;
    avgSpeedKmh = Number(data.avgSpeedKmh) || 0;
    lastPosition = data.lastPosition || null;
    routePoints = Array.isArray(data.routePoints) ? data.routePoints : [];
    runStartedAt = data.runStartedAt || null;
    pausedAt = data.pausedAt || null;
    totalPausedMs = Number(data.totalPausedMs) || 0;
    followUser = data.followUser !== false;

    return true;
  } catch (error) {
    console.error("Restore run state error:", error);
    localStorage.removeItem(RUN_STATE_KEY);
    return false;
  }
}

function clearRunState() {
  localStorage.removeItem(RUN_STATE_KEY);
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
    console.error("Auth check error:", error);
    window.location.href = "/index.html";
    return null;
  }
}

function getActiveElapsedSeconds() {
  if (!runStartedAt) return elapsedSeconds;

  const now = Date.now();
  const effectiveNow = isPaused && pausedAt ? pausedAt : now;
  const totalMs = effectiveNow - runStartedAt - totalPausedMs;

  return Math.max(0, Math.floor(totalMs / 1000));
}

function startTimer() {
  stopTimer();

  timerInterval = setInterval(() => {
    if (!isRunning) return;

    elapsedSeconds = getActiveElapsedSeconds();
    avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
    avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);
    calories = calculateCalories(distanceKm);

    updateUI();

    if (elapsedSeconds !== lastSavedSecond) {
      lastSavedSecond = elapsedSeconds;
      saveRunState();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateMapWithAcceptedPoint(current) {
  routePoints.push(current);

  if (routeLine) {
    routeLine.addLatLng([current.lat, current.lng]);
  }

  if (currentMarker) {
    currentMarker.setLatLng([current.lat, current.lng]);
  } else if (map) {
    currentMarker = L.marker([current.lat, current.lng]).addTo(map);
  }

  if (map && followUser) {
    map.panTo([current.lat, current.lng], { animate: true });
  }
}

function handlePosition(position) {
  if (!isRunning || isPaused) return;

  const { latitude, longitude, accuracy } = position.coords;

  if (accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    updateGPSStatus(`Weak GPS signal (${Math.round(accuracy)}m). Waiting for better lock...`);
    return;
  }

  updateGPSStatus(`GPS locked • Accuracy ${Math.round(accuracy)}m`);

  const current = {
    lat: latitude,
    lng: longitude,
    accuracy: Math.round(accuracy),
    timestamp: Date.now()
  };

  // First valid point
  if (!lastPosition) {
    lastPosition = current;
    updateMapWithAcceptedPoint(current);

    elapsedSeconds = getActiveElapsedSeconds();
    calories = calculateCalories(distanceKm);
    avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
    avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);

    updateUI();
    saveRunState();
    return;
  }

  const segment = haversineDistance(
    lastPosition.lat,
    lastPosition.lng,
    current.lat,
    current.lng
  );

  // Ignore tiny GPS noise
  if (segment < MIN_MOVEMENT_KM) {
    elapsedSeconds = getActiveElapsedSeconds();
    avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);
    updateUI();
    return;
  }

  // Ignore sudden unrealistic jumps
  if (segment > MAX_JUMP_KM) {
    updateGPSStatus("GPS jump ignored. Waiting for stable tracking...");
    return;
  }

  // Accept clean point
  distanceKm += segment;
  lastPosition = current;

  updateMapWithAcceptedPoint(current);

  elapsedSeconds = getActiveElapsedSeconds();
  calories = calculateCalories(distanceKm);
  avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
  avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);

  updateUI();
  saveRunState();
}

function handlePositionError(error) {
  console.error("GPS error:", error);

  switch (error.code) {
    case 1:
      updateGPSStatus("Location permission denied. Please allow GPS access.");
      break;
    case 2:
      updateGPSStatus("Location unavailable. Try outside or check signal.");
      break;
    case 3:
      updateGPSStatus("GPS request timed out. Try again.");
      break;
    default:
      updateGPSStatus("Could not get GPS location.");
  }
}

function startTracking() {
  if (!navigator.geolocation) {
    updateGPSStatus("Geolocation not supported on this device.");
    return;
  }

  stopTracking();

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handlePositionError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 12000
    }
  );
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function applyIdleUI() {
  if (startRunBtn) startRunBtn.disabled = false;
  if (pauseResumeBtn) {
    pauseResumeBtn.disabled = true;
    pauseResumeBtn.textContent = "Pause";
  }
  if (stopRunBtn) stopRunBtn.disabled = true;
}

function applyRunningUI() {
  if (startRunBtn) startRunBtn.disabled = true;
  if (pauseResumeBtn) {
    pauseResumeBtn.disabled = false;
    pauseResumeBtn.textContent = isPaused ? "Resume" : "Pause";
  }
  if (stopRunBtn) stopRunBtn.disabled = false;
}

function resetRunVisuals() {
  if (routeLine) {
    routeLine.setLatLngs([]);
  }

  if (currentMarker && map) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }
}

function resetRunState() {
  stopTracking();
  stopTimer();

  isRunning = false;
  isPaused = false;

  elapsedSeconds = 0;
  distanceKm = 0;
  calories = 0;
  avgPace = 0;
  avgSpeedKmh = 0;

  lastPosition = null;
  routePoints = [];
  runStartedAt = null;
  pausedAt = null;
  totalPausedMs = 0;
  lastSavedSecond = -1;
  followUser = true;

  resetRunVisuals();
  clearRunState();

  updateUI();
  updateGPSStatus("Waiting to start...");
  applyIdleUI();
}

function startRun() {
  if (isRunning) return;

  stopTracking();
  stopTimer();

  isRunning = true;
  isPaused = false;

  elapsedSeconds = 0;
  distanceKm = 0;
  calories = 0;
  avgPace = 0;
  avgSpeedKmh = 0;

  lastPosition = null;
  routePoints = [];
  runStartedAt = Date.now();
  pausedAt = null;
  totalPausedMs = 0;
  lastSavedSecond = -1;
  followUser = true;

  resetRunVisuals();
  updateUI();
  updateGPSStatus("Starting GPS... Please wait for stable signal...");
  applyRunningUI();
  saveRunState();

  startTimer();
  startTracking();
}

function togglePauseResume() {
  if (!isRunning) return;

  isPaused = !isPaused;

  if (isPaused) {
    pausedAt = Date.now();
    stopTracking();
    updateGPSStatus("Run paused. GPS paused too.");
  } else {
    if (pausedAt) {
      totalPausedMs += Date.now() - pausedAt;
    }
    pausedAt = null;
    updateGPSStatus("Run resumed. Tracking active.");
    startTracking();
  }

  applyRunningUI();
  saveRunState();
}

async function finishAndSaveRun() {
  if (!isRunning) return;

  const confirmSave = confirm("Finish and save this run?");
  if (!confirmSave) return;

  stopTracking();
  stopTimer();

  elapsedSeconds = getActiveElapsedSeconds();
  calories = calculateCalories(distanceKm);
  avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
  avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);

  const payload = {
    distanceKm: Number(distanceKm.toFixed(3)),
    durationSec: elapsedSeconds,
    calories,
    avgPaceMinPerKm: Number(avgPace.toFixed(2)),
    routePoints
  };

  if (startRunBtn) startRunBtn.disabled = true;
  if (pauseResumeBtn) pauseResumeBtn.disabled = true;
  if (stopRunBtn) stopRunBtn.disabled = true;

  try {
    updateGPSStatus("Saving run...");

    const res = await fetch("/api/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save run");
    }

    clearRunState();
    updateGPSStatus("Run saved successfully!");
    window.location.href = "/summary.html";
  } catch (error) {
    console.error("Save run error:", error);

    updateGPSStatus("Failed to save run. Please try again.");

    // restore running state so user can retry
    isRunning = true;
    isPaused = false;
    pausedAt = null;

    applyRunningUI();
    saveRunState();

    startTimer();
    startTracking();
  }
}

function recenterMapToUser() {
  followUser = true;

  if (!map) return;

  if (lastPosition) {
    map.setView([lastPosition.lat, lastPosition.lng], Math.max(map.getZoom(), 16), {
      animate: true
    });
    updateGPSStatus("Following your live location.");
  } else {
    updateGPSStatus("Waiting for first GPS lock...");
  }

  saveRunState();
}

function restoreLiveRunIfAny() {
  const restored = loadRunState();

  if (!restored || !isRunning) {
    updateUI();
    applyIdleUI();
    updateGPSStatus("Waiting to start...");
    return;
  }

  elapsedSeconds = getActiveElapsedSeconds();
  calories = calculateCalories(distanceKm);
  avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
  avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);

  updateUI();
  renderExistingRoute();
  applyRunningUI();

  if (isPaused) {
    updateGPSStatus("Restored paused run.");
    startTimer();
  } else {
    updateGPSStatus("Restored live run after refresh.");
    startTimer();
    startTracking();
  }
}

async function initRunPage() {
  const user = await ensureAuth();
  if (!user) return;

  if (runUserText) {
    runUserText.textContent = `Tracking for ${user.userId}`;
  }

  initMap();
  restoreLiveRunIfAny();
}

if (startRunBtn) startRunBtn.addEventListener("click", startRun);
if (pauseResumeBtn) pauseResumeBtn.addEventListener("click", togglePauseResume);
if (stopRunBtn) stopRunBtn.addEventListener("click", finishAndSaveRun);
if (recenterMapBtn) recenterMapBtn.addEventListener("click", recenterMapToUser);

if (backHomeBtn) {
  backHomeBtn.addEventListener("click", () => {
    window.location.href = "/home.html";
  });
}

if (runNavHome) {
  runNavHome.addEventListener("click", () => {
    window.location.href = "/home.html";
  });
}

if (runNavRun) {
  runNavRun.addEventListener("click", () => {
    window.location.href = "/run.html";
  });
}

if (runNavHistory) {
  runNavHistory.addEventListener("click", () => {
    window.location.href = "/history.html";
  });
}

if (runNavProfile) {
  runNavProfile.addEventListener("click", () => {
    window.location.href = "/profile.html";
  });
}

window.addEventListener("beforeunload", () => {
  stopTracking();
  stopTimer();

  if (isRunning) {
    elapsedSeconds = getActiveElapsedSeconds();
    avgSpeedKmh = calculateAvgSpeed(distanceKm, elapsedSeconds);
    saveRunState();
  }
});

updateUI();
initRunPage();