const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getSnapshot,
  getWeeklySummaries,
  getConnectionsGraph,
  getCycles,
  getPatterns,
  getClinicalStatus,
} = require("../controllers/derivedController");

/** Express router for derived data cache endpoints. */
const router = express.Router();

router.use(protect);
router.get("/snapshot", getSnapshot);
router.get("/weekly-summaries", getWeeklySummaries);
router.get("/connections", getConnectionsGraph);
router.get("/cycles", getCycles);
router.get("/patterns", getPatterns);
router.get("/clinical-status/:patientId", getClinicalStatus);

module.exports = router;
