const dotenv = require("dotenv");
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

const truncateSummary = (text) => `${text.slice(0, 150).trim()}...`;

const stripCodeFences = (text) =>
  text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

const extractJson = (text) => {
  if (!text) return null;
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
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
    const avgDuration =
      ewma ?? (Date.now() - start) / 1000 / Math.max(current, 1);
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

const buildSummaryPrompt = () =>
  [
    "You are generating a concise, patient-authored summary of a journal entry.",
    "Return strict JSON with one key: summary (1-2 sentences, reflective, non-clinical).",
  ].join(" ");

const generateSummaryWithLlm = async (bodyText) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey || "sk-local"}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSummaryPrompt() },
        { role: "user", content: `Journal entry:\n${bodyText}\nReturn JSON only.` },
      ],
      temperature: 0.2,
      max_tokens: 120,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = extractJson(content);
  if (!parsed || typeof parsed.summary !== "string") return null;
  return parsed.summary.trim();
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
  const args = process.argv.slice(2);
  const userArgIndex = args.indexOf("--user");
  const targetUserId =
    userArgIndex !== -1 && args[userArgIndex + 1] ? args[userArgIndex + 1] : null;
  const concurrencyArgIndex = args.indexOf("--concurrency");
  const concurrency =
    concurrencyArgIndex !== -1 && args[concurrencyArgIndex + 1]
      ? Math.max(1, Number.parseInt(args[concurrencyArgIndex + 1], 10))
      : 1;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri, { socketTimeoutMS: 45000 });

  const query = {
    $or: [{ body: { $exists: false } }, { body: "" }, { body: null }],
    summary: { $type: "string", $ne: "" },
    deletedAt: null,
  };
  if (targetUserId) {
    query.userId = targetUserId;
  }

  const entries = await Entry.find(query).lean();
  const total = entries.length;
  const progress = createProgress(total, "Migrating entries");

  let updated = 0;
  let llmFailures = 0;
  let evidenceFailures = 0;
  let clinicalFailures = 0;
  let legacyFailures = 0;
  const staleUserIds = new Set();
  let nextIndex = 0;
  const runWithConcurrency = async () => {
    const workers = Array.from({ length: Math.min(concurrency, total || 1) }, async () => {
      while (nextIndex < total) {
        const entry = entries[nextIndex];
        nextIndex += 1;
        const startTime = Date.now();
    const summary = typeof entry.summary === "string" ? entry.summary : "";
    if (!summary) continue;
    const bodyText = summary.trim();
    if (!bodyText) continue;
    let summaryText = truncateSummary(bodyText);
    let legacySignals = null;
    let evidenceBySection = null;
    let evidenceUnits = null;
    const entryText = `Title: ${entry.title || "Untitled reflection"}\nEntry: ${bodyText}`;

    try {
      const llmSummary = await generateSummaryWithLlm(bodyText);
      if (llmSummary) summaryText = llmSummary;
    } catch (error) {
      llmFailures += 1;
      console.warn(
        `Summary LLM failed for entry ${entry._id}: ${error?.message || error}`,
      );
    }

    try {
      const legacyResult = await generateLegacyEntryAnalysis(bodyText);
      if (!legacyResult?.error && legacyResult?.data) {
        legacySignals = legacyResult.data;
      }
    } catch (error) {
      legacyFailures += 1;
      console.warn(
        `Legacy analysis failed for entry ${entry._id}: ${error?.message || error}`,
      );
    }

    if (!entry.evidenceBySection || !Object.keys(entry.evidenceBySection || {}).length) {
      try {
        const evidenceResult = await generateEntryEvidence(entryText);
        if (!evidenceResult?.error && evidenceResult?.evidenceBySection) {
          evidenceBySection = evidenceResult.evidenceBySection;
        } else if (evidenceResult?.error) {
          evidenceFailures += 1;
          console.warn(
            `Evidence snippets failed for entry ${entry._id}: ${evidenceResult.error}`,
          );
        }
      } catch (error) {
        evidenceFailures += 1;
        console.warn(
          `Evidence snippets failed for entry ${entry._id}: ${error?.message || error}`,
        );
      }
    }

    if (!Array.isArray(entry.evidenceUnits) || entry.evidenceUnits.length === 0) {
      try {
        const clinicalEvidence = await generateClinicalEvidenceUnits(entryText);
        if (!clinicalEvidence?.error && Array.isArray(clinicalEvidence?.evidenceUnits)) {
          evidenceUnits = clinicalEvidence.evidenceUnits;
        } else if (clinicalEvidence?.error) {
          clinicalFailures += 1;
          console.warn(
            `Evidence units failed for entry ${entry._id}: ${clinicalEvidence.error}`,
          );
        }
      } catch (error) {
        clinicalFailures += 1;
        console.warn(
          `Evidence units failed for entry ${entry._id}: ${error?.message || error}`,
        );
      }
    }

    const updatePayload = {
      body: bodyText,
      summary: summaryText,
    };
    if (legacySignals) {
      updatePayload.emotions = legacySignals.emotions || [];
      updatePayload.themes = legacySignals.themes || [];
      updatePayload.triggers = legacySignals.triggers || [];
      updatePayload.themeIntensities = legacySignals.themeIntensities || [];
      updatePayload.languageReflection = legacySignals.languageReflection || "";
      updatePayload.timeReflection = legacySignals.timeReflection || "";
    }
    if (evidenceBySection) {
      updatePayload.evidenceBySection = evidenceBySection;
    }
    if (Array.isArray(evidenceUnits)) {
      updatePayload.evidenceUnits = evidenceUnits;
    }

    await Entry.updateOne(
      { _id: entry._id },
      { $set: updatePayload },
    );

    staleUserIds.add(entry.userId.toString());

    await upsertEntrySignals({
      userId: entry.userId,
      entryId: entry._id,
      dateISO: entry.dateISO,
      data: {
        themes: updatePayload.themes || entry.themes || [],
        themeIntensities: updatePayload.themeIntensities || entry.themeIntensities || [],
        evidenceUnits: updatePayload.evidenceUnits || entry.evidenceUnits || [],
      },
      sourceUpdatedAt: entry.updatedAt,
    });

    if (entry.dateISO) {
      const weekStartIso = getWeekStartIso(entry.dateISO);
      if (weekStartIso) {
        await generateWeeklySummary({ userId: entry.userId, weekStartIso });
      }
    }

    updated += 1;
    const duration = (Date.now() - startTime) / 1000;
    progress.render(updated, duration);
      }
    });
    await Promise.all(workers);
  };

  await runWithConcurrency();
  progress.done();

  for (const userId of staleUserIds) {
    await markDerivedStale({
      userId,
      rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
    });
  }

  console.log(`Migration complete. Updated ${updated} entries.`);
  if (llmFailures) {
    console.log(`LLM summary failures: ${llmFailures} (used truncation fallback).`);
  }
  if (legacyFailures) {
    console.log(`Legacy analysis failures: ${legacyFailures}.`);
  }
  if (evidenceFailures) {
    console.log(`Evidence snippet failures: ${evidenceFailures}.`);
  }
  if (clinicalFailures) {
    console.log(`Evidence unit failures: ${clinicalFailures}.`);
  }
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
