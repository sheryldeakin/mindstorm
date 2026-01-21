const mongoose = require("mongoose");

/**
 * Connects to MongoDB using MONGODB_URI.
 * @returns {Promise<void>}
 */
const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
};

module.exports = connectDb;
