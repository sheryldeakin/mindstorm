const mongoose = require("mongoose");

const cycleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    sequence: { type: [String], default: [] },
    sourceNode: { type: String, index: true },
    targetNode: { type: String, index: true },
    frequency: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    lagDaysMin: { type: Number, default: 0 },
    avgLag: { type: Number, default: 0 },
    evidenceEntryIds: { type: [String], default: [] },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "cycles_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

cycleSchema.index({ userId: 1, rangeKey: 1, sourceNode: 1, targetNode: 1 }, { unique: true });

module.exports = mongoose.model("Cycle", cycleSchema);
