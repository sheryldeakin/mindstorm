const express = require("express");
const { protect } = require("../middleware/auth");
const { getSnapshot, getWeeklySummaries } = require("../controllers/derivedController");

const router = express.Router();

router.use(protect);
router.get("/snapshot", getSnapshot);
router.get("/weekly-summaries", getWeeklySummaries);

module.exports = router;
