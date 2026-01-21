const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    trend: { type: String, enum: ["up", "down", "steady"], default: "steady" },
  },
  { timestamps: true },
);

/** Mongoose model for generated patient insights. */
module.exports = mongoose.model("Insight", insightSchema);
