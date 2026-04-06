const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("makeURunToken", token, {
    httpOnly: true,
    secure: isProduction, // true on Render / HTTPS
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        message: "User ID and Password are required"
      });
    }

    const cleanUserId = String(userId).trim();
    const cleanPassword = String(password).trim();

    if (cleanUserId.length < 3) {
      return res.status(400).json({
        message: "User ID must be at least 3 characters"
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await User.findOne({ userId: cleanUserId });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const newUser = new User({
      userId: cleanUserId,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        userId: newUser.userId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: newUser._id,
        userId: newUser.userId
      }
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({
      message: "Server error during registration"
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        message: "User ID and Password are required"
      });
    }

    const cleanUserId = String(userId).trim();
    const cleanPassword = String(password).trim();

    const user = await User.findOne({ userId: cleanUserId });

    if (!user) {
      return res.status(401).json({
        message: "Invalid User ID or Password"
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid User ID or Password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        userId: user.userId
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      message: "Server error during login"
    });
  }
});

// Logout
router.post("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("makeURunToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax"
  });

  res.status(200).json({
    message: "Logged out successfully"
  });
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        loggedIn: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      loggedIn: true,
      user: {
        id: user._id,
        userId: user.userId
      }
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    res.status(500).json({
      message: "Server error while loading profile"
    });
  }
});

module.exports = router;