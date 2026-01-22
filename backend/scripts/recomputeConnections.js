const dotenv = require("dotenv");
const mongoose = require("mongoose");
const EntrySignals = require("../src/derived/models/EntrySignals");
const { recomputeConnectionsForUserRanges } = require("../src/derived/services/connectionsRecompute");

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

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const targetUserId = args.user || args.userid || args.userId;
  const rangeArg = args.rangeKey || args.range || args.ranges;
  const rangeKeys = rangeArg ? String(rangeArg).split(",").map((key) => key.trim()) : undefined;

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { socketTimeoutMS: 45000 });
  console.log("MongoDB connected");

  let userIds = [];
  if (targetUserId) {
    userIds = [targetUserId];
  } else {
    userIds = await EntrySignals.distinct("userId");
  }

  if (!userIds.length) {
    console.log("No users found to recompute connections.");
    await mongoose.disconnect();
    return;
  }

  for (const userId of userIds) {
    console.log(`[connections] recompute start user=${userId}`);
    await recomputeConnectionsForUserRanges({ userId, rangeKeys });
    console.log(`[connections] recompute complete user=${userId}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
