const mongoose = require("mongoose");

const cycleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    sequence: { type: [String], default: [] },
    evidenceEntryIds: { type: [String], default: [] },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "cycles_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

cycleSchema.index({ userId: 1, rangeKey: 1 }, { unique: true });

module.exports = mongoose.model("Cycle", cycleSchema);
