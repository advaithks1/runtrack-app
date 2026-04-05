const express = require("express");
const Run = require("../models/Run");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Save a run
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { distanceKm, durationSec, calories, avgPaceMinPerKm, routePoints } = req.body;

    const newRun = new Run({
      userId: req.user.userId,
      distanceKm: Number(distanceKm) || 0,
      durationSec: Number(durationSec) || 0,
      calories: Number(calories) || 0,
      avgPaceMinPerKm: Number(avgPaceMinPerKm) || 0,
      routePoints: Array.isArray(routePoints) ? routePoints : []
    });

    await newRun.save();

    res.status(201).json({
      message: "Run saved successfully",
      run: newRun
    });
  } catch (error) {
    console.error("Save run error:", error.message);
    res.status(500).json({ message: "Server error while saving run" });
  }
});

// Get all my runs
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.status(200).json({ runs });
  } catch (error) {
    console.error("Fetch runs error:", error.message);
    res.status(500).json({ message: "Server error while fetching runs" });
  }
});

// Get latest run
router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const latestRun = await Run.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });

    if (!latestRun) {
      return res.status(404).json({ message: "No runs found" });
    }

    res.status(200).json({ run: latestRun });
  } catch (error) {
    console.error("Latest run error:", error.message);
    res.status(500).json({ message: "Server error while fetching latest run" });
  }
});

// Delete run
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const run = await Run.findById(req.params.id);

    if (!run) {
      return res.status(404).json({ message: "Run not found" });
    }

    if (run.userId !== req.user.userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Run.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Run deleted successfully" });
  } catch (error) {
    console.error("Delete run error:", error.message);
    res.status(500).json({ message: "Server error while deleting run" });
  }
});

// Dashboard stats
router.get("/stats/overview", authMiddleware, async (req, res) => {
  try {
    const runs = await Run.find({ userId: req.user.userId }).sort({ createdAt: -1 });

    const totalRuns = runs.length;
    const totalDistanceKm = runs.reduce((sum, run) => sum + (run.distanceKm || 0), 0);
    const totalCalories = runs.reduce((sum, run) => sum + (run.calories || 0), 0);
    const totalDurationSec = runs.reduce((sum, run) => sum + (run.durationSec || 0), 0);
    const longestRunKm = runs.reduce((max, run) => Math.max(max, run.distanceKm || 0), 0);

    const weeklyDistanceKm = calculateWeeklyDistance(runs);
    const streakDays = calculateStreak(runs);

    res.status(200).json({
      totalRuns,
      totalDistanceKm,
      totalCalories,
      totalDurationSec,
      longestRunKm,
      weeklyDistanceKm,
      streakDays
    });
  } catch (error) {
    console.error("Overview stats error:", error.message);
    res.status(500).json({ message: "Server error while fetching stats" });
  }
});

function calculateWeeklyDistance(runs) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return runs.reduce((sum, run) => {
    const runDate = new Date(run.createdAt);
    return runDate >= sevenDaysAgo ? sum + (run.distanceKm || 0) : sum;
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
      // allow today to be empty if no run today but ran yesterday
      if (i === 0) {
        continue;
      }
      break;
    }
  }

  return streak;
}

module.exports = router;