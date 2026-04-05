const historyUserText = document.getElementById("historyUserText");
const totalRuns = document.getElementById("totalRuns");
const totalKm = document.getElementById("totalKm");
const totalCal = document.getElementById("totalCal");
const historyCount = document.getElementById("historyCount");
const historyList = document.getElementById("historyList");

const historyHomeBtn = document.getElementById("historyHomeBtn");

const historyNavHome = document.getElementById("historyNavHome");
const historyNavRun = document.getElementById("historyNavRun");
const historyNavHistory = document.getElementById("historyNavHistory");
const historyNavProfile = document.getElementById("historyNavProfile");

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

function createRunCard(run) {
  const item = document.createElement("div");
  item.className = "run-item";

  item.innerHTML = `
    <div class="run-item-top">
      <div>
        <div class="run-date">${new Date(run.createdAt).toLocaleString()}</div>
      </div>
      <div class="run-distance">${(run.distanceKm || 0).toFixed(2)} KM</div>
    </div>

    <div class="run-meta">
      <div class="run-meta-box">
        <div class="run-meta-value">${formatTime(run.durationSec || 0)}</div>
        <div class="run-meta-label">TIME</div>
      </div>

      <div class="run-meta-box">
        <div class="run-meta-value">${Math.round(run.calories || 0)}</div>
        <div class="run-meta-label">CAL</div>
      </div>

      <div class="run-meta-box">
        <div class="run-meta-value">${(run.avgPaceMinPerKm || 0).toFixed(2)} min/km</div>
        <div class="run-meta-label">PACE</div>
      </div>
    </div>

    <button class="delete-run-btn" data-id="${run._id}">Delete Run</button>
  `;

  const deleteBtn = item.querySelector(".delete-run-btn");
  deleteBtn.addEventListener("click", () => deleteRun(run._id));

  return item;
}

async function deleteRun(runId) {
  const confirmDelete = confirm("Delete this run?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/runs/${runId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to delete run");
      return;
    }

    loadHistory();
  } catch (error) {
    console.error("Delete run error:", error);
    alert("Server error while deleting run");
  }
}

async function loadHistory() {
  const user = await ensureAuth();
  if (!user) return;

  historyUserText.textContent = `${user.userId}'s saved runs`;

  try {
    const res = await fetch("/api/runs/my", {
      method: "GET",
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load runs");
    }

    const runs = data.runs || [];

    totalRuns.textContent = runs.length;
    totalKm.textContent = runs.reduce((sum, run) => sum + (run.distanceKm || 0), 0).toFixed(2);
    totalCal.textContent = Math.round(runs.reduce((sum, run) => sum + (run.calories || 0), 0));
    historyCount.textContent = `${runs.length} item${runs.length === 1 ? "" : "s"}`;

    historyList.innerHTML = "";

    if (runs.length === 0) {
      historyList.innerHTML = `<p class="empty-text">No runs saved yet. Start your first run today.</p>`;
      return;
    }

    runs.forEach((run) => {
      historyList.appendChild(createRunCard(run));
    });
  } catch (error) {
    console.error("Load history error:", error);
    historyList.innerHTML = `<p class="empty-text">Failed to load runs. Please refresh.</p>`;
  }
}

historyHomeBtn.addEventListener("click", () => (window.location.href = "/home"));

historyNavHome.addEventListener("click", () => (window.location.href = "/home"));
historyNavRun.addEventListener("click", () => (window.location.href = "/run"));
historyNavHistory.addEventListener("click", () => (window.location.href = "/history"));
historyNavProfile.addEventListener("click", () => (window.location.href = "/profile"));

loadHistory();