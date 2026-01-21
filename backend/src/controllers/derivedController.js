const asyncHandler = require("../utils/asyncHandler");
const SnapshotSummary = require("../derived/models/SnapshotSummary");
const { recomputeSnapshotForUser } = require("../derived/services/snapshotRecompute");
const ConnectionsGraph = require("../derived/models/ConnectionsGraph");
const Cycle = require("../derived/models/Cycle");
const EntrySignals = require("../derived/models/EntrySignals");
const ThemeSeries = require("../derived/models/ThemeSeries");
const WeeklySummary = require("../models/WeeklySummary");
const Entry = require("../models/Entry");
const ClinicianOverride = require("../models/ClinicianOverride");
const { evaluateDiagnosticLogic } = require("@mindstorm/criteria-graph/evaluator");

/**
 * Returns ISO week start (Monday) for a dateISO string.
 * @param {string} dateIso
 * @returns {string}
 */
const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
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
const formatRangeLabel = (rangeKey) => {
  if (rangeKey === "last_7_days") return "Last 7 days";
  if (rangeKey === "last_365_days") return "Last 365 days";
  if (rangeKey === "all_time") return "All time";
  if (rangeKey === "last_90_days") return "Last 90 days";
  return "Last 30 days";
};

/**
 * Converts a string to title case (simple space-delimited).
 * @param {string} value
 * @returns {string}
 */
const toTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Normalizes dateISO to YYYY-MM-DD.
 * @param {string} dateIso
 * @returns {string}
 */
const getDateKey = (dateIso) => (dateIso ? dateIso.slice(0, 10) : "");

/**
 * Formats a Date into a short weekday label.
 * @param {Date} date
 * @returns {string}
 */
const getDayLabel = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
  });

/**
 * Builds 7-day intensity points for a theme.
 * @param {{ theme: string, signals: Array<{ dateISO: string, themeIntensities?: Array<{ theme: string, intensity: number }>, themes?: string[] }> }} params
 * @returns {Array<{ id: string, label: string, intensity: number }>}
 */
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

/**
 * Compresses a numeric series into maxPoints buckets.
 * @param {number[]} points
 * @param {number} [maxPoints=12]
 * @returns {number[]}
 */
const compressSeries = (points, maxPoints = 12) => {
  if (points.length <= maxPoints) return points;
  const bucketSize = Math.ceil(points.length / maxPoints);
  const compressed = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    compressed.push(avg);
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
 * Builds weekly intensity points for a 6-week window.
 * @param {{ theme: string, signals: Array<{ dateISO: string, themeIntensities?: Array<{ theme: string, intensity: number }>, themes?: string[] }> }} params
 * @returns {Array<{ id: string, label: string, intensity: number }>}
 */
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

/**
 * Builds link metadata for entry spans in a timeline.
 * @param {{ themeEntries: Array<{ _id: import("mongoose").Types.ObjectId, title: string, date?: string, dateISO?: string }>, limit: number, labelPrefix: string }} params
 * @returns {Array<{ id: string, label: string, dateRange: string }>}
 */
const buildSpanLinks = ({ themeEntries, limit, labelPrefix }) =>
  themeEntries.slice(0, limit).map((entry, index) => ({
    id: `${labelPrefix}-${index}-${entry._id.toString()}`,
    label: entry.title,
    dateRange: entry.date || entry.dateISO || "",
  }));

/**
 * Builds detailed pattern card content for a theme.
 * @param {{ theme: string, rangeKey: string, signals: Array<object>, entryMap: Map<string, object>, weeklySummaries: Array<object> }} params
 * @returns {Record<string, unknown>}
 */
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

/**
 * Fetch a cached snapshot for the requested range key.
 * Triggers background recompute when snapshot is missing or stale.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { snapshot, stale }.
 */
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
    setImmediate(async () => {
      try {
        await recomputeSnapshotForUser({ userId: req.user._id, rangeKey });
      } catch (err) {
        console.warn("[snapshot] recompute failed", err?.message || err);
      }
    });
    return res.json({ snapshot: null, stale: true });
  }

  setImmediate(async () => {
    try {
      await recomputeSnapshotForUser({ userId: req.user._id, rangeKey });
    } catch (err) {
      console.warn("[snapshot] recompute failed", err?.message || err);
    }
  });
  res.json({ snapshot: staleSnapshot.snapshot || null, stale: true });
});

/**
 * Fetch cached weekly summaries for a range.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { weeklySummaries }.
 */
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

/**
 * Title-cases a label for display.
 * @param {string} value
 * @returns {string}
 */
const toLabel = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Maps evidence labels to patient-facing theme labels.
 * @param {string} label
 * @returns {string}
 */
const mapLabelToTheme = (label) => {
  const map = {
    SYMPTOM_MOOD: "Low mood",
    SYMPTOM_ANXIETY: "Anxiety",
    SYMPTOM_SLEEP: "Sleep changes",
    SYMPTOM_SOMATIC: "Body/energy changes",
    SYMPTOM_COGNITIVE: "Self-critical thoughts",
    SYMPTOM_MANIA: "High energy shifts",
    SYMPTOM_PSYCHOSIS: "Unusual perceptions",
    SYMPTOM_TRAUMA: "Trauma responses",
    IMPACT_WORK: "Work/school impact",
    IMPACT_SOCIAL: "Relationship strain",
    IMPACT_SELF_CARE: "Self-care struggles",
    IMPACT: "Life impact",
    IMPAIRMENT: "Life impact",
    CONTEXT_STRESSOR: "Life stressors",
    CONTEXT_MEDICAL: "Physical health changes",
    CONTEXT_SUBSTANCE: "Substance or medication changes",
  };
  if (map[label]) return map[label];
  return String(label || "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
};

/**
 * Picks a representative quote from an entry for evidence display.
 * @param {{ evidenceUnits?: Array<{ span?: string, attributes?: { polarity?: string, severity?: string } }>, summary?: string }} entry
 * @returns {string}
 */
const pickEntryQuote = (entry) => {
  const units = Array.isArray(entry.evidenceUnits) ? entry.evidenceUnits : [];
  const candidates = units.filter(
    (unit) =>
      unit?.attributes?.polarity === "PRESENT" &&
      unit?.span &&
      unit.span.trim().length > 10,
  );
  if (candidates.length) {
    const severityScore = (unit) => {
      const severity = String(unit?.attributes?.severity || "").toUpperCase();
      if (severity.includes("SEVERE") || severity.includes("HIGH")) return 3;
      if (severity.includes("MODERATE")) return 2;
      return 1;
    };
    const sorted = candidates.slice().sort((a, b) => {
      const scoreDiff = severityScore(b) - severityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.span?.length || 0) - (a.span?.length || 0);
    });
    const best = sorted[0]?.span;
    if (best) return best.trim();
  }
  return entry.summary ? entry.summary.trim() : "";
};

/**
 * Fetch a cached connections graph for a range key.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { graph, stale }.
 */
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

  const entries = await Entry.find({
    _id: { $in: Array.from(entryIds) },
    userId: req.user._id,
    deletedAt: null,
  }).lean();
  const entryMap = new Map(entries.map((entry) => [entry._id.toString(), entry]));

  const seriesDocs = await ThemeSeries.find({ userId: req.user._id, rangeKey }).lean();
  const seriesMap = new Map(seriesDocs.map((doc) => [doc.theme, doc.points || []]));

  /**
   * Converts theme series points to a numeric array.
   * @param {Array<{ intensity?: number }>} points
   * @returns {number[]}
   */
  const toSeriesArray = (points) => (points || []).map((point) => point.intensity || 0);

  /**
   * Computes Pearson correlation between two numeric series.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  const correlation = (a, b) => {
    const length = Math.min(a.length, b.length);
    if (length < 3) return 0;
    const x = a.slice(0, length);
    const y = b.slice(0, length);
    const avg = (arr) => arr.reduce((sum, value) => sum + value, 0) / arr.length;
    const meanX = avg(x);
    const meanY = avg(y);
    const numerator = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, value) => sum + (value - meanX) ** 2, 0));
    const denomY = Math.sqrt(y.reduce((sum, value) => sum + (value - meanY) ** 2, 0));
    if (!denomX || !denomY) return 0;
    return numerator / (denomX * denomY);
  };

  /**
   * Builds a narrative summary for signal co-movement.
   * @param {number} corr
   * @returns {string}
   */
  const buildMovementSummary = (corr) => {
    const abs = Math.abs(corr);
    if (abs >= 0.45) {
      return corr > 0
        ? "These signals tend to rise and settle together across the range. This is not causal."
        : "These signals often move in opposite directions across the range. This is not causal.";
    }
    if (abs >= 0.2) {
      return corr > 0
        ? "These signals sometimes lift together, though the pattern is mixed. This is not causal."
        : "These signals sometimes diverge, though the pattern is mixed. This is not causal.";
    }
    return "Movement between these signals looks mixed and subtle. This is not causal.";
  };

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

    const fromSeries = toSeriesArray(seriesMap.get(edge.from));
    const toSeries = toSeriesArray(seriesMap.get(edge.to));
    const corr = correlation(fromSeries, toSeries);

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: `${toLabel(edge.from)} <-> ${toLabel(edge.to)}`,
      strength: edge.weight || 0,
      evidence,
      movement: {
        fromSeries: compressSeries(fromSeries),
        toSeries: compressSeries(toSeries),
        correlation: Number.isFinite(corr) ? Number(corr.toFixed(2)) : 0,
        summary: buildMovementSummary(corr),
      },
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

/**
 * Evaluate diagnostic gating status for a patient using server-side logic.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with diagnostic status and counts.
 */
const getClinicalStatus = asyncHandler(async (req, res) => {
  const patientId = req.params.patientId;
  // TODO: enforce clinician access and patient scope before returning clinical status.
  const windowDays = req.query.windowDays ? Number(req.query.windowDays) : undefined;
  const diagnosticWindowDays = req.query.diagnosticWindowDays
    ? Number(req.query.diagnosticWindowDays)
    : undefined;
  const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
  const labelsParam = typeof req.query.labels === "string" ? req.query.labels : "";
  const requestedLabels = labelsParam
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  const [entries, overrides] = await Promise.all([
    Entry.find({ userId: patientId, deletedAt: null })
      .select("dateISO summary evidenceUnits risk_signal")
      .sort({ dateISO: 1 })
      .lean(),
    ClinicianOverride.find({ clinicianId: req.user._id, patientId }).lean(),
  ]);

  const overrideMap = overrides.reduce((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});

  const logic = evaluateDiagnosticLogic(entries, {
    windowDays,
    diagnosticWindowDays,
    threshold,
    overrideList: overrides.map((item) => ({ nodeId: item.nodeId, status: item.status })),
  });

  const labelSet = new Set([
    ...logic.currentSymptoms,
    ...logic.currentDenials,
    ...logic.lifetimeSymptoms,
    ...logic.lifetimeDenials,
  ]);
  const allStatusByLabel = Array.from(labelSet).reduce((acc, label) => {
    acc[label] = logic.getStatusForLabels([label]);
    return acc;
  }, {});

  const statusByLabel = requestedLabels.length
    ? requestedLabels.reduce((acc, label) => {
        acc[label] = logic.getStatusForLabels([label]);
        return acc;
      }, {})
    : allStatusByLabel;

  res.json({
    statusByLabel,
    overrides: overrideMap,
    currentCount: logic.currentCount,
    lifetimeCount: logic.lifetimeCount,
    lifetimeWindowMax: logic.lifetimeWindowMax,
    potentialRemission: logic.potentialRemission,
    currentSymptoms: Array.from(logic.currentSymptoms),
    currentDenials: Array.from(logic.currentDenials),
    lifetimeSymptoms: Array.from(logic.lifetimeSymptoms),
    lifetimeDenials: Array.from(logic.lifetimeDenials),
  });
});

/**
 * Build pattern cards for the selected range using signals + theme series.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { patterns, rangeLabel }.
 */
const getPatterns = asyncHandler(async (req, res) => {
  const rangeKey = req.query.rangeKey || "last_30_days";
  const patternId = req.query.patternId;
  const startIso = getRangeStartIso(rangeKey);
  const entryQuery = startIso ? { userId: req.user._id, dateISO: { $gte: startIso } } : { userId: req.user._id };
  const entries = await Entry.find({ ...entryQuery, deletedAt: null })
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
  const seriesDocs = await ThemeSeries.find({ userId: req.user._id, rangeKey }).lean();
  const seriesTotals = seriesDocs.map((doc) => ({
    theme: doc.theme,
    total: (doc.points || []).reduce((sum, point) => sum + (point.intensity || 0), 0),
  }));

  let topThemes = seriesTotals
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((item) => item.theme);

  if (!topThemes.length) {
    const themeCounts = new Map();
    signals.forEach((signal) => {
      (signal.themes || []).forEach((theme) => {
        const key = theme.trim().toLowerCase();
        if (!key) return;
        themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
      });
    });
    topThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);
  }

  const evidencePool = new Map();
  signals.forEach((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      if (unit?.attributes?.polarity !== "PRESENT") return;
      if (!unit?.label || !unit?.span) return;
      const theme = mapLabelToTheme(unit.label);
      if (!theme) return;
      const key = theme.trim().toLowerCase();
      if (!key) return;
      if (!evidencePool.has(key)) evidencePool.set(key, []);
      const list = evidencePool.get(key);
      const quote = unit.span.trim();
      if (quote && list.length < 6 && !list.includes(quote)) {
        list.push(quote);
      }
    });
  });

  const patterns = topThemes.map((theme) => {
    const seriesDoc = seriesDocs.find((doc) => doc.theme === theme);
    const points = seriesDoc?.points || [];
    const fallbackPoints = points.length
      ? []
      : buildWeekPoints({ theme, signals }).map((point) => ({
          intensity: point.intensity / 100,
          confidence: point.intensity > 0 ? 0.6 : 0.2,
        }));
    const seriesPoints = points.length ? points : fallbackPoints;
    const sparkline = compressSeries(seriesPoints.map((point) => point.intensity || 0));
    const trend = computeTrend(seriesPoints.map((point) => point.intensity || 0));
    const confidence = computeConfidence(seriesPoints);
    const evidence = (evidencePool.get(theme) || []).slice(0, 3);

    return {
      id: theme,
      title: toTitleCase(theme),
      description: `Patterns around ${theme} show up across recent entries.`,
      trend,
      confidence,
      sparkline,
      evidence,
    };
  });

const selectedTheme = patternId && topThemes.includes(patternId) ? patternId : topThemes[0];
  const detail = selectedTheme
    ? buildPatternDetail({ theme: selectedTheme, rangeKey, signals, entryMap, weeklySummaries })
    : null;

  res.json({ patterns, detail });
});

/**
 * Fetch cycle edges for the selected range key.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { cycles, stale }.
 */
const getCycles = asyncHandler(async (req, res) => {
  const rangeKey = req.query.rangeKey || "last_30_days";
  const cycles = await Cycle.find({ userId: req.user._id, rangeKey, stale: false }).lean();
  const fallback = await Cycle.find({ userId: req.user._id, rangeKey }).lean();
  const activeCycles = (cycles.length ? cycles : fallback).filter(
    (cycle) => cycle.sourceNode && cycle.targetNode,
  );

  res.json({
    cycles: activeCycles.map((cycle) => ({
      sourceNode: cycle.sourceNode,
      targetNode: cycle.targetNode,
      frequency: cycle.frequency || 0,
      confidence: cycle.confidence || 0,
      lagDaysMin: cycle.lagDaysMin || 0,
      avgLag: cycle.avgLag || 0,
      evidenceEntryIds: cycle.evidenceEntryIds || [],
    })),
    stale: cycles.length ? false : fallback.length === 0,
  });
});

module.exports = { getSnapshot, getWeeklySummaries, getConnectionsGraph, getCycles, getPatterns, getClinicalStatus };
