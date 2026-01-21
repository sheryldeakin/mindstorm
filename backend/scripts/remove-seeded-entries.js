const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");

dotenv.config();

/**
 * Removes seeded sample entries for a given user.
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  const userId = process.argv[2] || process.env.SEED_USER_ID;

  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  if (!userId) {
    throw new Error("Provide a user id: node scripts/remove-seeded-entries.js <userId>");
  }

  await mongoose.connect(uri);

  const result = await Entry.deleteMany({
    userId,
    tags: "seeded-sample",
  });

  console.log(`Deleted ${result.deletedCount} seeded entries for user ${userId}.`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
