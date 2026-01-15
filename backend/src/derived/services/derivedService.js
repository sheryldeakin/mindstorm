const EntrySignals = require("../models/EntrySignals");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { markDerivedStale: markDerivedStaleVersioned } = require("../versioning");

const markDerivedStale = async ({ userId, rangeKey, sourceVersion }) => {
  await markDerivedStaleVersioned(userId, [rangeKey], sourceVersion ? new Date(sourceVersion).toISOString() : undefined);
};

const upsertEntrySignals = async ({ userId, entryId, dateISO, data, sourceUpdatedAt }) => {
  const sourceVersion = sourceUpdatedAt ? new Date(sourceUpdatedAt).toISOString() : new Date().toISOString();
  return EntrySignals.findOneAndUpdate(
    { userId, entryId },
    {
      userId,
      entryId,
      dateISO,
      ...data,
      pipelineVersion: PIPELINE_VERSION.entrySignals,
      sourceVersion,
      sourceUpdatedAt,
      computedAt: new Date(),
      stale: false,
    },
    { upsert: true, new: true },
  );
};

module.exports = { markDerivedStale, upsertEntrySignals };
