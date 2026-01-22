const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const WeeklySummary = require("../src/models/WeeklySummary");
const fs = require("fs");
const path = require("path");
const {
  generateClinicalEvidenceUnits,
  generateWeeklySummary,
} = require("../src/controllers/aiController");
const { recomputeSnapshotForUser } = require("../src/derived/services/snapshotRecompute");
const { upsertEntrySignals } = require("../src/derived/services/derivedService");
const { recomputeConnectionsForUserRanges } = require("../src/derived/services/connectionsRecompute");
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
 * Runs async work with a fixed concurrency.
 * @param {Array<unknown>} items
 * @param {number} limit
 * @param {(item: any) => Promise<void>} handler
 * @returns {Promise<void>}
 */
const runWithConcurrency = async (items, limit, handler) => {
  if (!items.length) return;
  const safeLimit = Math.max(1, Math.min(limit, items.length));
  let index = 0;
  const workers = Array.from({ length: safeLimit }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await handler(current);
    }
  });
  await Promise.all(workers);
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
  const samples = [];
  const maxSamples = 10;
  const formatEta = (seconds) => {
    const rounded = Math.max(0, Math.round(seconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  };
  const render = (current) => {
    const percent = Math.min(current / safeTotal, 1);
    const width = 24;
    const filled = Math.round(width * percent);
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    const elapsed = (Date.now() - start) / 1000;
    if (current > 0) {
      samples.push(elapsed / current);
      if (samples.length > maxSamples) samples.shift();
    }
    const avgSecondsPerItem = samples.length
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;
    const remaining = Math.max(0, safeTotal - current);
    const eta = avgSecondsPerItem * remaining;
    const line = `${label} [${bar}] ${(percent * 100).toFixed(1)}% (${current}/${safeTotal}) ETA ${formatEta(eta)}`;
    process.stdout.write(`\r${line}`);
  };
  const done = () => {
    process.stdout.write("\n");
  };
  return { render, done };
};

const logDir = path.resolve(__dirname, "..", "..", "log");
const failureLogPath = path.join(logDir, "rebuild-derived_failures.csv");

const ensureLogDir = () => {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

const csvValue = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
};

const logFailure = ({ entryId, userId, step, error }) => {
  ensureLogDir();
  const header = "script,entryId,userId,step,error,timestamp\n";
  if (!fs.existsSync(failureLogPath)) {
    fs.writeFileSync(failureLogPath, header, "utf8");
  }
  const row = [
    csvValue("rebuild-derived"),
    csvValue(entryId || ""),
    csvValue(userId || ""),
    csvValue(step || ""),
    csvValue(error || ""),
    csvValue(new Date().toISOString()),
  ].join(",");
  fs.appendFileSync(failureLogPath, `${row}\n`, "utf8");
};

const retryWithBackoff = async (fn, { retries, label }) => {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delayMs = 500 * 2 ** attempt;
      console.warn(`${label} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    attempt += 1;
  }
  throw lastError;
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
  const concurrency = Number.isFinite(Number(args.concurrency))
    ? Math.max(1, Number(args.concurrency))
    : 2;
  const maxRetries = Number.parseInt(
    process.env.REBUILD_LLM_RETRIES || process.env.SEED_LLM_RETRIES || "2",
    10,
  );
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri, { socketTimeoutMS: 45000 });

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
    await runWithConcurrency(data.entries, concurrency, async (entry) => {
      const entryText = `Title: ${entry.title}\nEntry: ${entry.body || entry.summary || ""}`;
      let updatedEvidenceUnits = entry.evidenceUnits || [];
      if (!onlyMissing || !entry.evidenceUnits) {
        try {
          const clinicalEvidence = await retryWithBackoff(
            () => generateClinicalEvidenceUnits(entryText),
            { retries: maxRetries, label: "Rebuild evidence units" },
          );
          if (!clinicalEvidence?.error && clinicalEvidence?.evidenceUnits) {
            updatedEvidenceUnits = clinicalEvidence.evidenceUnits;
            await Entry.updateOne(
              { _id: entry._id },
              { $set: { evidenceUnits: updatedEvidenceUnits } },
            );
            console.log(`Evidence units updated for entry ${entry._id}`);
          } else if (clinicalEvidence?.error) {
            const details = clinicalEvidence?.details ? ` ${JSON.stringify(clinicalEvidence.details)}` : "";
            logFailure({
              entryId: entry._id?.toString(),
              userId: entry.userId?.toString(),
              step: "evidence_units",
              error: `${clinicalEvidence?.error}${details}`,
            });
            await Entry.updateOne(
              { _id: entry._id },
              { $set: { title: "[LLM failed]", meta: { source: "fallback" } } },
            );
            return;
          }
        } catch (error) {
          logFailure({
            entryId: entry._id?.toString(),
            userId: entry.userId?.toString(),
            step: "evidence_units",
            error: error?.message || String(error),
          });
          await Entry.updateOne(
            { _id: entry._id },
            { $set: { title: "[LLM failed]", meta: { source: "fallback" } } },
          );
          return;
        }
      }

      await upsertEntrySignals({
        userId: entry.userId,
        entryId: entry._id,
        dateISO: entry.dateISO,
        data: {
          themes: entry.themes || [],
          themeIntensities: entry.themeIntensities || [],
          evidenceUnits: updatedEvidenceUnits,
        },
        sourceUpdatedAt: entry.updatedAt,
      });
      entryCount += 1;
      entryProgress.render(entryCount);
    });
    entryProgress.done();

    const weeks = Array.from(data.weeks).filter(Boolean).sort();
    const weekProgress = createProgress(weeks.length, `Summaries ${userId}`);
    let weekCount = 0;
    await runWithConcurrency(weeks, concurrency, async (weekStartIso) => {
      if (onlyMissing) {
        const existing = await WeeklySummary.findOne({ userId, weekStartISO: weekStartIso }).lean();
        if (existing) {
          weekCount += 1;
          weekProgress.render(weekCount);
          return;
        }
      }
      try {
        const result = await retryWithBackoff(
          () => generateWeeklySummary({ userId, weekStartIso }),
          { retries: maxRetries, label: "Rebuild weekly summary" },
        );
        if (result?.error) {
          logFailure({
            entryId: "",
            userId,
            step: "weekly_summary",
            error: result.error,
          });
          console.warn(`Weekly summary error for ${weekStartIso}: ${result.error}`);
        } else {
          console.log(`Weekly summary updated for ${weekStartIso}`);
        }
      } catch (error) {
        logFailure({
          entryId: "",
          userId,
          step: "weekly_summary",
          error: error?.message || String(error),
        });
        console.warn(`Weekly summary error for ${weekStartIso}: ${error?.message || error}`);
      }
      weekCount += 1;
      weekProgress.render(weekCount);
    });
    weekProgress.done();

    const rangeKeys = ["all_time", "last_7_days", "last_30_days", "last_90_days", "last_365_days"];
    for (const rangeKey of rangeKeys) {
      await recomputeThemeSeriesForUser({ userId, rangeKey });
    }
    for (const rangeKey of rangeKeys) {
      await recomputeSnapshotForUser({ userId, rangeKey });
    }
    await recomputeConnectionsForUserRanges({ userId, rangeKeys });
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
