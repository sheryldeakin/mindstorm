const ConnectionsGraph = require("../models/ConnectionsGraph");
const EntrySignals = require("../models/EntrySignals");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");

const mapEvidenceLabelToTheme = (label) => {
  const map = {
    SYMPTOM_MOOD: "Low mood",
    SYMPTOM_ANHEDONIA: "Loss of interest",
    SYMPTOM_COGNITIVE: "Foggy thinking",
    SYMPTOM_SOMATIC: "Low energy",
    SYMPTOM_SLEEP: "Sleep changes",
    SYMPTOM_ANXIETY: "Anxiety or worry",
    SYMPTOM_RISK: "Risk thoughts",
    SYMPTOM_MANIA: "High energy shifts",
    SYMPTOM_PSYCHOSIS: "Unusual perceptions",
    SYMPTOM_TRAUMA: "Trauma reminders",
    IMPACT_WORK: "Work/school impact",
    IMPACT_SOCIAL: "Relationship strain",
    IMPACT_SELF_CARE: "Self-care struggles",
    IMPACT: "Life impact",
    CONTEXT_STRESSOR: "Life stressors",
    CONTEXT_MEDICAL: "Physical health changes",
    CONTEXT_SUBSTANCE: "Substance or medication changes",
  };
  if (map[label]) return map[label];
  return String(label || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

const normalizeThemeLabel = (theme) => {
  const trimmed = String(theme || "").trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("SYMPTOM_")) return mapEvidenceLabelToTheme(upper);
  if (upper.startsWith("IMPACT_")) return mapEvidenceLabelToTheme(upper);
  if (upper.startsWith("CONTEXT_")) return mapEvidenceLabelToTheme(upper);
  const match = trimmed.match(/^([A-Za-z\s]+):/);
  if (!match) return trimmed;
  const prefix = match[1].trim().toLowerCase();
  const prefixMap = {
    "symptom mood": "SYMPTOM_MOOD",
    "symptom anhedonia": "SYMPTOM_ANHEDONIA",
    "symptom sleep": "SYMPTOM_SLEEP",
    "symptom anxiety": "SYMPTOM_ANXIETY",
    "symptom risk": "SYMPTOM_RISK",
    "symptom mania": "SYMPTOM_MANIA",
    "symptom psychosis": "SYMPTOM_PSYCHOSIS",
    "symptom trauma": "SYMPTOM_TRAUMA",
    "symptom cognitive": "SYMPTOM_COGNITIVE",
    "symptom somatic": "SYMPTOM_SOMATIC",
    "impact work": "IMPACT_WORK",
    "impact social": "IMPACT_SOCIAL",
    "impact self care": "IMPACT_SELF_CARE",
    "impact self-care": "IMPACT_SELF_CARE",
    "context stressor": "CONTEXT_STRESSOR",
    "context medical": "CONTEXT_MEDICAL",
    "context substance": "CONTEXT_SUBSTANCE",
  };
  const mapped = prefixMap[prefix];
  if (mapped) return mapEvidenceLabelToTheme(mapped);
  return trimmed;
};

const normalizeThemeLabels = (theme) => {
  const normalized = normalizeThemeLabel(theme);
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  if (lower.includes("low mood") && lower.includes("loss of interest")) {
    return ["Low mood", "Loss of interest"];
  }
  return [normalized];
};

const normalizeThemeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.:]+$/g, "")
    .trim();

/**
 * Returns the dateISO lower bound for a range key.
 * @param {string} rangeKey
 * @returns {string | null}
 */
const getRangeStartIso = (rangeKey) => {
  if (rangeKey === "all_time") return null;
  const days = rangeKey === "last_90_days" ? 90 : rangeKey === "last_7_days" ? 7 : 30;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return start.toISOString().slice(0, 10);
};

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
 * Builds a co-occurrence graph from entry signals.
 * @param {Array<{ themes?: string[], entryId?: import("mongoose").Types.ObjectId }>} signals
 * @returns {{ nodes: Array<{ id: string, label: string }>, edges: Array<{ id: string, from: string, to: string, weight: number, evidenceEntryIds: string[] }> }}
 */
const buildConnectionsGraph = (signals) => {
  const themeCounts = new Map();
  const edgeCounts = new Map();
  const edgeEvidence = new Map();

  signals.forEach((signal) => {
    const themes = Array.from(
      new Set((signal.themes || []).flatMap((theme) => normalizeThemeLabels(theme))),
    );
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      if (unit?.attributes?.polarity !== "PRESENT") return;
      if (!unit?.label) return;
      const formatted = mapEvidenceLabelToTheme(unit.label);
      if (formatted) themes.push(formatted);
    });
    themes.forEach((theme) => {
      const key = normalizeThemeKey(theme);
      if (!key) return;
      themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
    });

    for (let i = 0; i < themes.length; i += 1) {
      for (let j = i + 1; j < themes.length; j += 1) {
        const a = normalizeThemeKey(themes[i]);
        const b = normalizeThemeKey(themes[j]);
        if (!a || !b) continue;
        const pair = [a, b].sort().join("__");
        edgeCounts.set(pair, (edgeCounts.get(pair) || 0) + 1);
        if (!edgeEvidence.has(pair)) {
          edgeEvidence.set(pair, []);
        }
        const list = edgeEvidence.get(pair);
        if (signal.entryId && list.length < 6) {
          list.push(signal.entryId.toString());
        }
      }
    }
  });

  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme]) => theme);

  const nodes = topThemes.map((theme) => ({
    id: theme,
    label: toLabel(theme),
  }));

  const edges = [];
  const maxCount = Math.max(...Array.from(edgeCounts.values()), 1);

  topThemes.forEach((themeA, index) => {
    for (let j = index + 1; j < topThemes.length; j += 1) {
      const themeB = topThemes[j];
      const pair = [themeA, themeB].sort().join("__");
      const count = edgeCounts.get(pair);
      if (!count) continue;
      edges.push({
        id: `${themeA}__${themeB}`,
        from: themeA,
        to: themeB,
        weight: Math.round((count / maxCount) * 100),
        evidenceEntryIds: edgeEvidence.get(pair) || [],
      });
    }
  });

  edges.sort((a, b) => b.weight - a.weight);

  return {
    nodes,
    edges: edges.slice(0, 10),
  };
};

/**
 * Recompute the connections graph for a user's themes in a given range.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, rangeKey: string }} params
 * @returns {Promise<void>}
 */
const recomputeConnectionsForUser = async ({ userId, rangeKey }) => {
  const startIso = getRangeStartIso(rangeKey);
  const signalQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const signals = await EntrySignals.find(signalQuery)
    .sort({ dateISO: 1 })
    .lean();
  const graph = buildConnectionsGraph(signals);
  const sourceVersion = await computeSourceVersionForRange(userId, rangeKey);

  await ConnectionsGraph.findOneAndUpdate(
    { userId, rangeKey },
    {
      userId,
      rangeKey,
      nodes: graph.nodes,
      edges: graph.edges,
      computedAt: new Date(),
      pipelineVersion: PIPELINE_VERSION.connectionsGraph,
      sourceVersion,
      stale: false,
    },
    { upsert: true, new: true },
  );
};

/**
 * Recompute connections graphs for a user across multiple ranges.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, rangeKeys?: string[] }} params
 * @returns {Promise<void>}
 */
const recomputeConnectionsForUserRanges = async ({ userId, rangeKeys } = {}) => {
  const keys = rangeKeys?.length
    ? rangeKeys
    : ["all_time", "last_7_days", "last_30_days", "last_90_days", "last_365_days"];
  for (const rangeKey of keys) {
    await recomputeConnectionsForUser({ userId, rangeKey });
  }
};

/**
 * Recompute all connections graphs marked stale.
 * @returns {Promise<void>}
 */
const recomputeStaleConnections = async () => {
  const stale = await ConnectionsGraph.find({ stale: true }).lean();
  const userRangePairs = new Map();
  stale.forEach((doc) => {
    userRangePairs.set(`${doc.userId}:${doc.rangeKey}`, { userId: doc.userId, rangeKey: doc.rangeKey });
  });

  for (const pair of userRangePairs.values()) {
    await recomputeConnectionsForUser(pair);
  }
};

module.exports = {
  recomputeConnectionsForUser,
  recomputeConnectionsForUserRanges,
  recomputeStaleConnections,
};
