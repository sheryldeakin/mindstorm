const asyncHandler = require("../utils/asyncHandler");
const ActivityLog = require("../models/ActivityLog");

/**
 * List recent activity log entries for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { activity }.
 */
const listActivity = asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const logs = await ActivityLog.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    activity: logs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      metadata: log.metadata || {},
      createdAt: log.createdAt,
    })),
  });
});

/**
 * Clear activity log entries for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with a status message.
 */
const clearActivity = asyncHandler(async (req, res) => {
  await ActivityLog.deleteMany({ userId: req.user._id });
  res.json({ message: "Activity log cleared." });
});

module.exports = { listActivity, clearActivity };
