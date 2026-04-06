const mongoose = require("mongoose");

const routePointSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      default: null,
      min: 0
    },
    timestamp: {
      type: Number,
      required: true,
      default: () => Date.now()
    }
  },
  { _id: false }
);

const runSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    distanceKm: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    durationSec: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    calories: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    avgPaceMinPerKm: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    routePoints: {
      type: [routePointSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Faster latest/history queries per user
runSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Run", runSchema);