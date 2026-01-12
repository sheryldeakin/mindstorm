const Entry = require("../models/Entry");
const Insight = require("../models/Insight");
const asyncHandler = require("../utils/asyncHandler");

const buildInsights = (entries) => {
  if (!entries.length) return [];

  const tagCounts = entries.reduce((acc, entry) => {
    (entry.tags || []).forEach((tag) => {
      const normalized = tag.toLowerCase();
      acc[normalized] = (acc[normalized] || 0) + 1;
    });
    return acc;
  }, {});

  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

  const recent = entries.slice(0, 5);
  const previous = entries.slice(5, 10);

  const averagePositive = (segment) => {
    const values = segment.flatMap((entry) =>
      (entry.emotions || [])
        .filter((emotion) => emotion.tone === "positive")
        .map((emotion) => emotion.intensity || 0),
    );
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const recentPositive = averagePositive(recent);
  const previousPositive = averagePositive(previous);
  let positiveTrend = "steady";
  if (recentPositive > previousPositive + 5) positiveTrend = "up";
  if (recentPositive < previousPositive - 5) positiveTrend = "down";

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const entriesThisWeek = entries.filter((entry) => entry.createdAt?.getTime() >= weekAgo).length;
  const entriesLastWeek = entries.filter(
    (entry) => entry.createdAt?.getTime() >= twoWeeksAgo && entry.createdAt?.getTime() < weekAgo,
  ).length;

  let cadenceTrend = "steady";
  if (entriesThisWeek > entriesLastWeek) cadenceTrend = "up";
  if (entriesThisWeek < entriesLastWeek) cadenceTrend = "down";

  const insights = [];

  if (topTag) {
    insights.push({
      title: `Top theme: ${topTag[0]}`,
      description: `${topTag[1]} entries mention this lately.`,
      trend: "steady",
    });
  }

  insights.push({
    title: "Positive tone check",
    description:
      recentPositive > 0
        ? `Average positive intensity is ${Math.round(recentPositive)}.`
        : "No positive tone data yet.",
    trend: positiveTrend,
  });

  insights.push({
    title: "Reflection cadence",
    description: `${entriesThisWeek} entries logged in the last 7 days.`,
    trend: cadenceTrend,
  });

  return insights;
};

const listInsights = asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  const insights = await Insight.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const formatted = insights.map((insight) => ({
    id: insight._id.toString(),
    title: insight.title,
    description: insight.description,
    trend: insight.trend,
  }));

  res.json({ insights: formatted });
});

const refreshInsights = asyncHandler(async (req, res) => {
  const entries = await Entry.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const insightsPayload = buildInsights(entries);

  await Insight.deleteMany({ userId: req.user._id });

  const savedInsights = await Insight.insertMany(
    insightsPayload.map((insight) => ({
      ...insight,
      userId: req.user._id,
    })),
  );

  const formatted = savedInsights.map((insight) => ({
    id: insight._id.toString(),
    title: insight.title,
    description: insight.description,
    trend: insight.trend,
  }));

  res.json({ insights: formatted });
});

module.exports = { listInsights, refreshInsights };
