const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const createToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set.");
  }
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};

const buildUserPayload = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name || "",
});

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    name: name?.trim() || "",
  });

  const token = createToken(user._id);
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

  const token = createToken(user._id);
  res.json({ token, user: buildUserPayload(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: buildUserPayload(req.user) });
});

module.exports = { register, login, me };
