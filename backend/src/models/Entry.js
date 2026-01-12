const mongoose = require("mongoose");

const emotionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    intensity: { type: Number, required: true },
    tone: { type: String, enum: ["positive", "neutral", "negative"], required: true },
  },
  { _id: false },
);

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    dateISO: { type: String },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    tags: { type: [String], default: [] },
    triggers: { type: [String], default: [] },
    themes: { type: [String], default: [] },
    emotions: { type: [emotionSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Entry", entrySchema);
