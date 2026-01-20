const Cycle = require("../models/Cycle");
const EntrySignals = require("../models/EntrySignals");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { computeSourceVersionForRange } = require("../versioning");

const getRangeStartIso = (rangeKey) => {
  if (!rangeKey || rangeKey === "all_time") return null;
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

const getPresentLabels = (signal) => {
  const units = signal.evidenceUnits || [];
  const labels = new Set();
  units.forEach((unit) => {
    if (!unit?.label) return;
    if (unit.attributes?.polarity !== "PRESENT") return;
    const isSymptom = unit.label.startsWith("SYMPTOM_");
    const isContext = unit.label.startsWith("CONTEXT_");
    const isImpact = unit.label.startsWith("IMPACT_");
    if (!isSymptom && !isContext && !isImpact) return;
    if (unit.label === "SYMPTOM_RISK" || unit.label === "SYMPTOM_TRAUMA") return;
    labels.add(unit.label);
  });
  return Array.from(labels);
};

const diffDays = (fromIso, toIso) => {
  if (!fromIso || !toIso) return null;
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
};

const buildCycles = (signals) => {
  const edgeStats = new Map();
  const edgeEvidence = new Map();

  for (let i = 0; i < signals.length; i += 1) {
    const current = signals[i];
    const fromLabels = getPresentLabels(current);
    if (!fromLabels.length) continue;

    for (let j = i; j < signals.length; j += 1) {
      const candidate = signals[j];
      const lag = diffDays(current.dateISO, candidate.dateISO);
      if (lag === null) continue;
      if (lag < 0 || lag > 3) {
        if (lag > 3) break;
        continue;
      }
      const toLabels = getPresentLabels(candidate);
      if (!toLabels.length) continue;

      fromLabels.forEach((from) => {
        toLabels.forEach((to) => {
          if (from === to && lag === 0) return;
          const key = `${from}__${to}`;
          const stats = edgeStats.get(key) || { count: 0, minLag: lag, totalLag: 0 };
          stats.count += 1;
          stats.totalLag += lag;
          stats.minLag = Math.min(stats.minLag, lag);
          edgeStats.set(key, stats);

          if (!edgeEvidence.has(key)) edgeEvidence.set(key, new Set());
          const list = edgeEvidence.get(key);
          if (current.entryId) list.add(current.entryId.toString());
          if (candidate.entryId) list.add(candidate.entryId.toString());
        });
      });
    }
  }

  const counts = Array.from(edgeStats.values()).map((stat) => stat.count);
  const maxCount = Math.max(1, ...counts);
  return Array.from(edgeStats.entries())
    .filter(([, stats]) => stats.count >= 3)
    .map(([key, stats]) => {
      const [sourceNode, targetNode] = key.split("__");
      const evidence = edgeEvidence.get(key) ? Array.from(edgeEvidence.get(key)) : [];
      return {
        sourceNode,
        targetNode,
        frequency: stats.count,
        confidence: Math.min(1, stats.count / maxCount),
        lagDaysMin: stats.minLag,
        avgLag: stats.count ? Number((stats.totalLag / stats.count).toFixed(2)) : 0,
        evidenceEntryIds: evidence.slice(0, 8),
      };
    });
};

const recomputeCyclesForUser = async ({ userId, rangeKey }) => {
  const startIso = getRangeStartIso(rangeKey);
  const signalQuery = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const signals = await EntrySignals.find(signalQuery).sort({ dateISO: 1 }).lean();
  const cycles = buildCycles(signals);
  const sourceVersion = await computeSourceVersionForRange(userId, rangeKey);

  await Cycle.deleteMany({ userId, rangeKey });

  if (!cycles.length) {
    return Cycle.updateOne(
      { userId, rangeKey, sourceNode: null, targetNode: null },
      {
        userId,
        rangeKey,
        sourceNode: null,
        targetNode: null,
        frequency: 0,
        confidence: 0,
        evidenceEntryIds: [],
        computedAt: new Date(),
        pipelineVersion: PIPELINE_VERSION.cycles,
        sourceVersion,
        stale: false,
      },
      { upsert: true },
    );
  }

      await Cycle.insertMany(
        cycles.map((cycle) => ({
          userId,
          rangeKey,
          sourceNode: cycle.sourceNode,
          targetNode: cycle.targetNode,
          frequency: cycle.frequency,
          confidence: cycle.confidence,
          lagDaysMin: cycle.lagDaysMin,
          avgLag: cycle.avgLag,
          evidenceEntryIds: cycle.evidenceEntryIds,
          computedAt: new Date(),
          pipelineVersion: PIPELINE_VERSION.cycles,
          sourceVersion,
          stale: false,
        })),
      );
};

const recomputeStaleCycles = async () => {
  const stale = await Cycle.find({ stale: true }).lean();
  const userRangePairs = new Map();
  stale.forEach((doc) => {
    userRangePairs.set(`${doc.userId}:${doc.rangeKey}`, { userId: doc.userId, rangeKey: doc.rangeKey });
  });

  for (const pair of userRangePairs.values()) {
    await recomputeCyclesForUser(pair);
  }
};

module.exports = { recomputeCyclesForUser, recomputeStaleCycles };
