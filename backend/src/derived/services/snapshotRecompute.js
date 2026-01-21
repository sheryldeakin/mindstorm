const SnapshotSummary = require("../models/SnapshotSummary");
const Entry = require("../../models/Entry");
const EntrySignals = require("../models/EntrySignals");
const ThemeSeries = require("../models/ThemeSeries");
const WeeklySummary = require("../../models/WeeklySummary");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");
const { mergeSummaries } = require("../../utils/ai/summaryMerger");

const parseStringList = (value) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
};

const coerceStringList = (value) => {
  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .map((item) => (typeof item === "string" ? item : item == null ? "" : String(item)))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const parsed = parseStringList(value);
    if (parsed) return coerceStringList(parsed);
    return value ? [value] : [];
  }
  return [];
};

const normalizeNarrativeArrays = (narrative) => {
  const arrayFields = [
    "recurringExperiences",
    "impactAreas",
    "relatedInfluences",
    "unclearAreas",
    "questionsToExplore",
    "intensityLines",
    "highlights",
    "shiftsOverTime",
  ];
  const next = { ...narrative };
  arrayFields.forEach((field) => {
    next[field] = coerceStringList(next[field]);
  });
  return next;
};

/**
 * Returns the dateISO lower bound for a range key.
 * @param {string} rangeKey
 * @returns {string | null}
 */
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

/**
 * Builds a display label for a range key.
 * @param {string} rangeKey
 * @returns {string}
 */
const buildTimeRangeLabel = (rangeKey) => {
  switch (rangeKey) {
    case "last_7_days":
      return "Last 7 days";
    case "last_30_days":
      return "Last 30 days";
    case "last_90_days":
      return "Last 90 days";
    case "last_365_days":
      return "Last 12 months";
    case "all_time":
      return "All time";
    default:
      return "Last 30 days";
  }
};

const getRangeDays = (rangeKey) => {
  switch (rangeKey) {
    case "last_7_days":
      return 7;
    case "last_30_days":
      return 30;
    case "last_90_days":
      return 90;
    case "last_365_days":
      return 365;
    default:
      return null;
  }
};

/**
 * Aggregates PRESENT evidence unit counts by label.
 * @param {Array<{ evidenceUnits?: Array<{ label?: string, attributes?: { polarity?: string }, polarity?: string }> }>} signals
 * @returns {Map<string, number>}
 */
const aggregateEvidenceUnits = (signals) => {
  const counts = new Map();
  if (!Array.isArray(signals)) return counts;
  signals.forEach((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      const label = typeof unit?.label === "string" ? unit.label.trim() : "";
      if (!label) return;
      const polarity = unit?.attributes?.polarity || unit?.polarity;
      if (polarity !== "PRESENT") return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });
  return counts;
};

/**
 * Formats label counts into a prompt-ready signal context string.
 * @param {Map<string, number>} counts
 * @returns {string}
 */
const buildSignalContext = (counts) => {
  const entries = Array.from(counts.entries());
  if (!entries.length) return "";
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
};

/**
 * Collects top evidence spans for prompt grounding.
 * @param {Array<{ dateISO?: string, evidenceUnits?: Array<{ span?: string, label?: string, attributes?: Record<string, unknown> }> }>} signals
 * @param {number} [limit=8]
 * @returns {string[]}
 */
const buildEvidenceHighlights = (signals, limit = 8) => {
  const scored = [];
  const seen = new Set();
  const severityScore = (value) => {
    if (!value) return 0;
    const normalized = String(value).toUpperCase();
    if (normalized === "SEVERE") return 2;
    if (normalized === "MODERATE") return 1;
    return 0;
  };

  signals.forEach((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      if (!unit?.span) return;
      if (unit.attributes?.polarity !== "PRESENT") return;
      if (unit.attributes?.uncertainty && unit.attributes.uncertainty !== "LOW") return;
      const key = `${signal.dateISO}::${unit.label}::${unit.span}`;
      if (seen.has(key)) return;
      seen.add(key);
      const score = severityScore(unit.attributes?.severity);
      scored.push({ span: unit.span, score, dateISO: signal.dateISO || "" });
    });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.dateISO.localeCompare(b.dateISO))
    .slice(0, limit)
    .map((item) => item.span);
};

/**
 * Builds an inclusive dateISO list between start and end.
 * @param {string} startIso
 * @param {string} endIso
 * @returns {string[]}
 */
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

/**
 * Converts a string to title case (simple space-delimited).
 * @param {string} value
 * @returns {string}
 */
const toTitleCase = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Formats a short list into a human-readable phrase.
 * @param {string[]} items
 * @returns {string}
 */
const formatList = (items) => {
  const filtered = items.filter((item) => item && item.trim());
  if (!filtered.length) return "";
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered[0]}, ${filtered[1]}, and ${filtered[2]}`;
};

/**
 * Creates a console progress bar renderer.
 * @param {number} total
 * @param {string} label
 * @returns {{ render: (current: number) => void, done: () => void }}
 */
const createProgress = (total, label) => {
  const start = Date.now();
  const safeTotal = total > 0 ? total : 1;
  const render = (current) => {
    const percent = Math.min(current / safeTotal, 1);
    const width = 22;
    const filled = Math.round(width * percent);
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    const elapsed = (Date.now() - start) / 1000;
    const eta = current > 0 ? ((elapsed / current) * (safeTotal - current)) : 0;
    const line = `${label} [${bar}] ${(percent * 100).toFixed(1)}% (${current}/${safeTotal}) ETA ${eta.toFixed(0)}s`;
    process.stdout.write(`\r${line}`);
  };
  const done = () => {
    process.stdout.write("\n");
  };
  return { render, done };
};

/**
 * Collects top recurring items from weekly summaries.
 * @param {Array<{ summary?: Record<string, string[]> }>} weeklySummaries
 * @param {string} field
 * @param {number} limit
 * @param {Set<string>} [exclude]
 * @returns {string[]}
 */
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

/**
 * Collects top recurring items from signal fields.
 * @param {Array<Record<string, string[]>>} signals
 * @param {string} field
 * @param {number} limit
 * @param {Set<string>} [exclude]
 * @returns {string[]}
 */
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

/**
 * Compresses a series of points into a smaller bucketed list.
 * @param {Array<{ intensity: number, confidence?: number }>} points
 * @param {number} [maxPoints=12]
 * @returns {Array<{ intensity: number, confidence: number }>}
 */
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

/**
 * Computes a directional trend for a numeric series.
 * @param {number[]} series
 * @returns {"up" | "down" | "steady"}
 */
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

/**
 * Computes confidence from intensity coverage.
 * @param {Array<{ intensity: number, confidence?: number }>} points
 * @returns {"high" | "medium" | "low"}
 */
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

/**
 * Builds a fallback theme series from entry-level data.
 * @param {Array<{ dateISO?: string, themeIntensities?: Array<{ theme: string, intensity: number }>, themes?: string[] }>} entries
 * @param {string[]} dates
 * @param {string[]} topThemes
 * @returns {Map<string, Array<{ intensity: number, confidence: number }>>}
 */
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

/**
 * Builds the snapshot summary object from entries, signals, and series docs.
 * @param {{ entries: Array<object>, rangeKey: string, weeklySummaries: Array<object>, seriesDocs: Array<object>, signals: Array<object> }} params
 * @returns {Record<string, unknown>}
 */
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

  const rangeIntro = (() => {
    switch (rangeKey) {
      case "last_7_days":
        return "In the last week,";
      case "last_30_days":
        return "In the last month,";
      case "last_90_days":
        return "In the last 3 months,";
      case "last_365_days":
        return "Over the past year,";
      case "all_time":
        return "Over time,";
      default:
        return "Lately,";
    }
  })();

  const snapshotParts = [];
  if (topThemes.length) {
    snapshotParts.push(`${rangeIntro} your writing often touches on ${formatList(topThemes.slice(0, 3))}.`);
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

const computeHistorySpanDays = (earliestISO, latestISO) => {
  if (!earliestISO || !latestISO) return 0;
  const start = new Date(`${earliestISO}T00:00:00Z`);
  const end = new Date(`${latestISO}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Recompute a cached snapshot summary for a user/range key.
 * Heavy work: loads entries, signals, weekly summaries, merges narrative, and stores snapshot.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, rangeKey: string }} params
 * @returns {Promise<void>}
 */
const recomputeSnapshotForUser = async ({ userId, rangeKey }) => {
  console.log(`[snapshot] recompute start user=${userId} range=${rangeKey}`);
  const earliestEntry = await Entry.findOne({ userId, deletedAt: null })
    .sort({ dateISO: 1 })
    .select({ dateISO: 1 })
    .lean();
  const latestEntry = await Entry.findOne({ userId, deletedAt: null })
    .sort({ dateISO: -1 })
    .select({ dateISO: 1 })
    .lean();
  const historyStartISO = earliestEntry?.dateISO || null;
  const historyEndISO = latestEntry?.dateISO || null;
  const historySpanDays = computeHistorySpanDays(historyStartISO, historyEndISO);
  const requestedDays = getRangeDays(rangeKey);
  const effectiveRangeKey =
    requestedDays && historySpanDays > 0 && historySpanDays < requestedDays
      ? "all_time"
      : rangeKey;
  const rangeCoverage = {
    requestedRangeKey: rangeKey,
    effectiveRangeKey,
    historySpanDays,
    historyStartISO,
    historyEndISO,
    reason: effectiveRangeKey === rangeKey ? null : "insufficient_history",
  };

  if (effectiveRangeKey !== rangeKey) {
    const existingEffective = await SnapshotSummary.findOne({
      userId,
      rangeKey: effectiveRangeKey,
      stale: false,
    }).lean();
    if (existingEffective?.snapshot) {
      const clonedSnapshot = { ...existingEffective.snapshot, rangeCoverage };
      if (clonedSnapshot.narrative) {
        clonedSnapshot.narrative = {
          ...clonedSnapshot.narrative,
          timeRangeLabel: buildTimeRangeLabel(effectiveRangeKey),
        };
      }
      await SnapshotSummary.findOneAndUpdate(
        { userId, rangeKey },
        {
          userId,
          rangeKey,
          snapshot: clonedSnapshot,
          computedAt: new Date(),
          pipelineVersion: PIPELINE_VERSION.snapshot,
          sourceVersion: existingEffective.sourceVersion,
          stale: false,
        },
        { upsert: true, new: true },
      );
      return;
    }
  }

  const startIso = getRangeStartIso(effectiveRangeKey);
  const endIso = new Date().toISOString().slice(0, 10);
  const entryQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const entries = await Entry.find({ ...entryQuery, deletedAt: null })
    .sort({ dateISO: 1 })
    .lean();
  console.log(`[snapshot] entries=${entries.length} range=${effectiveRangeKey}`);

  const signalQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const signals = await EntrySignals.find(signalQuery).sort({ dateISO: 1 }).lean();
  console.log(`[snapshot] signals=${signals.length} range=${effectiveRangeKey}`);

  const weeklyQuery = startIso
    ? { userId, weekStartISO: { $gte: startIso, $lte: endIso } }
    : { userId };
  const weeklySummaries = await WeeklySummary.find(weeklyQuery).sort({ weekStartISO: 1 }).lean();
  console.log(`[snapshot] weeklySummaries=${weeklySummaries.length} range=${effectiveRangeKey}`);

  const seriesDocs = await ThemeSeries.find({ userId, rangeKey: effectiveRangeKey }).lean();
  console.log(`[snapshot] themeSeries=${seriesDocs.length} range=${effectiveRangeKey}`);

  const snapshot = buildSnapshot({
    entries,
    rangeKey: effectiveRangeKey,
    weeklySummaries,
    seriesDocs,
    signals,
  });
  snapshot.rangeCoverage = rangeCoverage;
  const timeRangeLabel = buildTimeRangeLabel(effectiveRangeKey);
  const chunkSummaries = weeklySummaries
    .map((item) => {
      if (!item.summary) return null;
      return { weekStart: item.weekStartISO, summary: item.summary };
    })
    .filter(Boolean);

  let narrative = {};
  if (chunkSummaries.length) {
    const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
    const apiKey = process.env.OPENAI_API_KEY || "";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

    if (!apiKey && !isLocal) {
      console.warn("[snapshot] missing OPENAI_API_KEY and not local", { baseUrl });
    } else {
      const signalCounts = aggregateEvidenceUnits(signals);
      const signalContext = buildSignalContext(signalCounts);
      const evidenceHighlights = buildEvidenceHighlights(signals);
      const mergeProgress = createProgress(
        Math.max(1, chunkSummaries.length - 1),
        `[snapshot] merge ${userId}:${effectiveRangeKey}`,
      );
      const mergeResponse = await mergeSummaries({
        summaries: chunkSummaries,
        timeRangeLabel,
        signalContext,
        evidenceHighlights,
        baseUrl,
        apiKey,
        model,
        onProgress: ({ merged, total }) => {
          mergeProgress.render(Math.min(merged, total || merged));
          if (total && merged >= total) mergeProgress.done();
        },
      });

      if (mergeResponse?.data) {
        narrative = mergeResponse.data;
      } else if (mergeResponse?.error) {
        console.warn("[snapshot] merge error", { error: mergeResponse.error });
        mergeProgress.done();
      }
    }
  }
  narrative = normalizeNarrativeArrays(narrative || {});
  if (!narrative.overTimeSummary) {
    narrative.overTimeSummary = snapshot.snapshotOverview || "";
  }
  narrative.timeRangeLabel = narrative.timeRangeLabel || timeRangeLabel;
  snapshot.narrative = narrative || {};
  const sourceVersion = await computeSourceVersionForRange(userId, effectiveRangeKey);

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

/**
 * Recompute all snapshots marked stale across users/ranges.
 * @returns {Promise<void>}
 */
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
