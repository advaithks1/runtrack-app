const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.makeURunToken;

    if (!token) {
      return res.status(401).json({ message: "Not authorized. Please login." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      userId: decoded.userId
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid or expired session." });
  }
};

module.exports = authMiddleware;