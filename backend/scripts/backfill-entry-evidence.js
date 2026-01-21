const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const { generateEntryEvidence } = require("../src/controllers/aiController");

dotenv.config();

/**
 * Backfills missing evidenceBySection for entries.
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);

  const entries = await Entry.find({
    $or: [
      { evidenceBySection: { $exists: false } },
      { evidenceBySection: null },
    ],
  }).sort({ createdAt: 1 });

  console.log(`Found ${entries.length} entries missing evidence snippets.`);

  for (const entry of entries) {
    const entryText = `Title: ${entry.title}\nSummary: ${entry.summary}`;
    const result = await generateEntryEvidence(entryText);
    if (result?.error) {
      console.warn(`Skipping entry ${entry._id}: ${result.error}`);
      continue;
    }
    entry.evidenceBySection = result.evidenceBySection;
    await entry.save();
    console.log(`Updated entry ${entry._id}`);
  }

  console.log("Backfill complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
