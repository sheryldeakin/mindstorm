const mongoose = require("mongoose");

const emotionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    intensity: { type: Number, required: true },
    tone: { type: String, enum: ["positive", "neutral", "negative"], required: true },
  },
  { _id: false },
);

const evidenceAttributesSchema = new mongoose.Schema(
  {
    polarity: { type: String, enum: ["PRESENT", "ABSENT"], default: null },
    temporality: { type: String, default: null },
    frequency: { type: String, default: null },
    severity: { type: String, default: null },
    attribution: { type: String, default: null },
    uncertainty: { type: String, enum: ["LOW", "HIGH"], default: null },
  },
  { _id: false },
);

const evidenceUnitSchema = new mongoose.Schema(
  {
    span: { type: String, required: true },
    label: { type: String, required: true },
    attributes: { type: evidenceAttributesSchema, default: {} },
  },
  { _id: false },
);

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    dateISO: { type: String },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    tags: { type: [String], default: [] },
    triggers: { type: [String], default: [] },
    themes: { type: [String], default: [] },
    themeIntensities: {
      type: [{ theme: String, intensity: Number }],
      default: [],
    },
    emotions: { type: [emotionSchema], default: [] },
    evidenceBySection: {
      recurringExperiences: { type: [String], default: [] },
      impactAreas: { type: [String], default: [] },
      relatedInfluences: { type: [String], default: [] },
      unclearAreas: { type: [String], default: [] },
      questionsToExplore: { type: [String], default: [] },
    },
    evidenceUnits: { type: [evidenceUnitSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Entry", entrySchema);
