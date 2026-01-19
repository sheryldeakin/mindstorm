const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const {
  generateEntryEvidence,
  generateClinicalEvidenceUnits,
  generateWeeklySummary,
} = require("../src/controllers/aiController");
const { recomputeSnapshotForUser } = require("../src/derived/services/snapshotRecompute");
const { upsertEntrySignals } = require("../src/derived/services/derivedService");
const { recomputeConnectionsForUser } = require("../src/derived/services/connectionsRecompute");
const { recomputeThemeSeriesForUser } = require("../src/derived/services/themeSeriesRecompute");

dotenv.config();

const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);

  const entries = await Entry.find({}).lean();
  const byUser = new Map();

  entries.forEach((entry) => {
    const userId = entry.userId.toString();
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        entries: [],
        weeks: new Set(),
      });
    }
    const userData = byUser.get(userId);
    userData.entries.push(entry);
    if (entry.dateISO) {
      userData.weeks.add(getWeekStartIso(entry.dateISO));
    }
  });

  for (const [userId, data] of byUser.entries()) {
    console.log(`User ${userId}: ${data.entries.length} entries, ${data.weeks.size} weeks.`);

    for (const entry of data.entries) {
      const entryText = `Title: ${entry.title}\nSummary: ${entry.summary}`;
      const evidence = await generateEntryEvidence(entryText);
      if (!evidence?.error && evidence?.evidenceBySection) {
        await Entry.updateOne(
          { _id: entry._id },
          { $set: { evidenceBySection: evidence.evidenceBySection } },
        );
        console.log(`Evidence updated for entry ${entry._id}`);
      } else {
        const details = evidence?.details ? ` ${JSON.stringify(evidence.details)}` : "";
        console.warn(`Evidence skipped for entry ${entry._id}: ${evidence?.error}${details}`);
      }

      const clinicalEvidence = await generateClinicalEvidenceUnits(entryText);
      if (!clinicalEvidence?.error && clinicalEvidence?.evidenceUnits) {
        await Entry.updateOne(
          { _id: entry._id },
          { $set: { evidenceUnits: clinicalEvidence.evidenceUnits } },
        );
        console.log(`Evidence units updated for entry ${entry._id}`);
      } else {
        const details = clinicalEvidence?.details ? ` ${JSON.stringify(clinicalEvidence.details)}` : "";
        console.warn(`Evidence units skipped for entry ${entry._id}: ${clinicalEvidence?.error}${details}`);
      }

      await upsertEntrySignals({
        userId: entry.userId,
        entryId: entry._id,
        dateISO: entry.dateISO,
        data: {
          themes: entry.themes || [],
          themeIntensities: entry.themeIntensities || [],
          evidenceBySection: entry.evidenceBySection || {},
        },
        sourceUpdatedAt: entry.updatedAt,
      });
    }

    const weeks = Array.from(data.weeks).filter(Boolean).sort();
    for (let i = 0; i < weeks.length; i += 2) {
      const batch = weeks.slice(i, i + 2);
      const results = await Promise.all(
        batch.map((weekStartIso) => generateWeeklySummary({ userId, weekStartIso })),
      );
      results.forEach((result, index) => {
        if (result?.error) {
          console.warn(`Weekly summary error for ${batch[index]}: ${result.error}`);
        } else {
          console.log(`Weekly summary updated for ${batch[index]}`);
        }
      });
    }

    const rangeKeys = ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"];
    for (const rangeKey of rangeKeys) {
      await recomputeThemeSeriesForUser({ userId, rangeKey });
    }
    for (const rangeKey of rangeKeys) {
      await recomputeSnapshotForUser({ userId, rangeKey });
    }
    for (const rangeKey of rangeKeys) {
      await recomputeConnectionsForUser({ userId, rangeKey });
    }
    console.log(`Snapshots recomputed for user ${userId}`);
  }

  console.log("Derived rebuild complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
