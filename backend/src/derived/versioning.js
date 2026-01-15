const Entry = require("../models/Entry");
const ConnectionsGraph = require("./models/ConnectionsGraph");
const Cycle = require("./models/Cycle");
const SnapshotSummary = require("./models/SnapshotSummary");
const ThemeSeries = require("./models/ThemeSeries");
const { PIPELINE_VERSION } = require("./pipelineVersion");

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

const computeSourceVersionForRange = async (userId, rangeKey) => {
  const startIso = getRangeStartIso(rangeKey);
  const query = startIso ? { userId, dateISO: { $gte: startIso } } : { userId };
  const latestEntry = await Entry.findOne(query).sort({ updatedAt: -1 }).lean();
  if (!latestEntry?.updatedAt) {
    return new Date().toISOString();
  }
  return new Date(latestEntry.updatedAt).toISOString();
};

const markDerivedStale = async (userId, rangeKeys, sourceVersion) => {
  const keys = Array.isArray(rangeKeys) ? rangeKeys : [rangeKeys];
  const baseUpdate = {
    stale: true,
    sourceVersion: sourceVersion || new Date().toISOString(),
    computedAt: new Date(),
  };

  await Promise.all(
    keys.map((rangeKey) =>
      Promise.all([
        SnapshotSummary.updateOne(
          { userId, rangeKey },
          {
            $set: {
              ...baseUpdate,
              pipelineVersion: PIPELINE_VERSION.snapshot,
            },
          },
          { upsert: true },
        ),
        ConnectionsGraph.updateOne(
          { userId, rangeKey },
          {
            $set: {
              ...baseUpdate,
              pipelineVersion: PIPELINE_VERSION.connectionsGraph,
            },
          },
          { upsert: true },
        ),
        Cycle.updateOne(
          { userId, rangeKey },
          {
            $set: {
              ...baseUpdate,
              pipelineVersion: PIPELINE_VERSION.cycles,
            },
          },
          { upsert: true },
        ),
        ThemeSeries.updateMany(
          { userId, rangeKey },
          {
            $set: {
              ...baseUpdate,
              pipelineVersion: PIPELINE_VERSION.themeSeries,
            },
          },
        ),
      ]),
    ),
  );
};

module.exports = { computeSourceVersionForRange, markDerivedStale };
