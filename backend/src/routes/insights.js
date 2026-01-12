const express = require("express");
const { listInsights, refreshInsights } = require("../controllers/insightsController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/", listInsights);
router.post("/refresh", refreshInsights);

module.exports = router;
