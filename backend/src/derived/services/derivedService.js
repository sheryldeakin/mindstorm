const EntrySignals = require("../models/EntrySignals");
const { PIPELINE_VERSION } = require("../pipelineVersion");
const { markDerivedStale: markDerivedStaleVersioned } = require("../versioning");

/**
 * Mark derived caches stale for a user/range so background workers recompute.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, rangeKey: string | string[], sourceVersion?: string | Date }} params
 * @returns {Promise<void>}
 */
const markDerivedStale = async ({ userId, rangeKey, sourceVersion }) => {
  await markDerivedStaleVersioned(userId, [rangeKey], sourceVersion ? new Date(sourceVersion).toISOString() : undefined);
};

/**
 * Upsert EntrySignals for a given entry and update pipeline metadata.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, entryId: import("mongoose").Types.ObjectId | string, dateISO: string, data: object, sourceUpdatedAt?: Date }} params
 * @returns {Promise<object>}
 */
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
