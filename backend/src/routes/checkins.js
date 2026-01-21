const express = require("express");
const { protect } = require("../middleware/auth");
const { upsertCheckIn, getCheckIn } = require("../controllers/checkInController");

/** Express router for patient check-in endpoints. */
const router = express.Router();

router.use(protect);
router.post("/", upsertCheckIn);
router.get("/:dateISO", getCheckIn);

module.exports = router;
