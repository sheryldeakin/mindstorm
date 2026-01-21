const mongoose = require("mongoose");

const weeklySummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStartISO: { type: String, required: true, index: true },
    weekEndISO: { type: String, required: true },
    summary: {
      recurringExperiences: { type: [String], default: [] },
      overTimeSummary: { type: String, default: "" },
      intensityLines: { type: [String], default: [] },
      impactAreas: { type: [String], default: [] },
      relatedInfluences: { type: [String], default: [] },
      unclearAreas: { type: [String], default: [] },
      questionsToExplore: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

weeklySummarySchema.index({ userId: 1, weekStartISO: 1 }, { unique: true });

/** Mongoose model for weekly patient summary snapshots. */
module.exports = mongoose.model("WeeklySummary", weeklySummarySchema);
