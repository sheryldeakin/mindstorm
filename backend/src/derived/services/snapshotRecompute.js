const SnapshotSummary = require("../models/SnapshotSummary");
const Entry = require("../../models/Entry");

const getRangeStartIso = (rangeKey) => {
  if (rangeKey === "all_time") return null;
  const days =
    rangeKey === "last_365_days"
      ? 365
      : rangeKey === "last_90_days"
        ? 90
        : rangeKey === "last_7_days"
          ? 7
          : 30;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return start.toISOString().slice(0, 10);
};

const formatList = (items) => {
  const filtered = items.filter((item) => item && item.trim());
  if (!filtered.length) return "";
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered[0]}, ${filtered[1]}, and ${filtered[2]}`;
};

const collectTopItems = (weeklySummaries, field, limit, exclude = new Set()) => {
  const counts = new Map();
  const originals = new Map();
  weeklySummaries.forEach((week) => {
    const items = week.summary?.[field] || [];
    items.forEach((item) => {
      const normalized = item.trim().toLowerCase();
      if (!normalized) return;
      if (exclude.has(normalized)) return;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
      if (!originals.has(normalized)) originals.set(normalized, item.trim());
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => originals.get(key));
};

const buildSnapshot = (entries, rangeKey, weeklySummaries) => {
  const themeCounts = new Map();
  const helpHints = new Map();
  const sparkline = [42, 48, 54, 58, 53, 60, 56];

  entries.forEach((entry) => {
    (entry.themes || []).forEach((theme) => {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    });
    const summary = (entry.summary || "").toLowerCase();
    if (summary.includes("walk")) helpHints.set("Morning walk", true);
    if (summary.includes("breath")) helpHints.set("Breath reset", true);
    if (summary.includes("sleep")) helpHints.set("Sleep routine", true);
    if (summary.includes("stretch")) helpHints.set("Stretch break", true);
    if (summary.includes("sunlight")) helpHints.set("Sunlight break", true);
  });

  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);

  const patterns = topThemes.map((theme, index) => ({
    id: `theme-${index}`,
    title: theme.replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Patterns around ${theme} show up across recent entries.`,
    trend: index === 0 ? "up" : index === 1 ? "steady" : "down",
    confidence: index === 0 ? "high" : index === 1 ? "medium" : "low",
    sparkline,
  }));

  const impactAreas = collectTopItems(weeklySummaries, "impactAreas", 3);
  const impactSet = new Set(impactAreas.map((item) => item.toLowerCase()));
  const influences = collectTopItems(weeklySummaries, "relatedInfluences", 3, impactSet);
  const openQuestions = collectTopItems(weeklySummaries, "questionsToExplore", 3);
  const snapshotParts = [];
  if (topThemes.length) {
    snapshotParts.push(
      `Lately, your writing often touches on ${formatList(topThemes.slice(0, 3))}.`,
    );
  }
  if (impactAreas.length) {
    snapshotParts.push(`These experiences seem to affect ${formatList(impactAreas)}.`);
  }
  if (influences.length) {
    snapshotParts.push(`Things like ${formatList(influences)} come up alongside these moments.`);
  }

  return {
    rangeKey,
    entryCount: entries.length,
    snapshotOverview: snapshotParts.join(" "),
    patterns,
    impactAreas,
    influences,
    openQuestions,
    timeRangeSummary: {
      weekOverWeekDelta: "Trends are stabilizing across recent entries.",
      missingSignals: entries.length < 3 ? ["Not enough entries for strong patterns yet."] : [],
    },
    whatHelped: Array.from(helpHints.keys()).slice(0, 4),
    prompts: [
      "Which moment felt most steady this week?",
      "What would make tomorrow 10% softer?",
    ],
  };
};

const recomputeSnapshotForUser = async ({ userId, rangeKey }) => {
  const startIso = getRangeStartIso(rangeKey);
  const endIso = new Date().toISOString().slice(0, 10);
  const entryQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const entries = await Entry.find(entryQuery)
    .sort({ dateISO: 1 })
    .lean();
  const WeeklySummary = require("../../models/WeeklySummary");
  const weeklyQuery = startIso
    ? { userId, weekStartISO: { $gte: startIso, $lte: endIso } }
    : { userId };
  const weeklySummaries = await WeeklySummary.find(weeklyQuery).sort({ weekStartISO: 1 }).lean();
  const snapshot = buildSnapshot(entries, rangeKey, weeklySummaries);
  const sourceVersion = entries[entries.length - 1]?.updatedAt || new Date();

  await SnapshotSummary.findOneAndUpdate(
    { userId, rangeKey },
    {
      userId,
      rangeKey,
      snapshot,
      computedAt: new Date(),
      sourceVersion,
      stale: false,
    },
    { upsert: true, new: true },
  );
};

const recomputeStaleSnapshots = async () => {
  const stale = await SnapshotSummary.find({ stale: true }).lean();
  const userRangePairs = new Map();
  stale.forEach((doc) => {
    userRangePairs.set(`${doc.userId}:${doc.rangeKey}`, { userId: doc.userId, rangeKey: doc.rangeKey });
  });

  for (const pair of userRangePairs.values()) {
    await recomputeSnapshotForUser(pair);
  }
};

module.exports = { recomputeStaleSnapshots, recomputeSnapshotForUser };
