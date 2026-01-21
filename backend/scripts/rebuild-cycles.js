const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const { recomputeCyclesForUser } = require("../src/derived/services/cyclesRecompute");

dotenv.config();

/**
 * Parses CLI arguments into a key/value object.
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
};

/**
 * Recomputes cycle data for users (optionally filtered by user/range).
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  const args = parseArgs(process.argv.slice(2));
  const targetUserId = args.user || null;
  const rangeKey = args.rangeKey || null;

  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  await mongoose.connect(uri);

  const entryFilter = targetUserId ? { userId: targetUserId } : {};
  const entries = await Entry.find(entryFilter).select("userId").lean();
  const userIds = Array.from(new Set(entries.map((entry) => entry.userId.toString())));

  const rangeKeys = rangeKey
    ? [rangeKey]
    : ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"];

  for (const userId of userIds) {
    console.log(`Cycles: recomputing for user ${userId}`);
    for (const key of rangeKeys) {
      await recomputeCyclesForUser({ userId, rangeKey: key });
      console.log(`Cycles updated for ${userId} (${key})`);
    }
  }

  console.log("Cycles-only rebuild complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
