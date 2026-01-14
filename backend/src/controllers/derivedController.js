const asyncHandler = require("../utils/asyncHandler");
const SnapshotSummary = require("../derived/models/SnapshotSummary");
const WeeklySummary = require("../models/WeeklySummary");

const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

const getSnapshot = asyncHandler(async (req, res) => {
  const rangeKey = req.query.rangeKey || "last_30_days";
  const snapshot = await SnapshotSummary.findOne({
    userId: req.user._id,
    rangeKey,
    stale: false,
  }).lean();

  if (snapshot) {
    return res.json({ snapshot: snapshot.snapshot, stale: false });
  }

  const staleSnapshot = await SnapshotSummary.findOne({
    userId: req.user._id,
    rangeKey,
  }).lean();

  if (!staleSnapshot) {
    return res.json({ snapshot: null, stale: true });
  }

  res.json({ snapshot: staleSnapshot.snapshot || null, stale: true });
});

const getWeeklySummaries = asyncHandler(async (req, res) => {
  const rangeDaysRaw = Number(req.query.rangeDays);
  const rangeDays = Number.isFinite(rangeDaysRaw) && rangeDaysRaw > 0 ? rangeDaysRaw : 56;
  const today = new Date();
  const endIso = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (rangeDays - 1));
  const startIso = startDate.toISOString().slice(0, 10);
  const weekStartIso = getWeekStartIso(startIso);

  const weeklySummaries = await WeeklySummary.find({
    userId: req.user._id,
    weekStartISO: { $gte: weekStartIso, $lte: endIso },
  })
    .sort({ weekStartISO: 1 })
    .lean();

  res.json({
    weeklySummaries: weeklySummaries.map((item) => ({
      weekStartISO: item.weekStartISO,
      weekEndISO: item.weekEndISO,
      summary: item.summary || null,
    })),
  });
});

module.exports = { getSnapshot, getWeeklySummaries };
