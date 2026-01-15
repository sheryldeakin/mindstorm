const express = require("express");
const { protect } = require("../../middleware/auth");

const router = express.Router();

const requireClinician = (req, res, next) => {
  // TODO: enforce clinician role once role support exists on the User model.
  if (req.user?.role && req.user.role !== "clinician") {
    return res.status(403).json({ message: "Clinician access only." });
  }
  return next();
};

router.use(protect);
router.use(requireClinician);

router.get("/criteria-coverage", (_req, res) => {
  res.json({
    status: "placeholder",
    summary: "Criteria coverage is not yet available.",
    coverage: [],
  });
});

router.get("/differential", (_req, res) => {
  res.json({
    status: "placeholder",
    summary: "Differential view is not yet available.",
    candidates: [],
  });
});

module.exports = router;
