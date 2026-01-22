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
  const uniqueEntryIds = Array.from(new Set(failures.map((row) => row.entryId)));

  if (!uniqueEntryIds.length) {
    console.log("No failed entries found to retry.");
    return;
  }

  await mongoose.connect(uri, { socketTimeoutMS: 45000 });

  const entries = await Entry.find({ _id: { $in: uniqueEntryIds } });
  const staleUserIds = new Set();

  const resolvedEntryIds = new Set();
  for (const entry of entries) {
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
      continue;
    }

    if (legacySignals?.summary) {
      entry.summary = legacySignals.summary;
    }
    if (legacySignals?.title && entry.title === "[LLM failed]") {
      entry.title = legacySignals.title;
    }
    entry.emotions = legacySignals?.emotions || entry.emotions || [];
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
    resolvedEntryIds.add(entry._id.toString());

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
  }

  for (const userId of staleUserIds) {
    await markDerivedStale({
      userId,
      rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
    });
  }

  failuresByFile.forEach((rows, filePath) => {
    const remaining = rows.filter((row) => !resolvedEntryIds.has(row.entryId));
    writeFailures(filePath, remaining);
  });

  await mongoose.disconnect();
  console.log(`Retry complete. Processed ${entries.length} entries.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
