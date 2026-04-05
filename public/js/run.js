const runUserText = document.getElementById("runUserText");
const gpsStatus = document.getElementById("gpsStatus");

const distanceValue = document.getElementById("distanceValue");
const timerValue = document.getElementById("timerValue");
const caloriesValue = document.getElementById("caloriesValue");
const paceValue = document.getElementById("paceValue");

const startRunBtn = document.getElementById("startRunBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const stopRunBtn = document.getElementById("stopRunBtn");
const backHomeBtn = document.getElementById("backHomeBtn");

const runNavHome = document.getElementById("runNavHome");
const runNavRun = document.getElementById("runNavRun");
const runNavHistory = document.getElementById("runNavHistory");
const runNavProfile = document.getElementById("runNavProfile");

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

let lastPosition = null;
let routePoints = [];

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatPace(distance, seconds) {
  if (distance <= 0 || seconds <= 0) return "0.00 min/km";
  const paceMin = (seconds / 60) / distance;
  return `${paceMin.toFixed(2)} min/km`;
}

function calculateCalories(distance) {
  // Simple estimate: ~60 kcal per km
  return Math.round(distance * 60);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km

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
  distanceValue.textContent = distanceKm.toFixed(2);
  timerValue.textContent = formatTime(elapsedSeconds);
  caloriesValue.textContent = calories;
  paceValue.textContent = formatPace(distanceKm, elapsedSeconds);
}

function initMap() {
  map = L.map("runMap").setView([8.0883, 77.5385], 15); // default near Kanyakumari side
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  routeLine = L.polyline([], { weight: 5 }).addTo(map);
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

function startTimer() {
  timerInterval = setInterval(() => {
    if (!isPaused) {
      elapsedSeconds++;
      avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;
      updateUI();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateGPSStatus(text) {
  gpsStatus.textContent = text;
}

function handlePosition(position) {
  if (!isRunning || isPaused) return;

  const { latitude, longitude, accuracy } = position.coords;

  if (accuracy > 50) {
    updateGPSStatus(`Weak GPS signal (${Math.round(accuracy)}m). Move to open area.`);
  } else {
    updateGPSStatus(`GPS locked • Accuracy ${Math.round(accuracy)}m`);
  }

  const current = {
    lat: latitude,
    lng: longitude,
    timestamp: Date.now()
  };

  if (lastPosition) {
    const segment = haversineDistance(
      lastPosition.lat,
      lastPosition.lng,
      current.lat,
      current.lng
    );

    // ignore crazy GPS jumps
    if (segment > 0 && segment < 0.3) {
      distanceKm += segment;
    }
  }

  lastPosition = current;
  routePoints.push(current);

  routeLine.addLatLng([current.lat, current.lng]);

  if (currentMarker) {
    currentMarker.setLatLng([current.lat, current.lng]);
  } else {
    currentMarker = L.marker([current.lat, current.lng]).addTo(map);
  }

  map.setView([current.lat, current.lng], 17);

  calories = calculateCalories(distanceKm);
  avgPace = distanceKm > 0 ? (elapsedSeconds / 60) / distanceKm : 0;

  updateUI();
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

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handlePositionError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
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

  lastPosition = null;
  routePoints = [];

  if (routeLine) {
    routeLine.setLatLngs([]);
  }

  if (currentMarker && map) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }

  updateUI();
  updateGPSStatus("Waiting to start...");

  startRunBtn.disabled = false;
  pauseResumeBtn.disabled = true;
  stopRunBtn.disabled = true;
  pauseResumeBtn.textContent = "Pause";
}

function startRun() {
  if (isRunning) return;

  isRunning = true;
  isPaused = false;

  elapsedSeconds = 0;
  distanceKm = 0;
  calories = 0;
  avgPace = 0;
  lastPosition = null;
  routePoints = [];

  if (routeLine) routeLine.setLatLngs([]);
  if (currentMarker && map) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }

  updateUI();
  updateGPSStatus("Starting GPS... Please wait.");

  startRunBtn.disabled = true;
  pauseResumeBtn.disabled = false;
  stopRunBtn.disabled = false;
  pauseResumeBtn.textContent = "Pause";

  startTimer();
  startTracking();
}

function togglePauseResume() {
  if (!isRunning) return;

  isPaused = !isPaused;

  if (isPaused) {
    pauseResumeBtn.textContent = "Resume";
    updateGPSStatus("Run paused. Tap resume when ready.");
  } else {
    pauseResumeBtn.textContent = "Pause";
    updateGPSStatus("Run resumed. Tracking active.");
  }
}

async function finishAndSaveRun() {
  if (!isRunning) return;

  if (distanceKm <= 0 && elapsedSeconds < 10) {
    const stillSave = confirm("This run is very short. Save anyway?");
    if (!stillSave) return;
  } else {
    const confirmSave = confirm("Finish and save this run?");
    if (!confirmSave) return;
  }

  stopTracking();
  stopTimer();

  isRunning = false;
  isPaused = false;

  const payload = {
    distanceKm: Number(distanceKm.toFixed(3)),
    durationSec: elapsedSeconds,
    calories,
    avgPaceMinPerKm: Number(avgPace.toFixed(2)),
    routePoints
  };

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

    window.location.href = "/summary";
  } catch (error) {
    console.error("Save run error:", error);
    updateGPSStatus("Failed to save run. Please try again.");
    startRunBtn.disabled = false;
    pauseResumeBtn.disabled = true;
    stopRunBtn.disabled = true;
  }
}

async function initRunPage() {
  const user = await ensureAuth();
  if (!user) return;

  runUserText.textContent = `Tracking for ${user.userId}`;
  initMap();
  updateUI();
}

startRunBtn.addEventListener("click", startRun);
pauseResumeBtn.addEventListener("click", togglePauseResume);
stopRunBtn.addEventListener("click", finishAndSaveRun);
backHomeBtn.addEventListener("click", () => (window.location.href = "/home"));

runNavHome.addEventListener("click", () => (window.location.href = "/home"));
runNavRun.addEventListener("click", () => (window.location.href = "/run"));
runNavHistory.addEventListener("click", () => (window.location.href = "/history"));
runNavProfile.addEventListener("click", () => (window.location.href = "/profile"));

window.addEventListener("beforeunload", () => {
  stopTracking();
  stopTimer();
});

initRunPage();