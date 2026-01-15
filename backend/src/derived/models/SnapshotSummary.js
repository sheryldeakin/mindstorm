const mongoose = require("mongoose");

const snapshotSummarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "snapshot_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

snapshotSummarySchema.index({ userId: 1, rangeKey: 1 }, { unique: true });

module.exports = mongoose.model("SnapshotSummary", snapshotSummarySchema);
