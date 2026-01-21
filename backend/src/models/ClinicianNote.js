const mongoose = require("mongoose");

const clinicianNoteSchema = new mongoose.Schema(
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
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

clinicianNoteSchema.index({ clinicianId: 1, patientId: 1, createdAt: -1 });

/** Mongoose model for clinician notes on a patient case. */
module.exports = mongoose.model("ClinicianNote", clinicianNoteSchema);
