const mongoose = require("mongoose");

const clinicianOverrideSchema = new mongoose.Schema(
  {
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    nodeId: { type: String, required: true },
    status: { type: String, enum: ["MET", "EXCLUDED", "UNKNOWN"], required: true },
    originalStatus: { type: String, enum: ["MET", "EXCLUDED", "UNKNOWN"], default: "UNKNOWN" },
    originalEvidence: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

clinicianOverrideSchema.index({ clinicianId: 1, patientId: 1, nodeId: 1 }, { unique: true });

/** Mongoose model for clinician overrides on diagnostic logic nodes. */
module.exports = mongoose.model("ClinicianOverride", clinicianOverrideSchema);
