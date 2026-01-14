const mongoose = require("mongoose");

const themeSeriesSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rangeKey: { type: String, required: true, index: true },
    theme: { type: String, required: true, index: true },
    points: {
      type: [
        {
          dateISO: String,
          intensity: Number,
          confidence: Number,
        },
      ],
      default: [],
    },
    computedAt: { type: Date },
    pipelineVersion: { type: Number, default: 1 },
    sourceVersion: { type: Date },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

themeSeriesSchema.index({ userId: 1, rangeKey: 1, theme: 1 }, { unique: true });

module.exports = mongoose.model("ThemeSeries", themeSeriesSchema);
