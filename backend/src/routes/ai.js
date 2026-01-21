const express = require("express");
const { analyzeEntry, prepareSummary } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

/** Express router for AI analysis and summary preparation. */
const router = express.Router();

router.use(protect);
router.post("/analyze", analyzeEntry);
router.post("/prepare-summary", prepareSummary);

module.exports = router;
