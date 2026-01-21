const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Mongoose model for user login sessions. */
module.exports = mongoose.model("UserSession", userSessionSchema);
