const historyUserText = document.getElementById("historyUserText");
const historyList = document.getElementById("historyList");
const historyStatus = document.getElementById("historyStatus");

const historyBackHomeBtn = document.getElementById("historyBackHomeBtn");
const historyNavHome = document.getElementById("historyNavHome");
const historyNavRun = document.getElementById("historyNavRun");
const historyNavHistory = document.getElementById("historyNavHistory");
const historyNavProfile = document.getElementById("historyNavProfile");

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

function formatPace(value) {
  const safePace = Number(value);

  if (!Number.isFinite(safePace) || safePace <= 0) {
    return "--";
  }

  return `${safePace.toFixed(2)} min/km`;
}

function formatSpeed(value) {
  const safeSpeed = Number(value);

  if (!Number.isFinite(safeSpeed) || safeSpeed <= 0) {
    return "0.00 km/h";
  }

  return `${safeSpeed.toFixed(2)} km/h`;
}

function calculateAvgSpeed(distanceKm, durationSec) {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeDuration = Math.max(0, Number(durationSec) || 0);

  if (safeDistance <= 0 || safeDuration <= 0) return 0;

  const hours = safeDuration / 3600;
  return safeDistance / hours;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function sanitizeRun(run = {}) {
  const distanceKm = Math.max(0, Number(run.distanceKm) || 0);
  const durationSec = Math.max(0, Math.floor(Number(run.durationSec) || 0));
  const calories = Math.max(0, Math.round(Number(run.calories) || 0));
  const avgPaceMinPerKm = Math.max(0, Number(run.avgPaceMinPerKm) || 0);

  let avgSpeedKmh = Number(run.avgSpeedKmh);
  if (!Number.isFinite(avgSpeedKmh) || avgSpeedKmh < 0) {
    avgSpeedKmh = calculateAvgSpeed(distanceKm, durationSec);
  }

  return {
    _id: run._id || "",
    distanceKm,
    durationSec,
    calories,
    avgPaceMinPerKm,
    avgSpeedKmh,
    createdAt: run.createdAt || null
  };
}

function setHistoryStatus(text) {
  if (historyStatus) {
    historyStatus.textContent = text;
  }
}

function createRunCard(run) {
  const safeRun = sanitizeRun(run);

  const runId = safeRun._id;
  const distance = safeRun.distanceKm.toFixed(2);
  const duration = formatTime(safeRun.durationSec);
  const calories = safeRun.calories;
  const pace = formatPace(safeRun.avgPaceMinPerKm);
  const speed = formatSpeed(safeRun.avgSpeedKmh);
  const createdAt = formatDate(safeRun.createdAt);

  const card = document.createElement("div");
  card.className = "run-item";

  card.innerHTML = `
    <div class="run-item-top">
      <div>
        <div class="run-date">${createdAt}</div>
      </div>
      <div class="run-distance">${distance} KM</div>
    </div>

    <div class="run-meta">
      <div class="run-meta-box">
        <div class="run-meta-value">${duration}</div>
        <div class="run-meta-label">TIME</div>
      </div>

      <div class="run-meta-box">
        <div class="run-meta-value">${calories}</div>
        <div class="run-meta-label">CAL</div>
      </div>

      <div class="run-meta-box">
        <div class="run-meta-value">${pace}</div>
        <div class="run-meta-label">PACE</div>
      </div>

      <div class="run-meta-box">
        <div class="run-meta-value">${speed}</div>
        <div class="run-meta-label">SPEED</div>
      </div>
    </div>

    <button class="delete-run-btn" type="button" data-run-id="${runId}">
      Delete Run
    </button>
  `;

  const deleteBtn = card.querySelector(".delete-run-btn");

  if (deleteBtn && runId) {
    deleteBtn.addEventListener("click", async () => {
      await deleteRun(runId, card);
    });
  } else if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Run ID Missing";
  }

  return card;
}

function renderRuns(runs) {
  if (!historyList) return;

  historyList.innerHTML = "";

  if (!Array.isArray(runs) || runs.length === 0) {
    historyList.innerHTML = `<p class="empty-text">No runs yet. Complete your first run!</p>`;
    setHistoryStatus("No runs found yet.");
    return;
  }

  runs.forEach((run) => {
    const card = createRunCard(run);
    historyList.appendChild(card);
  });

  setHistoryStatus(`Loaded ${runs.length} run${runs.length > 1 ? "s" : ""}.`);
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
    console.error("History auth check error:", error);
    window.location.href = "/";
    return null;
  }
}

async function loadRuns() {
  try {
    setHistoryStatus("Loading your runs...");

    const res = await fetch("/api/runs/my", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load runs");
    }

    renderRuns(data.runs || []);
  } catch (error) {
    console.error("Load runs error:", error);

    if (historyList) {
      historyList.innerHTML = `<p class="empty-text">Could not load runs right now.</p>`;
    }

    setHistoryStatus("Failed to load history.");
  }
}

async function deleteRun(runId, cardElement) {
  if (!runId) return;

  const confirmDelete = confirm("Delete this run?");
  if (!confirmDelete) return;

  try {
    setHistoryStatus("Deleting run...");

    const res = await fetch(`/api/runs/${runId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete run");
    }

    if (cardElement) {
      cardElement.remove();
    }

    const remainingCards = historyList ? historyList.querySelectorAll(".run-item") : [];

    if (!remainingCards || remainingCards.length === 0) {
      if (historyList) {
        historyList.innerHTML = `<p class="empty-text">No runs yet. Complete your first run!</p>`;
      }
      setHistoryStatus("Run deleted. No runs remaining.");
    } else {
      setHistoryStatus(`Run deleted. ${remainingCards.length} run${remainingCards.length > 1 ? "s" : ""} remaining.`);
    }
  } catch (error) {
    console.error("Delete run error:", error);
    setHistoryStatus("Failed to delete run.");
    alert("Could not delete this run. Please try again.");
  }
}

async function initHistoryPage() {
  const user = await ensureAuth();
  if (!user) return;

  if (historyUserText) {
    historyUserText.textContent = `History for ${user.userId}`;
  }

  await loadRuns();
}

/* Top button */
if (historyBackHomeBtn) {
  historyBackHomeBtn.addEventListener("click", () => {
    window.location.href = "/home";
  });
}

/* Bottom nav */
if (historyNavHome) {
  historyNavHome.addEventListener("click", () => {
    window.location.href = "/home";
  });
}

if (historyNavRun) {
  historyNavRun.addEventListener("click", () => {
    window.location.href = "/run";
  });
}

if (historyNavHistory) {
  historyNavHistory.addEventListener("click", () => {
    window.location.href = "/history";
  });
}

if (historyNavProfile) {
  historyNavProfile.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}

initHistoryPage();