const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const ActivityLog = require("../models/ActivityLog");
const asyncHandler = require("../utils/asyncHandler");

const createToken = (userId, sessionId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set.");
  }
  return jwt.sign({ id: userId, sid: sessionId }, secret, { expiresIn: "7d" });
};

const buildUserPayload = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name || "",
  username: user.username || "",
});

const register = asyncHandler(async (req, res) => {
  const { email, password, name, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const normalizedUsername = username?.trim()?.toLowerCase();
  if (normalizedUsername) {
    const isValid = /^[a-z0-9._-]{3,30}$/.test(normalizedUsername);
    if (!isValid) {
      return res.status(400).json({ message: "Username must be 3-30 characters and use letters, numbers, ., _, or -." });
    }
    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already in use." });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    name: name?.trim() || "",
    username: normalizedUsername || undefined,
  });

  const session = await UserSession.create({
    userId: user._id,
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip || "",
  });
  user.lastLoginAt = new Date();
  await user.save();

  await ActivityLog.create({ userId: user._id, action: "user_registered" });

  const token = createToken(user._id, session._id);
  res.status(201).json({ token, user: buildUserPayload(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const session = await UserSession.create({
    userId: user._id,
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip || "",
  });
  user.lastLoginAt = new Date();
  await user.save();

  await ActivityLog.create({ userId: user._id, action: "user_logged_in" });

  const token = createToken(user._id, session._id);
  res.json({ token, user: buildUserPayload(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password is incorrect." });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  await ActivityLog.create({ userId: user._id, action: "password_changed" });
  res.json({ message: "Password updated." });
});

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await UserSession.find({ userId: req.user._id })
    .sort({ lastSeenAt: -1 })
    .lean();

  res.json({
    currentSessionId: req.sessionId || null,
    sessions: sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent || "",
      ipAddress: session.ipAddress || "",
      lastSeenAt: session.lastSeenAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
    })),
  });
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await UserSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
    revokedAt: null,
  });

  if (!session) {
    return res.status(404).json({ message: "Session not found." });
  }

  session.revokedAt = new Date();
  await session.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: "session_revoked",
    metadata: { sessionId: session._id.toString() },
  });

  res.json({ message: "Session revoked." });
});

const revokeOtherSessions = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(400).json({ message: "Current session not found." });
  }

  const result = await UserSession.updateMany(
    {
      userId: req.user._id,
      revokedAt: null,
      _id: { $ne: req.sessionId },
    },
    { $set: { revokedAt: new Date() } },
  );

  await ActivityLog.create({
    userId: req.user._id,
    action: "sessions_revoked_other",
    metadata: { count: result.modifiedCount || 0 },
  });

  res.json({ message: "Other sessions revoked.", count: result.modifiedCount || 0 });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: buildUserPayload(req.user) });
});

module.exports = {
  register,
  login,
  changePassword,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  me,
};
