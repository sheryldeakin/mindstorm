const express = require("express");
const { analyzeEntry, prepareSummary } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.post("/analyze", analyzeEntry);
router.post("/prepare-summary", prepareSummary);

module.exports = router;
