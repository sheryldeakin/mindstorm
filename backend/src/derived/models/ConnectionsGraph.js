const mongoose = require("mongoose");

const connectionsGraphSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    nodes: { type: [{ id: String, label: String }], default: [] },
    edges: {
      type: [
        {
          id: String,
          from: String,
          to: String,
          weight: Number,
          evidenceEntryIds: [String],
        },
      ],
      default: [],
    },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "connectionsGraph_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

connectionsGraphSchema.index({ userId: 1, rangeKey: 1 }, { unique: true });

/** Mongoose model for derived connections graph caches. */
module.exports = mongoose.model("ConnectionsGraph", connectionsGraphSchema);
