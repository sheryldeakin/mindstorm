const asyncHandler = require("../utils/asyncHandler");
const SnapshotSummary = require("../derived/models/SnapshotSummary");
const ConnectionsGraph = require("../derived/models/ConnectionsGraph");
const EntrySignals = require("../derived/models/EntrySignals");
const WeeklySummary = require("../models/WeeklySummary");
const Entry = require("../models/Entry");

const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

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

const formatRangeLabel = (rangeKey) => {
  if (rangeKey === "last_7_days") return "Last 7 days";
  if (rangeKey === "last_365_days") return "Last 365 days";
  if (rangeKey === "all_time") return "All time";
  if (rangeKey === "last_90_days") return "Last 90 days";
  return "Last 30 days";
};

const toTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const getDateKey = (dateIso) => (dateIso ? dateIso.slice(0, 10) : "");

const getDayLabel = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
  });

const buildWeekPoints = ({ theme, signals }) => {
  const today = new Date();
  const points = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateIso = date.toISOString().slice(0, 10);
    const daySignals = signals.filter((signal) => getDateKey(signal.dateISO) === dateIso);
    const intensities = daySignals
      .map((signal) => {
        const match = (signal.themeIntensities || []).find(
          (item) => item.theme?.toLowerCase() === theme.toLowerCase(),
        );
        if (match) return match.intensity;
        return (signal.themes || []).some((entryTheme) => entryTheme.toLowerCase() === theme.toLowerCase())
          ? 0.6
          : 0;
      })
      .filter((value) => value > 0);
    const avg = intensities.length
      ? Math.round((intensities.reduce((sum, value) => sum + value, 0) / intensities.length) * 100)
      : 0;
    points.push({
      id: dateIso,
      label: getDayLabel(date),
      intensity: avg,
    });
  }
  return points;
};

const buildMonthPoints = ({ theme, signals }) => {
  const today = new Date();
  const points = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7);
    const weekStart = getWeekStartIso(date.toISOString().slice(0, 10));
    const weekSignals = signals.filter((signal) => getWeekStartIso(signal.dateISO) === weekStart);
    const intensities = weekSignals
      .map((signal) => {
        const match = (signal.themeIntensities || []).find(
          (item) => item.theme?.toLowerCase() === theme.toLowerCase(),
        );
        if (match) return match.intensity;
        return (signal.themes || []).some((entryTheme) => entryTheme.toLowerCase() === theme.toLowerCase())
          ? 0.6
          : 0;
      })
      .filter((value) => value > 0);
    const avg = intensities.length
      ? Math.round((intensities.reduce((sum, value) => sum + value, 0) / intensities.length) * 100)
      : 0;
    points.push({
      id: weekStart,
      label: `Wk ${6 - i}`,
      intensity: avg,
    });
  }
  return points;
};

const buildSpanLinks = ({ themeEntries, limit, labelPrefix }) =>
  themeEntries.slice(0, limit).map((entry, index) => ({
    id: `${labelPrefix}-${index}-${entry._id.toString()}`,
    label: entry.title,
    dateRange: entry.date || entry.dateISO || "",
  }));

const buildPatternDetail = ({ theme, rangeKey, signals, entryMap, weeklySummaries }) => {
  const themeSignals = signals.filter((signal) =>
    (signal.themes || []).some((entryTheme) => entryTheme.toLowerCase() === theme.toLowerCase()),
  );
  const themeEntries = themeSignals
    .map((signal) => entryMap.get(signal.entryId.toString()))
    .filter(Boolean);

  const phrases = [];
  themeEntries.forEach((entry) => {
    const text = entry.summary || "";
    text
      .split(/[.!?]/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 12 && chunk.length < 80)
      .forEach((chunk) => {
        if (phrases.length < 3 && !phrases.includes(chunk)) {
          phrases.push(chunk);
        }
      });
  });

  const avgIntensity = themeSignals.length
    ? themeSignals.reduce((sum, signal) => {
        const match = (signal.themeIntensities || []).find(
          (item) => item.theme?.toLowerCase() === theme.toLowerCase(),
        );
        return sum + (match?.intensity ?? 0.6);
      }, 0) / themeSignals.length
    : 0;
  const intensityPct = Math.round(avgIntensity * 100);
  const intensityLabel =
    intensityPct >= 67 ? "High intensity" : intensityPct >= 34 ? "Moderate intensity" : "Low intensity";

  const weekPoints = buildWeekPoints({ theme, signals });
  const monthPoints = buildMonthPoints({ theme, signals });

  const impactCounts = new Map();
  weeklySummaries.forEach((week) => {
    (week.summary?.impactAreas || []).forEach((item) => {
      const key = item.trim();
      if (!key) return;
      impactCounts.set(key, (impactCounts.get(key) || 0) + 1);
    });
  });
  const lifeAreas = Array.from(impactCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count], index) => ({
      id: `life-${index}`,
      label,
      detail: `Shows up across ${count} week${count === 1 ? "" : "s"} in this range.`,
      score: Math.min(100, 30 + count * 15),
    }));

  const influenceBuckets = [
    { label: "Sleep quality", keywords: ["sleep", "rest", "tired", "insomnia"] },
    { label: "Stress load", keywords: ["stress", "overwhelmed", "pressure"] },
    { label: "Medication changes", keywords: ["medication", "meds", "dose"] },
    { label: "Substances", keywords: ["caffeine", "alcohol", "substance"] },
    { label: "Physical health", keywords: ["health", "sick", "pain", "ill"] },
    { label: "Life events", keywords: ["event", "travel", "family", "work"] },
  ];
  const influenceCounts = new Map();
  themeEntries.forEach((entry) => {
    const text = `${entry.title} ${entry.summary}`.toLowerCase();
    influenceBuckets.forEach((bucket) => {
      if (bucket.keywords.some((word) => text.includes(word))) {
        influenceCounts.set(bucket.label, (influenceCounts.get(bucket.label) || 0) + 1);
      }
    });
  });
  weeklySummaries.forEach((week) => {
    (week.summary?.relatedInfluences || []).forEach((item) => {
      const key = item.trim();
      if (!key) return;
      influenceCounts.set(key, (influenceCounts.get(key) || 0) + 1);
    });
  });
  const influences = Array.from(influenceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count], index) => ({
      id: `influence-${index}`,
      label,
      detail: "Often mentioned alongside this pattern.",
      direction: "up",
      confidence: Math.min(100, 40 + count * 12),
    }));

  const userTagged = new Map();
  themeEntries.forEach((entry) => {
    (entry.triggers || []).forEach((item) => {
      const key = item.trim();
      if (!key) return;
      userTagged.set(key, (userTagged.get(key) || 0) + 1);
    });
    (entry.tags || []).forEach((item) => {
      const key = item.trim();
      if (!key) return;
      userTagged.set(key, (userTagged.get(key) || 0) + 1);
    });
  });
  const userTaggedList = Array.from(userTagged.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  const suggestedPool = ["Short walk", "Hydration check-in", "Breath reset", "Gentle stretch"];
  const suggested = suggestedPool.filter((item) => !userTaggedList.includes(item)).slice(0, 3);

  const questionCounts = new Map();
  weeklySummaries.forEach((week) => {
    (week.summary?.questionsToExplore || []).forEach((item) => {
      const key = item.trim();
      if (!key) return;
      questionCounts.set(key, (questionCounts.get(key) || 0) + 1);
    });
  });
  const exploreQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  const paraphrase =
    influences.length > 0
      ? `When ${theme} shows up, it tends to appear alongside ${influences
          .slice(0, 2)
          .map((item) => item.label.toLowerCase())
          .join(" and ")}.`
      : `When ${theme} shows up, it tends to stand out across your entries.`;

  return {
    id: theme,
    title: toTitleCase(theme),
    summary: `Patterns around ${theme} show up across recent entries.`,
    phrases: phrases.length ? phrases : [`${toTitleCase(theme)} shows up in your writing.`],
    paraphrase,
    rangeLabel: formatRangeLabel(rangeKey),
    intensityLabel,
    timeline: {
      week: {
        scaleLabel: "Past 7 days",
        points: weekPoints,
        spanLinks: buildSpanLinks({ themeEntries, limit: 3, labelPrefix: "week" }),
      },
      month: {
        scaleLabel: "Past 6 weeks",
        points: monthPoints,
        spanLinks: buildSpanLinks({ themeEntries, limit: 2, labelPrefix: "month" }),
      },
    },
    lifeAreas,
    influences,
    copingStrategies: {
      userTagged: userTaggedList,
      suggested,
    },
    exploreQuestions,
  };
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
  const rangeKey = req.query.rangeKey;
  const today = new Date();
  const endIso = today.toISOString().slice(0, 10);
  const startIso = rangeKey ? getRangeStartIso(rangeKey) : null;
  let query = { userId: req.user._id };

  if (startIso) {
    const weekStartIso = getWeekStartIso(startIso);
    query = {
      userId: req.user._id,
      weekStartISO: { $gte: weekStartIso, $lte: endIso },
    };
  } else if (!rangeKey) {
    const rangeDaysRaw = Number(req.query.rangeDays);
    const rangeDays = Number.isFinite(rangeDaysRaw) && rangeDaysRaw > 0 ? rangeDaysRaw : 56;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (rangeDays - 1));
    const startDateIso = startDate.toISOString().slice(0, 10);
    const weekStartIso = getWeekStartIso(startDateIso);
    query = {
      userId: req.user._id,
      weekStartISO: { $gte: weekStartIso, $lte: endIso },
    };
  }

  const weeklySummaries = await WeeklySummary.find(query).sort({ weekStartISO: 1 }).lean();

  res.json({
    weeklySummaries: weeklySummaries.map((item) => ({
      weekStartISO: item.weekStartISO,
      weekEndISO: item.weekEndISO,
      summary: item.summary || null,
    })),
  });
});

const toLabel = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const pickEntryQuote = (entry) => {
  const pools = [
    ...(entry.evidenceBySection?.recurringExperiences || []),
    ...(entry.evidenceBySection?.relatedInfluences || []),
    ...(entry.evidenceBySection?.impactAreas || []),
  ];
  const quote = pools.find((item) => item && item.trim()) || entry.summary;
  return quote ? quote.trim() : "";
};

const getConnectionsGraph = asyncHandler(async (req, res) => {
  const rangeKey = req.query.rangeKey || "last_30_days";
  const graph = await ConnectionsGraph.findOne({
    userId: req.user._id,
    rangeKey,
    stale: false,
  }).lean();

  const fallback = await ConnectionsGraph.findOne({
    userId: req.user._id,
    rangeKey,
  }).lean();

  const activeGraph = graph || fallback;
  if (!activeGraph) {
    return res.json({ graph: { nodes: [], edges: [] }, stale: true });
  }

  const entryIds = new Set();
  activeGraph.edges.forEach((edge) => {
    (edge.evidenceEntryIds || []).forEach((id) => entryIds.add(id));
  });

  const entries = await Entry.find({ _id: { $in: Array.from(entryIds) }, userId: req.user._id }).lean();
  const entryMap = new Map(entries.map((entry) => [entry._id.toString(), entry]));

  const edges = activeGraph.edges.map((edge) => {
    const evidence = (edge.evidenceEntryIds || [])
      .map((id) => entryMap.get(id))
      .filter(Boolean)
      .slice(0, 3)
      .map((entry) => ({
        id: entry._id.toString(),
        quote: pickEntryQuote(entry),
        source: `Entry: ${entry.title}`,
      }))
      .filter((item) => item.quote);

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: `${toLabel(edge.from)} <-> ${toLabel(edge.to)}`,
      strength: edge.weight || 0,
      evidence,
    };
  });

  res.json({
    graph: {
      nodes: activeGraph.nodes || [],
      edges,
    },
    stale: Boolean(activeGraph.stale),
  });
});

const getPatterns = asyncHandler(async (req, res) => {
  const rangeKey = req.query.rangeKey || "last_30_days";
  const patternId = req.query.patternId;
  const startIso = getRangeStartIso(rangeKey);
  const entryQuery = startIso ? { userId: req.user._id, dateISO: { $gte: startIso } } : { userId: req.user._id };
  const entries = await Entry.find(entryQuery)
    .sort({ dateISO: 1 })
    .lean();
  const signalQuery = startIso ? { userId: req.user._id, dateISO: { $gte: startIso } } : { userId: req.user._id };
  const signals = await EntrySignals.find(signalQuery)
    .sort({ dateISO: 1 })
    .lean();
  const weeklyQuery = startIso
    ? {
        userId: req.user._id,
        weekStartISO: { $gte: startIso },
      }
    : { userId: req.user._id };
  const weeklySummaries = await WeeklySummary.find(weeklyQuery).sort({ weekStartISO: 1 }).lean();

  const entryMap = new Map(entries.map((entry) => [entry._id.toString(), entry]));
  const themeCounts = new Map();
  signals.forEach((signal) => {
    (signal.themes || []).forEach((theme) => {
      const key = theme.trim().toLowerCase();
      if (!key) return;
      themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
    });
  });
  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  const patterns = topThemes.map((theme, index) => ({
    id: theme,
    title: toTitleCase(theme),
    description: `Patterns around ${theme} show up across recent entries.`,
    trend: index === 0 ? "up" : index === 1 ? "steady" : "down",
    confidence: themeCounts.get(theme) >= 8 ? "high" : themeCounts.get(theme) >= 4 ? "medium" : "low",
    sparkline: buildWeekPoints({ theme, signals }).map((point) => point.intensity),
  }));

  const selectedTheme = patternId && topThemes.includes(patternId) ? patternId : topThemes[0];
  const detail = selectedTheme
    ? buildPatternDetail({ theme: selectedTheme, rangeKey, signals, entryMap, weeklySummaries })
    : null;

  res.json({ patterns, detail });
});

module.exports = { getSnapshot, getWeeklySummaries, getConnectionsGraph, getPatterns };
