const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    profile: {
      displayName: { type: String, default: "" },
      bio: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      gender: { type: String, default: "" },
      birthdate: { type: String, default: "" },
    },
    notifications: {
      entryReminders: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: true },
      weeklyCheckins: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: false },
    },
    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "America/Los_Angeles" },
      theme: { type: String, default: "system" },
      reducedMotion: { type: Boolean, default: false },
      textSize: { type: String, default: "medium" },
    },
    journalingDefaults: {
      promptStyle: { type: String, default: "gentle" },
      reminderTime: { type: String, default: "20:30" },
      weeklySummary: { type: Boolean, default: true },
    },
    sharingAccess: {
      portalEnabled: { type: Boolean, default: false },
      consentGiven: { type: Boolean, default: false },
    },
    aiInsights: {
      insightsEnabled: { type: Boolean, default: true },
      hiddenTopics: { type: [String], default: [] },
      dataRetention: { type: Boolean, default: true },
      explanationsEnabled: { type: Boolean, default: true },
    },
    privacy: {
      dataExportEnabled: { type: Boolean, default: true },
      deletionRequestedAt: { type: Date, default: null },
      deletionScheduledFor: { type: Date, default: null },
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserSettings", userSettingsSchema);
