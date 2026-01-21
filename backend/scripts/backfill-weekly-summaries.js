const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const { generateWeeklySummary } = require("../src/controllers/aiController");

dotenv.config();

/**
 * Computes ISO week start (Monday) for a given dateISO string.
 * @param {string} dateIso
 * @returns {string}
 */
const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

/**
 * Backfills weekly summaries for all users with entries.
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);

  const entries = await Entry.find({ dateISO: { $exists: true, $ne: "" } }).lean();
  const byUser = new Map();
  entries.forEach((entry) => {
    const userId = entry.userId.toString();
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    byUser.get(userId).add(getWeekStartIso(entry.dateISO));
  });

  console.log(`Found ${byUser.size} users to backfill.`);

  for (const [userId, weekSet] of byUser.entries()) {
    const weekKeys = Array.from(weekSet).filter(Boolean).sort();
    console.log(`User ${userId}: ${weekKeys.length} weeks.`);
    for (let i = 0; i < weekKeys.length; i += 2) {
      const batch = weekKeys.slice(i, i + 2);
      const results = await Promise.all(
        batch.map((weekStartIso) => generateWeeklySummary({ userId, weekStartIso })),
      );
      results.forEach((result, index) => {
        if (result?.error) {
          console.warn(`Week ${batch[index]} error: ${result.error}`);
        } else {
          console.log(`Week ${batch[index]} updated.`);
        }
      });
    }
  }

  console.log("Weekly backfill complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
