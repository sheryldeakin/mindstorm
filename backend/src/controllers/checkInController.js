const CheckIn = require("../models/CheckIn");

/**
 * Create or update a daily check-in for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { checkIn } or an error status.
 */
const upsertCheckIn = async (req, res) => {
  const userId = req.user._id;
  const { dateISO, metrics, note, tags } = req.body || {};

  if (!dateISO) {
    return res.status(400).json({ message: "dateISO is required." });
  }

  const payload = {
    userId,
    dateISO,
    metrics: Array.isArray(metrics) ? metrics : [],
    tags: Array.isArray(tags) ? tags : [],
    note: typeof note === "string" ? note : "",
  };

  const checkIn = await CheckIn.findOneAndUpdate(
    { userId, dateISO },
    payload,
    { upsert: true, new: true },
  ).lean();

  return res.json({ checkIn });
};

/**
 * Fetch a daily check-in by date for the authenticated user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { checkIn }.
 */
const getCheckIn = async (req, res) => {
  const userId = req.user._id;
  const { dateISO } = req.params;

  if (!dateISO) {
    return res.status(400).json({ message: "dateISO is required." });
  }

  const checkIn = await CheckIn.findOne({ userId, dateISO }).lean();
  return res.json({ checkIn: checkIn || null });
};

module.exports = { upsertCheckIn, getCheckIn };
