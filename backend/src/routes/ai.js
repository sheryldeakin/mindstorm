const express = require("express");
const { analyzeEntry } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.post("/analyze", analyzeEntry);

module.exports = router;
