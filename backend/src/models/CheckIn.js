const mongoose = require("mongoose");

const checkInMetricSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

const checkInSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dateISO: { type: String, required: true, index: true },
    metrics: { type: [checkInMetricSchema], default: [] },
    tags: { type: [String], default: [] },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

checkInSchema.index({ userId: 1, dateISO: 1 }, { unique: true });

/** Mongoose model for daily check-in snapshots. */
module.exports = mongoose.model("CheckIn", checkInSchema);
