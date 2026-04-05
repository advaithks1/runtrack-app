const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// Routes
const authRoutes = require("./routes/auth");
const runRoutes = require("./routes/run");

app.use("/api/auth", authRoutes);
app.use("/api/runs", runRoutes);

// Static page routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/run", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "run.html"));
});

app.get("/summary", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "summary.html"));
});

app.get("/history", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "history.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Make U Run running on port ${PORT}`);
});