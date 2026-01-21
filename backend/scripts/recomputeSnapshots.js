const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const connectDb = require("../src/config/db");
const Entry = require("../src/models/Entry");
const { recomputeSnapshotForUser } = require("../src/derived/services/snapshotRecompute");

const RANGE_KEYS = ["last_7_days", "last_30_days", "last_365_days", "all_time"];

const run = async () => {
  await connectDb();
  const userIds = await Entry.distinct("userId", { deletedAt: null });

  if (!userIds.length) {
    console.log("No users with entries found.");
    await mongoose.disconnect();
    return;
  }

  for (const userId of userIds) {
    for (const rangeKey of RANGE_KEYS) {
      console.log(`[snapshot] recompute ${rangeKey} for user ${userId}`);
      await recomputeSnapshotForUser({ userId, rangeKey });
    }
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Snapshot recompute failed:", err?.message || err);
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
