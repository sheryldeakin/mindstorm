const Entry = require("../models/Entry");
const EntrySignals = require("../derived/models/EntrySignals");
const {
  generateClinicalEvidenceUnits,
  generateWeeklySummary,
  generateLegacyEntryAnalysis,
} = require("./aiController");
const { markDerivedStale, upsertEntrySignals } = require("../derived/services/derivedService");

const getWeekStartIso = (dateIso) => {
  if (!dateIso) return null;
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};
const asyncHandler = require("../utils/asyncHandler");

const formatFriendlyDate = (date = new Date()) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const formatDateIso = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

/**
 * List recent entries for the authenticated user with pagination.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { entries, total }.
 */
const listEntries = asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const offset = Number.parseInt(req.query.offset, 10) || 0;
  const entries = await Entry.find({ userId: req.user._id, deletedAt: null })
    .sort({ dateISO: -1, createdAt: -1 })
    .skip(Math.max(0, offset))
    .limit(limit)
    .lean();
  const total = await Entry.countDocuments({ userId: req.user._id, deletedAt: null });

  const formatted = entries.map((entry) => ({
    id: entry._id.toString(),
    date: entry.date,
    dateISO: entry.dateISO,
    title: entry.title,
    summary: entry.summary,
    body: entry.body || entry.summary,
    tags: entry.tags || [],
    triggers: entry.triggers || [],
    themes: entry.themes || [],
    emotions: entry.emotions || [],
    themeIntensities: entry.themeIntensities || [],
    languageReflection: entry.languageReflection || "",
    timeReflection: entry.timeReflection || "",
    evidenceUnits: entry.evidenceUnits || [],
  }));

  res.json({ entries: formatted, total });
});

/**
 * Create a new journal entry and derive evidence/signals.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { entry } or an error status.
 */
const createEntry = asyncHandler(async (req, res) => {
  const {
    title,
    summary,
    body,
    tags = [],
    triggers = [],
    themes = [],
    emotions = [],
    themeIntensities = [],
    languageReflection,
    timeReflection,
    date,
    dateISO,
    evidenceUnits,
  } = req.body;

  if (!title || (!summary && !body)) {
    return res.status(400).json({ message: "Title and summary or body are required." });
  }
  const entryBody = typeof body === "string" && body.trim()
    ? body.trim()
    : typeof summary === "string"
      ? summary.trim()
      : "";
  const entrySummary = typeof summary === "string" && summary.trim()
    ? summary.trim()
    : entryBody.slice(0, 150).trim();

  const parsedDate = dateISO ? parseDateInput(dateISO) : parseDateInput(date);
  const normalizedDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const entryDate = formatFriendlyDate(normalizedDate);
  const entryDateISO = formatDateIso(normalizedDate);

  const entry = await Entry.create({
    userId: req.user._id,
    date: entryDate,
    dateISO: entryDateISO,
    title,
    summary: entrySummary,
    body: entryBody,
    tags,
    triggers,
    themes,
    emotions,
    themeIntensities,
    languageReflection: typeof languageReflection === "string" ? languageReflection.trim() : "",
    timeReflection: typeof timeReflection === "string" ? timeReflection.trim() : "",
    evidenceUnits: Array.isArray(evidenceUnits) ? evidenceUnits : undefined,
  });

  res.status(201).json({
    entry: {
      id: entry._id.toString(),
      date: entry.date,
      dateISO: entry.dateISO,
      title: entry.title,
      summary: entry.summary,
      body: entry.body || entry.summary,
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
      themeIntensities: entry.themeIntensities || [],
      languageReflection: entry.languageReflection || "",
      timeReflection: entry.timeReflection || "",
      evidenceUnits: entry.evidenceUnits || [],
    },
  });

  setImmediate(async () => {
    try {
      console.log("[create-entry] post-save start", { entryId: entry._id.toString() });
      const freshEntry = await Entry.findOne({ _id: entry._id, userId: req.user._id });
      if (!freshEntry) return;
      const entryForSave = freshEntry;
      const entryBodyForSave = entryForSave.body || entryForSave.summary || entryBody;
      const shouldAnalyzeLegacy =
        !(entryForSave.emotions?.length || entryForSave.themes?.length || entryForSave.triggers?.length);
      const needsReflections = !entryForSave.languageReflection || !entryForSave.timeReflection;
      if (shouldAnalyzeLegacy || needsReflections) {
        const legacyResult = await generateLegacyEntryAnalysis(entryBodyForSave);
        if (!legacyResult?.error && legacyResult?.data) {
          if (shouldAnalyzeLegacy) {
            entryForSave.emotions = legacyResult.data.emotions || [];
            entryForSave.themes = legacyResult.data.themes || [];
            entryForSave.triggers = legacyResult.data.triggers || [];
            entryForSave.themeIntensities = legacyResult.data.themeIntensities || [];
          }
          if (!entryForSave.languageReflection) {
            entryForSave.languageReflection = legacyResult.data.languageReflection || "";
          }
          if (!entryForSave.timeReflection) {
            entryForSave.timeReflection = legacyResult.data.timeReflection || "";
          }
          await entryForSave.save();
          console.log("[create-entry] legacy signals saved", { entryId: entry._id.toString() });
        }
      }

      const hasEvidenceUnits = Array.isArray(evidenceUnits) && evidenceUnits.length > 0;
      const hasDraftUnits = hasEvidenceUnits && evidenceUnits.every((unit) => unit?.attributes?.type === "draft");
      if (!hasEvidenceUnits || hasDraftUnits) {
        const clinicalEvidenceResult = await generateClinicalEvidenceUnits(`Title: ${title}\nEntry: ${entryBodyForSave}`);
        if (!clinicalEvidenceResult?.error && clinicalEvidenceResult?.evidenceUnits) {
          entryForSave.evidenceUnits = clinicalEvidenceResult.evidenceUnits;
          await entryForSave.save();
          console.log("[create-entry] evidence units saved", { entryId: entry._id.toString() });
        }
      }

      const weekStartIso = getWeekStartIso(entryDateISO);
      if (weekStartIso) {
        await generateWeeklySummary({ userId: req.user._id, weekStartIso });
      }

      await upsertEntrySignals({
        userId: req.user._id,
        entryId: entry._id,
        dateISO: entry.dateISO,
        data: {
          themes: entryForSave.themes || [],
          themeIntensities: entryForSave.themeIntensities || [],
          evidenceUnits: entryForSave.evidenceUnits || [],
        },
        sourceUpdatedAt: entry.updatedAt,
      });
      await markDerivedStale({
        userId: req.user._id,
        rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
        sourceVersion: entry.updatedAt,
      });
      console.log("[create-entry] post-save complete", { entryId: entry._id.toString() });
    } catch (error) {
      console.warn("[create-entry] post-save processing failed", error?.message || error);
    }
  });
});

/**
 * Fetch a single entry by id for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { entry } or 404.
 */
const getEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null }).lean();
  if (!entry) {
    return res.status(404).json({ message: "Entry not found." });
  }

  res.json({
    entry: {
      id: entry._id.toString(),
      date: entry.date,
      dateISO: entry.dateISO,
      title: entry.title,
      summary: entry.summary,
      body: entry.body || entry.summary,
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
      languageReflection: entry.languageReflection || "",
      timeReflection: entry.timeReflection || "",
      evidenceUnits: entry.evidenceUnits || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  });
});

/**
 * Update an existing entry and refresh derived evidence/signals.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { entry } or an error status.
 */
const updateEntry = asyncHandler(async (req, res) => {
  const { title, summary, body, tags, triggers, themes, emotions, themeIntensities, date, dateISO } = req.body;

  const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
  if (!entry) {
    return res.status(404).json({ message: "Entry not found." });
  }

  if (title !== undefined) entry.title = title;
  if (summary !== undefined) entry.summary = summary;
  if (body !== undefined) entry.body = body;
  if (tags !== undefined) entry.tags = tags;
  if (triggers !== undefined) entry.triggers = triggers;
  if (themes !== undefined) entry.themes = themes;
  if (emotions !== undefined) entry.emotions = emotions;
  if (themeIntensities !== undefined) entry.themeIntensities = themeIntensities;

  if (summary !== undefined && body === undefined && !entry.body) {
    entry.body = summary;
  }
  if (body !== undefined && summary === undefined) {
    entry.summary = body.slice(0, 150).trim();
  }

  if (dateISO || date) {
    const parsedDate = dateISO ? parseDateInput(dateISO) : parseDateInput(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      entry.date = formatFriendlyDate(parsedDate);
      entry.dateISO = formatDateIso(parsedDate);
    }
  }

  await entry.save();

  if (summary !== undefined || title !== undefined || body !== undefined) {
    const entryText = entry.body || entry.summary || "";
    const clinicalEvidenceResult = await generateClinicalEvidenceUnits(
      `Title: ${entry.title}\nEntry: ${entryText}`,
    );
    if (!clinicalEvidenceResult?.error && clinicalEvidenceResult?.evidenceUnits) {
      entry.evidenceUnits = clinicalEvidenceResult.evidenceUnits;
      await entry.save();
    }
  }

  if (entry.dateISO) {
    const weekStartIso = getWeekStartIso(entry.dateISO);
    if (weekStartIso) {
      await generateWeeklySummary({ userId: req.user._id, weekStartIso });
    }
  }

  await upsertEntrySignals({
    userId: req.user._id,
    entryId: entry._id,
    dateISO: entry.dateISO,
    data: {
      themes: entry.themes || [],
      themeIntensities: entry.themeIntensities || [],
      evidenceUnits: entry.evidenceUnits || [],
    },
    sourceUpdatedAt: entry.updatedAt,
  });
  await markDerivedStale({
    userId: req.user._id,
    rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
    sourceVersion: entry.updatedAt,
  });

  res.json({
    entry: {
      id: entry._id.toString(),
      date: entry.date,
      dateISO: entry.dateISO,
      title: entry.title,
      summary: entry.summary,
      body: entry.body || entry.summary,
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
      themeIntensities: entry.themeIntensities || [],
      evidenceUnits: entry.evidenceUnits || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  });
});

/**
 * Delete an entry for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with 204 or 404.
 */
const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!entry) {
    return res.status(404).json({ message: "Entry not found." });
  }

  await EntrySignals.deleteOne({ userId: req.user._id, entryId: entry._id });
  await markDerivedStale({
    userId: req.user._id,
    rangeKey: ["last_7_days", "last_30_days", "last_90_days", "last_365_days", "all_time"],
    sourceVersion: new Date(),
  });

  res.status(204).send();
});

module.exports = { listEntries, createEntry, getEntry, updateEntry, deleteEntry };
