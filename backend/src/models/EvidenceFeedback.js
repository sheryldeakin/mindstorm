const mongoose = require("mongoose");

const EvidenceFeedbackSchema = new mongoose.Schema(
  {
    clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    entryDateISO: { type: String, required: true },
    span: { type: String, required: true },
    label: { type: String, required: true },
    feedbackType: {
      type: String,
      enum: ["correct", "wrong_label", "wrong_polarity"],
      required: true,
    },
  },
  { timestamps: true },
);

/** Mongoose model for clinician feedback on evidence unit labeling. */
module.exports = mongoose.model("EvidenceFeedback", EvidenceFeedbackSchema);
