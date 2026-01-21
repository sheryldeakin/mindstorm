const express = require("express");
const { listInsights, refreshInsights } = require("../controllers/insightsController");
const { protect } = require("../middleware/auth");

/** Express router for insights endpoints. */
const router = express.Router();

router.use(protect);
router.get("/", listInsights);
router.post("/refresh", refreshInsights);

module.exports = router;
