const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserSession = require("../models/UserSession");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Invalid auth token." });
    }

    if (decoded.sid) {
      const session = await UserSession.findOne({
        _id: decoded.sid,
        userId: user._id,
        revokedAt: null,
      });
      if (!session) {
        return res.status(401).json({ message: "Session expired." });
      }
      session.lastSeenAt = new Date();
      await session.save();
      req.sessionId = session._id.toString();
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid auth token." });
  }
};

module.exports = { protect };
