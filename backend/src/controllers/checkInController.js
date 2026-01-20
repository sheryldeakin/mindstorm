const CheckIn = require("../models/CheckIn");

const upsertCheckIn = async (req, res) => {
  const userId = req.user._id;
  const { dateISO, metrics, note } = req.body || {};

  if (!dateISO) {
    return res.status(400).json({ message: "dateISO is required." });
  }

  const payload = {
    userId,
    dateISO,
    metrics: Array.isArray(metrics) ? metrics : [],
    note: typeof note === "string" ? note : "",
  };

  const checkIn = await CheckIn.findOneAndUpdate(
    { userId, dateISO },
    payload,
    { upsert: true, new: true },
  ).lean();

  return res.json({ checkIn });
};

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
