const mongoose = require("mongoose");

const narrativeSchema = new mongoose.Schema(
  {
    timeRangeLabel: { type: String, default: "" },
    confidenceNote: { type: String, default: "" },
    whySharing: { type: String, default: "" },
    recurringExperiences: { type: [String], default: [] },
    overTimeSummary: { type: String, default: "" },
    intensityLines: { type: [String], default: [] },
    impactAreas: { type: [String], default: [] },
    impactNote: { type: String, default: "" },
    relatedInfluences: { type: [String], default: [] },
    unclearAreas: { type: [String], default: [] },
    questionsToExplore: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    shiftsOverTime: { type: [String], default: [] },
    contextImpactSummary: { type: String, default: "" },
  },
  { _id: false, strict: false },
);

const snapshotSchema = new mongoose.Schema(
  {
    narrative: { type: narrativeSchema, default: {} },
  },
  { _id: false, strict: false },
);

const snapshotSummarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    snapshot: { type: snapshotSchema, default: {} },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "snapshot_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

snapshotSummarySchema.index({ userId: 1, rangeKey: 1 }, { unique: true });

module.exports = mongoose.model("SnapshotSummary", snapshotSummarySchema);
