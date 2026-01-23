const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");
const {
  generateEntryEvidence,
  generateClinicalEvidenceUnits,
  generateLegacyEntryAnalysis,
  generateWeeklySummary,
} = require("../src/controllers/aiController");
const { upsertEntrySignals, markDerivedStale } = require("../src/derived/services/derivedService");

dotenv.config();

const logDir = path.resolve(__dirname, "..", "..", "log");
const failureLogPath = path.join(logDir, "retry-failed-entries_failures.csv");

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
    csvValue("retry-failed-entries"),
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

const createProgress = (total, label) => {
  const start = Date.now();
  const safeTotal = total > 0 ? total : 1;
  let ewma = null;
  const alpha = 0.2;
  const formatDuration = (seconds) => {
    const totalSeconds = Math.max(0, Math.round(seconds));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  const render = (current, lastDuration) => {
    const percent = Math.min(current / safeTotal, 1);
    const width = 24;
    const filled = Math.round(width * percent);
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    if (Number.isFinite(lastDuration)) {
      ewma = ewma === null ? lastDuration : alpha * lastDuration + (1 - alpha) * ewma;
    }
    const avgDuration = ewma ?? (Date.now() - start) / 1000 / Math.max(current, 1);
    const eta = avgDuration * (safeTotal - current);
    const elapsedMinutes = Math.max((Date.now() - start) / 60000, 1 / 60);
    const rate = current / elapsedMinutes;
    const line = `${label} [${bar}] ${(percent * 100).toFixed(1)}% (${current}/${safeTotal}) ETA ${formatDuration(eta)} ${rate.toFixed(1)}/min`;
    process.stdout.write(`\r${line}`);
  };
  const done = () => {
    process.stdout.write("\n");
  };
  return { render, done };
};

const parseArgs = (argv) => {
  const args = { positional: [] };
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
    } else {
      args.positional.push(token);
    }
  }
  return args;
};

const readFailures = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const lines = raw.split("\n").slice(1);
  return lines
    .map((line) => line.split(",").map((value) => value.replace(/^"|"$/g, "").replace(/""/g, "\"")))
    .map(([script, entryId, userId, step, error]) => ({
      script,
      entryId,
      userId,
      step,
      error,
    }))
    .filter((row) => row.entryId);
};

const writeFailures = (filePath, rows) => {
  ensureLogDir();
  const header = "script,entryId,userId,step,error,timestamp\n";
  if (!rows.length) {
    fs.writeFileSync(filePath, header, "utf8");
    return;
  }
  const lines = rows.map((row) => [
    csvValue(row.script || ""),
    csvValue(row.entryId || ""),
    csvValue(row.userId || ""),
    csvValue(row.step || ""),
    csvValue(row.error || ""),
    csvValue(row.timestamp || new Date().toISOString()),
  ].join(","));
  fs.writeFileSync(filePath, `${header}${lines.join("\n")}\n`, "utf8");
};

const getWeekStartIso = (dateIso) => {
  if (!dateIso) return null;
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

const normalizeEmotions = (emotions) => {
  if (!Array.isArray(emotions)) return [];
  return emotions
    .map((emotion) => {
      if (!emotion || typeof emotion !== "object") return null;
      const label = typeof emotion.label === "string" ? emotion.label.trim() : "";
      if (!label) return null;
      const intensity = Number.isFinite(emotion.intensity) ? emotion.intensity : 0;
      const toneKey = typeof emotion.tone === "string" ? emotion.tone.trim().toLowerCase() : "";
      const tone = (
        {
          positive: "positive",
          neutral: "neutral",
          negative: "negative",
          heavy: "negative",
        }[toneKey] || "neutral"
      );
      return {
        label,
        intensity,
        tone,
      };
    })
    .filter(Boolean);
};

const loadFailures = (source) => {
  const sources = source === "all"
    ? ["seed-sample-entries", "migrate-entry-bodies", "rebuild-derived", "retry-failed-entries"]
    : [source];
  const files = sources.map((name) => path.join(logDir, `${name}_failures.csv`));
  const failuresByFile = new Map();
  files.forEach((filePath) => {
    failuresByFile.set(filePath, readFailures(filePath).map((row) => ({
      ...row,
      filePath,
      timestamp: new Date().toISOString(),
    })));
  });
  const failures = Array.from(failuresByFile.values()).flat();
  return { failuresByFile, failures };
};

const removeResolvedEntry = (failuresByFile, entryId) => {
  failuresByFile.forEach((rows, filePath) => {
    const remaining = rows.filter((row) => row.entryId !== entryId);
    if (remaining.length === rows.length) return;
    failuresByFile.set(filePath, remaining);
    writeFailures(filePath, remaining);
  });
};

const runOnce = async ({ source, maxRetries }) => {
  const { failuresByFile, failures } = loadFailures(source);
  const uniqueEntryIds = Array.from(new Set(failures.map((row) => row.entryId)));

  if (!uniqueEntryIds.length) {
    console.log("No failed entries found to retry.");
    return { processed: 0, remaining: 0 };
  }

  const entries = await Entry.find({ _id: { $in: uniqueEntryIds } });
  const staleUserIds = new Set();
  const resolvedEntryIds = new Set();
  const progress = createProgress(entries.length, "Retrying failures");
  let processed = 0;
  for (const entry of entries) {
    const stepStart = Date.now();
    const bodyText = entry.body || entry.summary || "";
    if (!bodyText) continue;
    const entryText = `Title: ${entry.title || "Untitled reflection"}\nEntry: ${bodyText}`;
    let legacySignals = null;
    let evidenceBySection = null;
    let evidenceUnits = null;
    let failedStep = null;

    try {
      const legacyResult = await retryWithBackoff(
        async () => {
          const result = await generateLegacyEntryAnalysis(bodyText);
          if (result?.error) throw new Error(result.error);
          return result;
        },
        { retries: maxRetries, label: "Retry legacy analysis" },
      );
      legacySignals = legacyResult?.data || null;
    } catch (error) {
      failedStep = { step: "legacy_analysis", error: error?.message || String(error) };
    }

    if (!failedStep) {
      try {
        const evidenceResult = await retryWithBackoff(
          () => generateEntryEvidence(entryText),
          { retries: maxRetries, label: "Retry evidence snippets" },
        );
        if (evidenceResult?.error) throw new Error(evidenceResult.error);
        evidenceBySection = evidenceResult?.evidenceBySection || null;
      } catch (error) {
        failedStep = { step: "evidence_snippets", error: error?.message || String(error) };
      }
    }

    if (!failedStep) {
      try {
        const clinicalEvidence = await retryWithBackoff(
          () => generateClinicalEvidenceUnits(entryText),
          { retries: maxRetries, label: "Retry evidence units" },
        );
        if (clinicalEvidence?.error) throw new Error(clinicalEvidence.error);
        evidenceUnits = Array.isArray(clinicalEvidence?.evidenceUnits)
          ? clinicalEvidence.evidenceUnits
          : null;
      } catch (error) {
        failedStep = { step: "evidence_units", error: error?.message || String(error) };
      }
    }

    if (failedStep) {
      logFailure({
        entryId: entry._id.toString(),
        userId: entry.userId?.toString(),
        step: failedStep.step,
        error: failedStep.error,
      });
      processed += 1;
      progress.render(processed, (Date.now() - stepStart) / 1000);
      continue;
    }

    if (legacySignals?.summary) {
      entry.summary = legacySignals.summary;
    }
    if (legacySignals?.title && entry.title === "[LLM failed]") {
      entry.title = legacySignals.title;
    }
    const mergedEmotions = legacySignals?.emotions || entry.emotions || [];
    entry.emotions = normalizeEmotions(mergedEmotions);
    entry.themes = legacySignals?.themes || entry.themes || [];
    entry.triggers = legacySignals?.triggers || entry.triggers || [];
    entry.themeIntensities = legacySignals?.themeIntensities || entry.themeIntensities || [];
    entry.languageReflection = legacySignals?.languageReflection || entry.languageReflection || "";
    entry.timeReflection = legacySignals?.timeReflection || entry.timeReflection || "";
    if (evidenceBySection) {
      entry.evidenceBySection = evidenceBySection;
    }
    if (evidenceUnits) {
      entry.evidenceUnits = evidenceUnits;
    }
    entry.meta = { ...(entry.meta || {}), source: "llm" };
    await entry.save();
    const entryId = entry._id.toString();
    resolvedEntryIds.add(entryId);
    removeResolvedEntry(failuresByFile, entryId);

    staleUserIds.add(entry.userId.toString());

    await upsertEntrySignals({
      userId: entry.userId,
      entryId: entry._id,
      dateISO: entry.dateISO,
      data: {
        themes: entry.themes || [],
        themeIntensities: entry.themeIntensities || [],
        evidenceUnits: entry.evidenceUnits || [],
      },
      sourceUpdatedAt: entry.updatedAt,
    });

    if (entry.dateISO) {
      const weekStartIso = getWeekStartIso(entry.dateISO);
      if (weekStartIso) {
        await generateWeeklySummary({ userId: entry.userId, weekStartIso });
      }
    }

    processed += 1;
    progress.render(processed, (Date.now() - stepStart) / 1000);
  }
  progress.done();

  for (const userId of staleUserIds) {
    await markDerivedStale({
      userId,
      rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
    });
  }

  const remainingCount = Array.from(failuresByFile.values()).flat().length;

  console.log(`Retry complete. Processed ${entries.length} entries.`);
  if (!remainingCount) {
    console.log("No failures remaining.");
  }
  return { processed: entries.length, remaining: remainingCount };
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  const args = parseArgs(process.argv.slice(2));
  const source = args.source || "all";
  const maxRetries = Number.parseInt(
    process.env.RETRY_LLM_RETRIES || process.env.SEED_LLM_RETRIES || "2",
    10,
  );
  const repeat = args.repeat ? Number.parseInt(String(args.repeat), 10) : 1;
  const untilClear = Boolean(args["until-clear"]);
  const maxRuns = args["max-runs"]
    ? Number.parseInt(String(args["max-runs"]), 10)
    : 10;

  if (Number.isNaN(repeat) || repeat < 1) {
    throw new Error("--repeat must be a positive integer.");
  }
  if (Number.isNaN(maxRuns) || maxRuns < 1) {
    throw new Error("--max-runs must be a positive integer.");
  }

  await mongoose.connect(uri, { socketTimeoutMS: 45000 });

  const initialFailures = loadFailures(source).failures.length;
  const overallProgress = initialFailures > 0
    ? createProgress(initialFailures, "Failures fixed")
    : null;
  const targetRuns = untilClear ? maxRuns : repeat;
  const runsProgress = !untilClear && targetRuns > 1
    ? createProgress(targetRuns, "Retry runs")
    : null;
  let runs = 0;
  let remaining = 0;
  while (runs < targetRuns) {
    const runStart = Date.now();
    runs += 1;
    const previousRemaining = remaining || initialFailures;
    const result = await runOnce({ source, maxRetries });
    remaining = result.remaining;
    const fixedThisRun = Math.max(previousRemaining - remaining, 0);
    const fixedTotal = Math.max(initialFailures - remaining, 0);
    if (overallProgress) {
      overallProgress.render(fixedTotal, (Date.now() - runStart) / 1000);
    }
    if (runsProgress) {
      runsProgress.render(runs, (Date.now() - runStart) / 1000);
    }
    console.log(
      `Retry run ${runs}${untilClear ? "" : `/${targetRuns}`} complete. Fixed ${fixedThisRun}, remaining ${remaining}.`,
    );
    if (untilClear && remaining === 0) {
      break;
    }
    if (!untilClear && runs >= targetRuns) {
      break;
    }
  }

  if (untilClear && remaining > 0) {
    console.log(`Stopped after ${runs} runs. Remaining failures: ${remaining}.`);
  }

  if (overallProgress) {
    overallProgress.done();
  }
  if (runsProgress) {
    runsProgress.done();
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
