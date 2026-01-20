const express = require("express");
const { analyzeEntry, createPrepareSummaryJob, getPrepareSummaryJob } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.post("/analyze", analyzeEntry);
router.post("/prepare-summary", createPrepareSummaryJob);
router.get("/prepare-summary/:jobId", getPrepareSummaryJob);

module.exports = router;
