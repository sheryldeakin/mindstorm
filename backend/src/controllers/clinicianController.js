const asyncHandler = require("../utils/asyncHandler");
const Entry = require("../models/Entry");
const User = require("../models/User");
const ClinicianOverride = require("../models/ClinicianOverride");
const ClinicianNote = require("../models/ClinicianNote");
const EvidenceFeedback = require("../models/EvidenceFeedback");

/**
 * List clinician-visible cases with summary metrics.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { cases }.
 */
const listCases = asyncHandler(async (_req, res) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 29);
  const thresholdIso = threshold.toISOString().slice(0, 10);
  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(threshold);
    date.setDate(threshold.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const cases = await Entry.aggregate([
    { $match: { deletedAt: null } },
    { $sort: { userId: 1, dateISO: 1 } },
    {
      $group: {
        _id: "$userId",
        totalEntries: { $sum: 1 },
        lastEntryDate: { $max: "$dateISO" },
        lastEntryId: { $last: "$_id" },
        lastRiskSignal: { $last: "$risk_signal" },
        entriesLast30Days: {
          $sum: { $cond: [{ $gte: ["$dateISO", thresholdIso] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: "$_id",
        totalEntries: 1,
        lastEntryDate: 1,
        lastEntryId: 1,
        lastRiskSignal: 1,
        entriesLast30Days: 1,
        name: "$user.name",
        email: "$user.email",
      },
    },
    { $sort: { lastEntryDate: -1 } },
  ]);

  const densityRows = await Entry.aggregate([
    { $match: { deletedAt: null, dateISO: { $gte: thresholdIso } } },
    {
      $group: {
        _id: { userId: "$userId", dateISO: "$dateISO" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.userId",
        counts: { $push: { dateISO: "$_id.dateISO", count: "$count" } },
      },
    },
  ]);

  const densityMap = densityRows.reduce((acc, row) => {
    acc[row._id.toString()] = row.counts;
    return acc;
  }, {});

  res.json({
    cases: cases.map((item) => ({
      userId: item.userId.toString(),
      name: item.name || "Unknown patient",
      email: item.email || "",
      totalEntries: item.totalEntries || 0,
      entriesLast30Days: item.entriesLast30Days || 0,
      entriesLast30DaysSeries: last30Days.map((dateISO) => {
        const rows = densityMap[item.userId.toString()] || [];
        const match = rows.find((row) => row.dateISO === dateISO);
        return match ? match.count : 0;
      }),
      lastEntryDate: item.lastEntryDate || "",
      lastRiskSignal: item.lastRiskSignal || null,
    })),
  });
});

/**
 * Fetch entries for a clinician-selected patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { user, entries }.
 */
const getCaseEntries = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const entries = await Entry.find({ userId, deletedAt: null })
    .sort({ dateISO: 1 })
    .select("dateISO summary risk_signal evidenceUnits")
    .lean();

  const user = await User.findById(userId).select("name email").lean();

  res.json({
    user: user
      ? { id: userId, name: user.name || "Unknown patient", email: user.email || "" }
      : { id: userId, name: "Unknown patient", email: "" },
    entries: entries.map((entry) => ({
      id: entry._id.toString(),
      dateISO: entry.dateISO,
      summary: entry.summary,
      risk_signal: entry.risk_signal || null,
      evidenceUnits: entry.evidenceUnits || [],
    })),
  });
});

/**
 * Fetch clinician overrides for a patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { overrides }.
 */
const getCaseOverrides = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clinicianId = req.user._id;
  const overrides = await ClinicianOverride.find({ clinicianId, patientId: userId })
    .sort({ updatedAt: -1 })
    .lean();
  res.json({
    overrides: overrides.map((item) => ({
      id: item._id.toString(),
      nodeId: item.nodeId,
      status: item.status,
      originalStatus: item.originalStatus || "UNKNOWN",
      originalEvidence: item.originalEvidence || "",
      note: item.note || "",
      updatedAt: item.updatedAt,
    })),
  });
});

/**
 * Create or update a clinician override for a diagnostic node.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { override }.
 */
const upsertCaseOverride = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clinicianId = req.user._id;
  const { nodeId, status, originalStatus, originalEvidence, note } = req.body || {};

  if (!nodeId || !status) {
    return res.status(400).json({ message: "nodeId and status are required." });
  }

  const update = {
    clinicianId,
    patientId: userId,
    nodeId,
    status,
    originalStatus: originalStatus || "UNKNOWN",
    originalEvidence: originalEvidence || "",
    note: note || "",
  };

  const override = await ClinicianOverride.findOneAndUpdate(
    { clinicianId, patientId: userId, nodeId },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.json({
    override: {
      id: override._id.toString(),
      nodeId: override.nodeId,
      status: override.status,
      originalStatus: override.originalStatus,
      originalEvidence: override.originalEvidence,
      note: override.note || "",
      updatedAt: override.updatedAt,
    },
  });
});

/**
 * Delete a clinician override for a diagnostic node.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { status }.
 */
const deleteCaseOverride = asyncHandler(async (req, res) => {
  const { userId, nodeId } = req.params;
  const clinicianId = req.user._id;
  await ClinicianOverride.findOneAndDelete({ clinicianId, patientId: userId, nodeId });
  res.json({ status: "deleted" });
});

/**
 * Fetch clinician notes for a patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { notes }.
 */
const getCaseNotes = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clinicianId = req.user._id;
  const notes = await ClinicianNote.find({ clinicianId, patientId: userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    notes: notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  });
});

/**
 * Create a clinician note for a patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { note }.
 */
const createCaseNote = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clinicianId = req.user._id;
  const { title, body } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ message: "title and body are required." });
  }
  const note = await ClinicianNote.create({
    clinicianId,
    patientId: userId,
    title,
    body,
  });
  res.status(201).json({
    note: {
      id: note._id.toString(),
      title: note.title,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  });
});

/**
 * Update a clinician note for a patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { note }.
 */
const updateCaseNote = asyncHandler(async (req, res) => {
  const { userId, noteId } = req.params;
  const clinicianId = req.user._id;
  const { title, body } = req.body || {};
  const note = await ClinicianNote.findOneAndUpdate(
    { _id: noteId, clinicianId, patientId: userId },
    { title, body },
    { new: true },
  );
  if (!note) {
    return res.status(404).json({ message: "Note not found." });
  }
  res.json({
    note: {
      id: note._id.toString(),
      title: note.title,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  });
});

/**
 * Delete a clinician note for a patient.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { status }.
 */
const deleteCaseNote = asyncHandler(async (req, res) => {
  const { userId, noteId } = req.params;
  const clinicianId = req.user._id;
  await ClinicianNote.findOneAndDelete({ _id: noteId, clinicianId, patientId: userId });
  res.json({ status: "deleted" });
});

/**
 * Create clinician feedback on an evidence unit.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { feedback }.
 */
const createEvidenceFeedback = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const clinicianId = req.user._id;
  const { entryDateISO, span, label, feedbackType } = req.body || {};
  if (!entryDateISO || !span || !label || !feedbackType) {
    return res.status(400).json({ message: "entryDateISO, span, label, feedbackType are required." });
  }
  const feedback = await EvidenceFeedback.create({
    clinicianId,
    patientId: userId,
    entryDateISO,
    span,
    label,
    feedbackType,
  });
  res.status(201).json({
    feedback: {
      id: feedback._id.toString(),
      entryDateISO: feedback.entryDateISO,
      span: feedback.span,
      label: feedback.label,
      feedbackType: feedback.feedbackType,
      createdAt: feedback.createdAt,
    },
  });
});

module.exports = {
  listCases,
  getCaseEntries,
  getCaseOverrides,
  upsertCaseOverride,
  deleteCaseOverride,
  getCaseNotes,
  createCaseNote,
  updateCaseNote,
  deleteCaseNote,
  createEvidenceFeedback,
};
