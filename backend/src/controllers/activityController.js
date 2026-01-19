const asyncHandler = require("../utils/asyncHandler");
const ActivityLog = require("../models/ActivityLog");

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

const clearActivity = asyncHandler(async (req, res) => {
  await ActivityLog.deleteMany({ userId: req.user._id });
  res.json({ message: "Activity log cleared." });
});

module.exports = { listActivity, clearActivity };
