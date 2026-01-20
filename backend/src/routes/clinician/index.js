const express = require("express");
const { protect } = require("../../middleware/auth");
const {
  listCases,
  getCaseEntries,
  getCaseOverrides,
  upsertCaseOverride,
  deleteCaseOverride,
  getCaseNotes,
  createCaseNote,
  updateCaseNote,
  deleteCaseNote,
  createEvidenceFeedback,
} = require("../../controllers/clinicianController");

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

router.get("/cases", listCases);
router.get("/cases/:userId/entries", getCaseEntries);
router.get("/cases/:userId/overrides", getCaseOverrides);
router.post("/cases/:userId/overrides", upsertCaseOverride);
router.delete("/cases/:userId/overrides/:nodeId", deleteCaseOverride);
router.get("/cases/:userId/notes", getCaseNotes);
router.post("/cases/:userId/notes", createCaseNote);
router.patch("/cases/:userId/notes/:noteId", updateCaseNote);
router.delete("/cases/:userId/notes/:noteId", deleteCaseNote);
router.post("/cases/:userId/feedback", createEvidenceFeedback);

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
