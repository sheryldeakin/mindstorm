const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");

dotenv.config();

/**
 * Formats a Date into YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
const formatDateIso = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formats a Date into a short friendly string.
 * @param {Date} date
 * @returns {string}
 */
const formatFriendlyDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/**
 * Backfills dateISO and date fields for entries missing them.
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);

  const entries = await Entry.find({ $or: [{ dateISO: { $exists: false } }, { dateISO: null }, { dateISO: "" }] });
  console.log(`Found ${entries.length} entries missing dateISO.`);

  for (const entry of entries) {
    let sourceDate = null;

    if (entry.createdAt) {
      sourceDate = entry.createdAt;
    }

    if (!sourceDate) {
      sourceDate = new Date();
    }

    entry.dateISO = formatDateIso(sourceDate);

    if (!entry.date) {
      entry.date = formatFriendlyDate(sourceDate);
    }

    await entry.save();
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
