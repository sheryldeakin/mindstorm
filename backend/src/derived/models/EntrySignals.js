const mongoose = require("mongoose");

const entrySignalsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: "Entry", required: true, index: true },
    dateISO: { type: String, required: true, index: true },
    themes: { type: [String], default: [] },
    themeIntensities: { type: [{ theme: String, intensity: Number }], default: [] },
    evidenceUnits: { type: [mongoose.Schema.Types.Mixed], default: [] },
    timeMentions: { type: [String], default: [] },
    lifeAreas: { type: [String], default: [] },
    influences: { type: [String], default: [] },
    evidenceBySection: {
      recurringExperiences: { type: [String], default: [] },
      impactAreas: { type: [String], default: [] },
      relatedInfluences: { type: [String], default: [] },
      unclearAreas: { type: [String], default: [] },
      questionsToExplore: { type: [String], default: [] },
    },
    pipelineVersion: { type: String, default: "entrySignals_v1" },
    sourceVersion: { type: String },
    sourceUpdatedAt: { type: Date },
    computedAt: { type: Date },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

entrySignalsSchema.index({ userId: 1, entryId: 1 }, { unique: true });

module.exports = mongoose.model("EntrySignals", entrySignalsSchema);
