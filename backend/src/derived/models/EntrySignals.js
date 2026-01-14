const mongoose = require("mongoose");

const entrySignalsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: "Entry", required: true, index: true },
    dateISO: { type: String, required: true, index: true },
    themes: { type: [String], default: [] },
    themeIntensities: { type: [{ theme: String, intensity: Number }], default: [] },
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
    pipelineVersion: { type: Number, default: 1 },
    sourceUpdatedAt: { type: Date },
  },
  { timestamps: true },
);

entrySignalsSchema.index({ userId: 1, entryId: 1 }, { unique: true });

module.exports = mongoose.model("EntrySignals", entrySignalsSchema);
