const EntrySignals = require("../models/EntrySignals");

const markDerivedStale = async ({ userId, rangeKey, sourceVersion }) => {
  const updates = { stale: true, sourceVersion };
  const models = [
    require("../models/ThemeSeries"),
    require("../models/ConnectionsGraph"),
    require("../models/Cycle"),
    require("../models/SnapshotSummary"),
  ];
  await Promise.all(
    models.map((Model) =>
      Model.updateMany({ userId, rangeKey }, { $set: updates }),
    ),
  );
  const SnapshotSummary = require("../models/SnapshotSummary");
  await SnapshotSummary.findOneAndUpdate(
    { userId, rangeKey },
    {
      userId,
      rangeKey,
      stale: true,
      sourceVersion,
    },
    { upsert: true, new: true },
  );
};

const upsertEntrySignals = async ({ userId, entryId, dateISO, data, sourceUpdatedAt }) => {
  return EntrySignals.findOneAndUpdate(
    { userId, entryId },
    {
      userId,
      entryId,
      dateISO,
      ...data,
      sourceUpdatedAt,
    },
    { upsert: true, new: true },
  );
};

module.exports = { markDerivedStale, upsertEntrySignals };
