const SnapshotSummary = require("../models/SnapshotSummary");
const Entry = require("../../models/Entry");
const EntrySignals = require("../models/EntrySignals");
const ThemeSeries = require("../models/ThemeSeries");
const WeeklySummary = require("../../models/WeeklySummary");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");

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

const buildDateList = (startIso, endIso) => {
  const dates = [];
  if (!startIso || !endIso) return dates;
  const [startYear, startMonth, startDay] = startIso.split("-").map((value) => Number(value));
  const [endYear, endMonth, endDay] = endIso.split("-").map((value) => Number(value));
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  for (let date = start; date <= end; date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
};

const toTitleCase = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

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

const collectTopFromSignals = (signals, field, limit, exclude = new Set()) => {
  const counts = new Map();
  const originals = new Map();
  signals.forEach((signal) => {
    const items = signal[field] || [];
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

const compressSeries = (points, maxPoints = 12) => {
  if (points.length <= maxPoints) return points;
  const bucketSize = Math.ceil(points.length / maxPoints);
  const compressed = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avgIntensity = slice.reduce((sum, point) => sum + point.intensity, 0) / slice.length;
    const avgConfidence = slice.reduce((sum, point) => sum + (point.confidence || 0.6), 0) / slice.length;
    compressed.push({ intensity: avgIntensity, confidence: avgConfidence });
  }
  return compressed;
};

const computeTrend = (series) => {
  if (!series.length) return "steady";
  const chunk = Math.max(1, Math.floor(series.length / 3));
  const first = series.slice(0, chunk);
  const last = series.slice(series.length - chunk);
  const avg = (arr) => arr.reduce((sum, value) => sum + value, 0) / arr.length;
  const firstAvg = avg(first);
  const lastAvg = avg(last);
  const epsilon = 0.05;
  if (lastAvg > firstAvg + epsilon) return "up";
  if (lastAvg < firstAvg - epsilon) return "down";
  return "steady";
};

const computeConfidence = (points) => {
  if (!points.length) return "low";
  const active = points.filter((point) => point.intensity > 0);
  const coverage = active.length / points.length;
  const avgConf = active.length
    ? active.reduce((sum, point) => sum + (point.confidence || 0.6), 0) / active.length
    : 0;

  if (coverage >= 0.4 || avgConf >= 0.75) return "high";
  if (coverage >= 0.2 || avgConf >= 0.55) return "medium";
  return "low";
};

const buildFallbackSeries = (entries, dates, topThemes) => {
  const dayThemeMap = new Map();
  entries.forEach((entry) => {
    if (!entry.dateISO) return;
    if (!dayThemeMap.has(entry.dateISO)) {
      dayThemeMap.set(entry.dateISO, new Map());
    }
    const themeMap = dayThemeMap.get(entry.dateISO);
    const themeIntensities = Array.isArray(entry.themeIntensities) && entry.themeIntensities.length
      ? entry.themeIntensities
      : [];

    if (themeIntensities.length) {
      themeIntensities.forEach((item) => {
        if (!item?.theme) return;
        const key = item.theme.trim().toLowerCase();
        if (!key) return;
        const prev = themeMap.get(key) || { intensity: 0, confidence: 0.6 };
        themeMap.set(key, { intensity: Math.min(1, prev.intensity + (Number(item.intensity) || 0)), confidence: 0.6 });
      });
    } else if (Array.isArray(entry.themes)) {
      entry.themes.forEach((theme) => {
        const key = theme.trim().toLowerCase();
        if (!key) return;
        const prev = themeMap.get(key) || { intensity: 0, confidence: 0.6 };
        themeMap.set(key, { intensity: Math.min(1, prev.intensity + 1), confidence: 0.6 });
      });
    }
  });

  const seriesByTheme = new Map();
  topThemes.forEach((theme) => {
    const points = dates.map((dateISO) => {
      const themeMap = dayThemeMap.get(dateISO);
      const value = themeMap?.get(theme);
      const intensity = value?.intensity || 0;
      const confidence = intensity > 0 ? value?.confidence || 0.6 : 0.2;
      return { intensity, confidence };
    });
    seriesByTheme.set(theme, points);
  });

  return seriesByTheme;
};

const buildSnapshot = ({ entries, rangeKey, weeklySummaries, seriesDocs, signals }) => {
  const helpHints = new Map();
  const themeTotals = new Map();

  entries.forEach((entry) => {
    const summary = (entry.summary || "").toLowerCase();
    if (summary.includes("walk")) helpHints.set("Morning walk", true);
    if (summary.includes("breath")) helpHints.set("Breath reset", true);
    if (summary.includes("sleep")) helpHints.set("Sleep routine", true);
    if (summary.includes("stretch")) helpHints.set("Stretch break", true);
    if (summary.includes("sunlight")) helpHints.set("Sunlight break", true);
  });

  seriesDocs.forEach((doc) => {
    const total = doc.points?.reduce((sum, point) => sum + (point.intensity || 0), 0) || 0;
    themeTotals.set(doc.theme, total);
  });

  const topThemes = Array.from(themeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);

  let seriesByTheme = new Map();
  const endIso = new Date().toISOString().slice(0, 10);
  const startIso = getRangeStartIso(rangeKey) || entries[0]?.dateISO || endIso;
  const dates = buildDateList(startIso, endIso);

  if (seriesDocs.length && topThemes.length) {
    topThemes.forEach((theme) => {
      const seriesDoc = seriesDocs.find((doc) => doc.theme === theme);
      if (!seriesDoc) return;
      const points = (seriesDoc.points || []).map((point) => ({
        intensity: point.intensity || 0,
        confidence: point.confidence || 0.6,
      }));
      seriesByTheme.set(theme, points);
    });
  }

  if (!seriesDocs.length) {
    const themeCounts = new Map();
    entries.forEach((entry) => {
      (entry.themes || []).forEach((theme) => {
        const key = theme.trim().toLowerCase();
        if (!key) return;
        themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
      });
    });
    const fallbackThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);
    topThemes.splice(0, topThemes.length, ...fallbackThemes);
    seriesByTheme = buildFallbackSeries(entries, dates, fallbackThemes);
  }

  const patterns = topThemes.map((theme, index) => {
    const rawPoints = seriesByTheme.get(theme) || [];
    const compressed = compressSeries(rawPoints);
    const sparkline = compressed.map((point) => point.intensity);
    const trend = computeTrend(rawPoints.map((point) => point.intensity));
    const confidence = computeConfidence(rawPoints);

    return {
      id: `theme-${index}`,
      title: toTitleCase(theme),
      description: `Patterns around ${theme} show up across recent entries.`,
      trend,
      confidence,
      sparkline,
    };
  });

  const impactAreas = collectTopFromSignals(signals, "lifeAreas", 3);
  const impactSet = new Set(impactAreas.map((item) => item.toLowerCase()));
  const influences = collectTopFromSignals(signals, "influences", 3, impactSet);

  const weeklyImpact = !impactAreas.length ? collectTopItems(weeklySummaries, "impactAreas", 3) : [];
  const weeklyInfluences = !influences.length
    ? collectTopItems(weeklySummaries, "relatedInfluences", 3, new Set(weeklyImpact.map((item) => item.toLowerCase())))
    : [];

  const finalImpactAreas = impactAreas.length ? impactAreas : weeklyImpact;
  const finalInfluences = influences.length ? influences : weeklyInfluences;
  const openQuestions = collectTopItems(weeklySummaries, "questionsToExplore", 3);

  const snapshotParts = [];
  if (topThemes.length) {
    snapshotParts.push(`Lately, your writing often touches on ${formatList(topThemes.slice(0, 3))}.`);
  }
  if (finalImpactAreas.length) {
    snapshotParts.push(`These experiences seem to affect ${formatList(finalImpactAreas)}.`);
  }
  if (finalInfluences.length) {
    snapshotParts.push(`Things like ${formatList(finalInfluences)} come up alongside these moments.`);
  }

  const missingSignals = [];
  if (!seriesDocs.length) {
    missingSignals.push("Theme trends are still forming.");
  }
  if (entries.length < 3) {
    missingSignals.push("Not enough entries for strong patterns yet.");
  }

  return {
    rangeKey,
    entryCount: entries.length,
    snapshotOverview: snapshotParts.join(" "),
    patterns,
    impactAreas: finalImpactAreas,
    influences: finalInfluences,
    openQuestions,
    timeRangeSummary: {
      weekOverWeekDelta: "Trends are stabilizing across recent entries.",
      missingSignals,
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
  const entries = await Entry.find({ ...entryQuery, deletedAt: null })
    .sort({ dateISO: 1 })
    .lean();

  const signalQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const signals = await EntrySignals.find(signalQuery).sort({ dateISO: 1 }).lean();

  const weeklyQuery = startIso
    ? { userId, weekStartISO: { $gte: startIso, $lte: endIso } }
    : { userId };
  const weeklySummaries = await WeeklySummary.find(weeklyQuery).sort({ weekStartISO: 1 }).lean();

  const seriesDocs = await ThemeSeries.find({ userId, rangeKey }).lean();

  const snapshot = buildSnapshot({ entries, rangeKey, weeklySummaries, seriesDocs, signals });
  const sourceVersion = await computeSourceVersionForRange(userId, rangeKey);

  await SnapshotSummary.findOneAndUpdate(
    { userId, rangeKey },
    {
      userId,
      rangeKey,
      snapshot,
      computedAt: new Date(),
      pipelineVersion: PIPELINE_VERSION.snapshot,
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
