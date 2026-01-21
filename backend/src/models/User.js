const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/** Mongoose model for user accounts. */
module.exports = mongoose.model("User", userSchema);
