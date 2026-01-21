const mongoose = require("mongoose");

const llmGenerationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true, index: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    computedAt: { type: Date },
    pipelineVersion: { type: String, default: "llmCopy_v1" },
    sourceVersion: { type: String },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

llmGenerationSchema.index({ userId: 1, key: 1 }, { unique: true });

/** Mongoose model for cached LLM generations. */
module.exports = mongoose.model("LLMGeneration", llmGenerationSchema);
