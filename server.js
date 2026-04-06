const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy (important for Render / reverse proxy / secure cookies)
app.set("trust proxy", 1);

// =============================
// Middlewares
// =============================
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =============================
// Serve static files from /public
// =============================
app.use(express.static(path.join(__dirname, "public")));

// =============================
// API Routes
// =============================
const authRoutes = require("./routes/auth");
const runRoutes = require("./routes/run");

app.use("/api/auth", authRoutes);
app.use("/api/runs", runRoutes);

// =============================
// Static Page Routes (optional but useful)
// These support clean URLs like /home as well as /home.html
// =============================
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

// =============================
// Health Check
// =============================
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Server is running"
  });
});

// =============================
// 404 for unknown API routes only
// =============================
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});

// =============================
// Fallback for unknown non-API routes
// IMPORTANT: do NOT return 404 here
// =============================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// Start server after MongoDB connects
// =============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Make U Run running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });