const mongoose = require("mongoose");

const runSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true
    },
    distanceKm: {
      type: Number,
      required: true,
      default: 0
    },
    durationSec: {
      type: Number,
      required: true,
      default: 0
    },
    calories: {
      type: Number,
      required: true,
      default: 0
    },
    avgPaceMinPerKm: {
      type: Number,
      required: true,
      default: 0
    },
    routePoints: [
      {
        lat: Number,
        lng: Number,
        timestamp: Number
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Run", runSchema);