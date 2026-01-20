const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getSnapshot,
  getWeeklySummaries,
  getConnectionsGraph,
  getCycles,
  getPatterns,
} = require("../controllers/derivedController");

const router = express.Router();

router.use(protect);
router.get("/snapshot", getSnapshot);
router.get("/weekly-summaries", getWeeklySummaries);
router.get("/connections", getConnectionsGraph);
router.get("/cycles", getCycles);
router.get("/patterns", getPatterns);

module.exports = router;
