const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const UserSession = require("../models/UserSession");
const Entry = require("../models/Entry");
const Insight = require("../models/Insight");
const WeeklySummary = require("../models/WeeklySummary");
const EntrySignals = require("../derived/models/EntrySignals");
const ConnectionsGraph = require("../derived/models/ConnectionsGraph");
const Cycle = require("../derived/models/Cycle");
const ThemeSeries = require("../derived/models/ThemeSeries");
const ActivityLog = require("../models/ActivityLog");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const buildDefaultSettings = (user) => ({
  userId: user._id,
  profile: {
    displayName: user.name || "",
    bio: "",
    avatarUrl: "",
    gender: "",
    birthdate: "",
  },
  notifications: {
    entryReminders: true,
    emailDigest: true,
    weeklyCheckins: false,
    pushEnabled: false,
  },
  preferences: {
    language: "en",
    timezone: "America/Los_Angeles",
    theme: "system",
    reducedMotion: false,
    textSize: "medium",
  },
  journalingDefaults: {
    promptStyle: "gentle",
    reminderTime: "20:30",
    weeklySummary: true,
  },
  sharingAccess: {
    portalEnabled: false,
    consentGiven: false,
  },
  aiInsights: {
    insightsEnabled: true,
    hiddenTopics: [],
    dataRetention: true,
    explanationsEnabled: true,
  },
  privacy: {
    dataExportEnabled: true,
    deletionRequestedAt: null,
    deletionScheduledFor: null,
  },
  security: {
    twoFactorEnabled: false,
  },
});

const formatSettingsResponse = (user, settings) => ({
  profile: {
    displayName: settings.profile?.displayName || user.name || "",
    username: user.username || "",
    bio: settings.profile?.bio || "",
    avatarUrl: settings.profile?.avatarUrl || "",
    gender: settings.profile?.gender || "",
    birthdate: settings.profile?.birthdate || "",
  },
  settings: {
    notifications: settings.notifications || {},
    preferences: settings.preferences || {},
    journalingDefaults: settings.journalingDefaults || {},
    sharingAccess: settings.sharingAccess || {},
    aiInsights: settings.aiInsights || {},
    privacy: settings.privacy || {},
    security: settings.security || {},
  },
});

const validateUsername = (username) => {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  const isValid = /^[a-z0-9._-]{3,30}$/.test(normalized);
  if (!isValid) {
    return { error: "Username must be 3-30 characters and use letters, numbers, ., _, or -." };
  }
  return { value: normalized };
};

const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create(buildDefaultSettings(user));
  }

  res.json(formatSettingsResponse(user, settings));
});

const updateSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const payload = req.body || {};
  const profileUpdates = payload.profile || {};
  const notifications = payload.notifications || null;
  const preferences = payload.preferences || null;
  const journalingDefaults = payload.journalingDefaults || null;
  const sharingAccess = payload.sharingAccess || null;
  const aiInsights = payload.aiInsights || null;
  const privacy = payload.privacy || null;
  const security = payload.security || null;

  if (profileUpdates.username !== undefined) {
    const rawUsername = String(profileUpdates.username || "").trim();
    if (!rawUsername) {
      user.username = undefined;
    } else {
      const validation = validateUsername(rawUsername);
      if (validation?.error) {
        return res.status(400).json({ message: validation.error });
      }
      if (validation?.value && validation.value !== user.username) {
        const existing = await User.findOne({ username: validation.value });
        if (existing) {
          return res.status(409).json({ message: "Username already in use." });
        }
        user.username = validation.value;
      }
    }
  }

  if (profileUpdates.displayName !== undefined) {
    user.name = profileUpdates.displayName.trim();
  }

  await user.save();

  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create(buildDefaultSettings(user));
  }

  if (profileUpdates.bio !== undefined) settings.profile.bio = profileUpdates.bio;
  if (profileUpdates.avatarUrl !== undefined) settings.profile.avatarUrl = profileUpdates.avatarUrl;
  if (profileUpdates.displayName !== undefined) settings.profile.displayName = profileUpdates.displayName;
  if (profileUpdates.gender !== undefined) settings.profile.gender = profileUpdates.gender;
  if (profileUpdates.birthdate !== undefined) settings.profile.birthdate = profileUpdates.birthdate;

  if (notifications) settings.notifications = { ...settings.notifications, ...notifications };
  if (preferences) settings.preferences = { ...settings.preferences, ...preferences };
  if (journalingDefaults) settings.journalingDefaults = { ...settings.journalingDefaults, ...journalingDefaults };
  if (sharingAccess) settings.sharingAccess = { ...settings.sharingAccess, ...sharingAccess };
  if (aiInsights) settings.aiInsights = { ...settings.aiInsights, ...aiInsights };
  if (privacy) settings.privacy = { ...settings.privacy, ...privacy };
  if (security) settings.security = { ...settings.security, ...security };

  await settings.save();

  res.json(formatSettingsResponse(user, settings));
});

const exportJournalData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const settings = await UserSettings.findOne({ userId: user._id }).lean();
  const entries = await Entry.find({ userId: user._id, deletedAt: null }).lean();

  await ActivityLog.create({
    userId: user._id,
    action: "data_export_requested",
    metadata: { entryCount: entries.length },
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="mindstorm-export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name || "",
      username: user.username || "",
    },
    settings: settings || buildDefaultSettings(user),
    entries,
  });
});

const requestJournalDeletion = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Password is incorrect." });
  }

  const now = new Date();
  const scheduledFor = new Date(now);
  scheduledFor.setMonth(scheduledFor.getMonth() + 6);

  await Entry.updateMany({ userId: user._id, deletedAt: null }, { $set: { deletedAt: now } });
  await Insight.deleteMany({ userId: user._id });
  await WeeklySummary.deleteMany({ userId: user._id });
  await EntrySignals.deleteMany({ userId: user._id });
  await ConnectionsGraph.deleteMany({ userId: user._id });
  await Cycle.deleteMany({ userId: user._id });
  await ThemeSeries.deleteMany({ userId: user._id });

  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create(buildDefaultSettings(user));
  }
  settings.privacy.deletionRequestedAt = now;
  settings.privacy.deletionScheduledFor = scheduledFor;
  await settings.save();

  await UserSession.updateMany(
    { userId: user._id, revokedAt: null, _id: { $ne: req.sessionId } },
    { $set: { revokedAt: now } },
  );

  await ActivityLog.create({
    userId: user._id,
    action: "journal_deletion_requested",
    metadata: { scheduledFor: scheduledFor.toISOString() },
  });

  res.json({
    message: "Journal data deletion scheduled.",
    scheduledFor: scheduledFor.toISOString(),
  });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No avatar uploaded." });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create(buildDefaultSettings(user));
  }

  const relativePath = `/uploads/avatars/${req.file.filename}`;
  settings.profile.avatarUrl = relativePath;
  await settings.save();

  await ActivityLog.create({
    userId: user._id,
    action: "avatar_updated",
    metadata: { path: relativePath },
  });

  res.json(formatSettingsResponse(user, settings));
});

const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create(buildDefaultSettings(user));
  }

  if (settings.profile.avatarUrl) {
    const filePath = path.join(__dirname, "..", "..", settings.profile.avatarUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  settings.profile.avatarUrl = "";
  await settings.save();

  await ActivityLog.create({
    userId: user._id,
    action: "avatar_removed",
  });

  res.json(formatSettingsResponse(user, settings));
});

module.exports = {
  getSettings,
  updateSettings,
  exportJournalData,
  requestJournalDeletion,
  uploadAvatar,
  removeAvatar,
};
