const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const WeeklySummary = require("../src/models/WeeklySummary");
const {
  generateEntryEvidence,
  generateClinicalEvidenceUnits,
  generateWeeklySummary,
} = require("../src/controllers/aiController");
const { recomputeSnapshotForUser } = require("../src/derived/services/snapshotRecompute");
const { upsertEntrySignals } = require("../src/derived/services/derivedService");
const { recomputeConnectionsForUser } = require("../src/derived/services/connectionsRecompute");
const { recomputeThemeSeriesForUser } = require("../src/derived/services/themeSeriesRecompute");
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
 * Creates a console progress bar renderer.
 * @param {number} total
 * @param {string} label
 * @returns {{ render: (current: number) => void, done: () => void }}
 */
const createProgress = (total, label) => {
  const start = Date.now();
  const safeTotal = total > 0 ? total : 1;
  const render = (current) => {
    const percent = Math.min(current / safeTotal, 1);
    const width = 24;
    const filled = Math.round(width * percent);
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    const elapsed = (Date.now() - start) / 1000;
    const eta = current > 0 ? ((elapsed / current) * (safeTotal - current)) : 0;
    const line = `${label} [${bar}] ${(percent * 100).toFixed(1)}% (${current}/${safeTotal}) ETA ${eta.toFixed(0)}s`;
    process.stdout.write(`\r${line}`);
  };
  const done = () => {
    process.stdout.write("\n");
  };
  return { render, done };
};

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
 * Rebuilds derived data for all users (entries, weekly summaries, and caches).
 * @returns {Promise<void>}
 */
const run = async () => {
  const uri = process.env.MONGODB_URI;
  const args = parseArgs(process.argv.slice(2));
  const onlyMissing = Boolean(args["only-missing"]);
  const targetUserId = args.user || null;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);

  const entryFilter = targetUserId ? { userId: targetUserId } : {};
  const entries = await Entry.find(entryFilter).lean();
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

    const entryProgress = createProgress(data.entries.length, `Entries ${userId}`);
    let entryCount = 0;
    for (const entry of data.entries) {
      const entryText = `Title: ${entry.title}\nSummary: ${entry.summary}`;
      if (!onlyMissing || !entry.evidenceBySection) {
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
      }

      if (!onlyMissing || !entry.evidenceUnits) {
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
      }

      await upsertEntrySignals({
        userId: entry.userId,
        entryId: entry._id,
        dateISO: entry.dateISO,
        data: {
          themes: entry.themes || [],
          themeIntensities: entry.themeIntensities || [],
          evidenceBySection: entry.evidenceBySection || {},
          evidenceUnits: entry.evidenceUnits || [],
        },
        sourceUpdatedAt: entry.updatedAt,
      });
      entryCount += 1;
      entryProgress.render(entryCount);
    }
    entryProgress.done();

    const weeks = Array.from(data.weeks).filter(Boolean).sort();
    const weekProgress = createProgress(weeks.length, `Summaries ${userId}`);
    let weekCount = 0;
    for (let i = 0; i < weeks.length; i += 2) {
      const batch = weeks.slice(i, i + 2);
      const weekTasks = onlyMissing
        ? await Promise.all(
            batch.map(async (weekStartIso) => {
              const existing = await WeeklySummary.findOne({ userId, weekStartISO: weekStartIso }).lean();
              return existing ? null : weekStartIso;
            }),
          )
        : batch;
      const batchToRun = weekTasks.filter(Boolean);
      if (!batchToRun.length) {
        weekCount += batch.length;
        weekProgress.render(weekCount);
        continue;
      }
      const results = await Promise.all(
        batchToRun.map((weekStartIso) => generateWeeklySummary({ userId, weekStartIso })),
      );
      results.forEach((result, index) => {
        if (result?.error) {
          console.warn(`Weekly summary error for ${batchToRun[index]}: ${result.error}`);
        } else {
          console.log(`Weekly summary updated for ${batchToRun[index]}`);
        }
        weekCount += 1;
        weekProgress.render(weekCount);
      });
    }
    weekProgress.done();

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
    for (const rangeKey of rangeKeys) {
      await recomputeCyclesForUser({ userId, rangeKey });
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
