const ConnectionsGraph = require("../models/ConnectionsGraph");
const EntrySignals = require("../models/EntrySignals");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");

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
    const themes = Array.from(new Set((signal.themes || []).map((theme) => theme.trim()).filter(Boolean)));
    themes.forEach((theme) => {
      const key = theme.toLowerCase();
      themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
    });

    for (let i = 0; i < themes.length; i += 1) {
      for (let j = i + 1; j < themes.length; j += 1) {
        const a = themes[i].toLowerCase();
        const b = themes[j].toLowerCase();
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

module.exports = { recomputeConnectionsForUser, recomputeStaleConnections };
