const Entry = require("../models/Entry");
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

const listEntries = asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const offset = Number.parseInt(req.query.offset, 10) || 0;
  const entries = await Entry.find({ userId: req.user._id })
    .sort({ dateISO: -1, createdAt: -1 })
    .skip(Math.max(0, offset))
    .limit(limit)
    .lean();
  const total = await Entry.countDocuments({ userId: req.user._id });

  const formatted = entries.map((entry) => ({
    id: entry._id.toString(),
    date: entry.date,
    dateISO: entry.dateISO,
    title: entry.title,
    summary: entry.summary,
    tags: entry.tags || [],
    triggers: entry.triggers || [],
    themes: entry.themes || [],
    emotions: entry.emotions || [],
  }));

  res.json({ entries: formatted, total });
});

const createEntry = asyncHandler(async (req, res) => {
  const { title, summary, tags = [], triggers = [], themes = [], emotions = [], date, dateISO } = req.body;

  if (!title || !summary) {
    return res.status(400).json({ message: "Title and summary are required." });
  }

  const parsedDate = dateISO ? parseDateInput(dateISO) : parseDateInput(date);
  const normalizedDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const entryDate = formatFriendlyDate(normalizedDate);
  const entryDateISO = formatDateIso(normalizedDate);

  const entry = await Entry.create({
    userId: req.user._id,
    date: entryDate,
    dateISO: entryDateISO,
    title,
    summary,
    tags,
    triggers,
    themes,
    emotions,
  });

  res.status(201).json({
    entry: {
      id: entry._id.toString(),
      date: entry.date,
      dateISO: entry.dateISO,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
    },
  });
});

const getEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id }).lean();
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
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  });
});

const updateEntry = asyncHandler(async (req, res) => {
  const { title, summary, tags, triggers, themes, emotions, date, dateISO } = req.body;

  const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entry) {
    return res.status(404).json({ message: "Entry not found." });
  }

  if (title !== undefined) entry.title = title;
  if (summary !== undefined) entry.summary = summary;
  if (tags !== undefined) entry.tags = tags;
  if (triggers !== undefined) entry.triggers = triggers;
  if (themes !== undefined) entry.themes = themes;
  if (emotions !== undefined) entry.emotions = emotions;

  if (dateISO || date) {
    const parsedDate = dateISO ? parseDateInput(dateISO) : parseDateInput(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      entry.date = formatFriendlyDate(parsedDate);
      entry.dateISO = formatDateIso(parsedDate);
    }
  }

  await entry.save();

  res.json({
    entry: {
      id: entry._id.toString(),
      date: entry.date,
      dateISO: entry.dateISO,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags || [],
      triggers: entry.triggers || [],
      themes: entry.themes || [],
      emotions: entry.emotions || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!entry) {
    return res.status(404).json({ message: "Entry not found." });
  }

  res.status(204).send();
});

module.exports = { listEntries, createEntry, getEntry, updateEntry, deleteEntry };
