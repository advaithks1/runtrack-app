const express = require("express");
const Run = require("../models/Run");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function calculateCaloriesFromDistance(distanceKm) {
  // Simple consistent backend estimate
  return Math.round(Math.max(0, Number(distanceKm) || 0) * 62);
}

function calculateAvgSpeedKmh(distanceKm, durationSec) {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeDuration = Math.max(0, Number(durationSec) || 0);

  if (safeDistance <= 0 || safeDuration <= 0) return 0;

  const hours = safeDuration / 3600;
  return Number((safeDistance / hours).toFixed(2));
}

// Save a run
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      distanceKm,
      durationSec,
      calories,
      avgPaceMinPerKm,
      routePoints
    } = req.body;

    const safeDistanceKm = Math.max(0, Number(distanceKm) || 0);
    const safeDurationSec = Math.max(0, Number(durationSec) || 0);
    const safeAvgPace = Math.max(0, Number(avgPaceMinPerKm) || 0);

    // Recalculate calories safely if frontend sends bad value
    const incomingCalories = Math.max(0, Number(calories) || 0);
    const safeCalories =
      incomingCalories > 0 ? incomingCalories : calculateCaloriesFromDistance(safeDistanceKm);

    const safeRoutePoints = Array.isArray(routePoints)
      ? routePoints
          .map((point) => ({
            lat: Number(point?.lat),
            lng: Number(point?.lng),
            timestamp: Number(point?.timestamp) || Date.now()
          }))
          .filter(
            (point) =>
              Number.isFinite(point.lat) &&
              Number.isFinite(point.lng)
          )
      : [];

    const newRun = new Run({
      userId: req.user.userId,
      distanceKm: Number(safeDistanceKm.toFixed(3)),
      durationSec: Math.floor(safeDurationSec),
      calories: Math.round(safeCalories),
      avgPaceMinPerKm: Number(safeAvgPace.toFixed(2)),
      routePoints: safeRoutePoints
    });

    await newRun.save();

    res.status(201).json({
      message: "Run saved successfully",
      run: {
        ...newRun.toObject(),
        avgSpeedKmh: calculateAvgSpeedKmh(newRun.distanceKm, newRun.durationSec)
      }
    });
  } catch (error) {
    console.error("Save run error:", error.message);
    res.status(500).json({
      message: "Server error while saving run"
    });
  }
});

// Get all my runs
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.userId }).sort({
      createdAt: -1
    });

    const formattedRuns = runs.map((run) => ({
      ...run.toObject(),
      avgSpeedKmh: calculateAvgSpeedKmh(run.distanceKm, run.durationSec)
    }));

    res.status(200).json({ runs: formattedRuns });
  } catch (error) {
    console.error("Fetch runs error:", error.message);
    res.status(500).json({
      message: "Server error while fetching runs"
    });
  }
});

// Get latest run
router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const latestRun = await Run.findOne({ userId: req.user.userId }).sort({
      createdAt: -1
    });

    if (!latestRun) {
      return res.status(404).json({
        message: "No runs found"
      });
    }

    res.status(200).json({
      run: {
        ...latestRun.toObject(),
        avgSpeedKmh: calculateAvgSpeedKmh(latestRun.distanceKm, latestRun.durationSec)
      }
    });
  } catch (error) {
    console.error("Latest run error:", error.message);
    res.status(500).json({
      message: "Server error while fetching latest run"
    });
  }
});

// Delete run
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const run = await Run.findById(req.params.id);

    if (!run) {
      return res.status(404).json({
        message: "Run not found"
      });
    }

    if (String(run.userId) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "Not allowed"
      });
    }

    await Run.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Run deleted successfully"
    });
  } catch (error) {
    console.error("Delete run error:", error.message);
    res.status(500).json({
      message: "Server error while deleting run"
    });
  }
});

// Dashboard stats
router.get("/stats/overview", authMiddleware, async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.userId }).sort({
      createdAt: -1
    });

    const totalRuns = runs.length;
    const totalDistanceKm = runs.reduce(
      (sum, run) => sum + (Number(run.distanceKm) || 0),
      0
    );
    const totalCalories = runs.reduce(
      (sum, run) => sum + (Number(run.calories) || 0),
      0
    );
    const totalDurationSec = runs.reduce(
      (sum, run) => sum + (Number(run.durationSec) || 0),
      0
    );
    const longestRunKm = runs.reduce(
      (max, run) => Math.max(max, Number(run.distanceKm) || 0),
      0
    );

    const weeklyDistanceKm = calculateWeeklyDistance(runs);
    const streakDays = calculateStreak(runs);
    const overallAvgSpeedKmh = calculateAvgSpeedKmh(totalDistanceKm, totalDurationSec);

    res.status(200).json({
      totalRuns,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalCalories,
      totalDurationSec,
      longestRunKm: Number(longestRunKm.toFixed(2)),
      weeklyDistanceKm: Number(weeklyDistanceKm.toFixed(2)),
      streakDays,
      overallAvgSpeedKmh
    });
  } catch (error) {
    console.error("Overview stats error:", error.message);
    res.status(500).json({
      message: "Server error while fetching stats"
    });
  }
});

function calculateWeeklyDistance(runs) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return runs.reduce((sum, run) => {
    const runDate = new Date(run.createdAt);
    return runDate >= sevenDaysAgo ? sum + (Number(run.distanceKm) || 0) : sum;
  }, 0);
}

function calculateStreak(runs) {
  if (!runs.length) return 0;

  const uniqueDates = new Set(
    runs.map((run) => {
      const d = new Date(run.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);

    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;

    if (uniqueDates.has(key)) {
      streak++;
    } else {
      // Allow no run today, but continue if yesterday exists
      if (i === 0) {
        continue;
      }
      break;
    }
  }

  return streak;
}

module.exports = router;