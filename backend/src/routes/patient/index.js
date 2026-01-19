const express = require("express");
const { protect } = require("../../middleware/auth");
const {
  getSnapshot,
  getWeeklySummaries,
  getConnectionsGraph,
  getPatterns,
} = require("../../controllers/derivedController");
const {
  getSettings,
  updateSettings,
  exportJournalData,
  requestJournalDeletion,
} = require("../../controllers/settingsController");
const { listActivity, clearActivity } = require("../../controllers/activityController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.use(protect);

router.get("/snapshot", getSnapshot);
router.get("/weekly-summaries", getWeeklySummaries);
router.get("/connections", getConnectionsGraph);
router.get("/patterns", getPatterns);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/settings/export", exportJournalData);
router.post("/settings/delete-request", requestJournalDeletion);
router.get("/activity", listActivity);
router.delete("/activity", clearActivity);

const uploadDir = path.join(__dirname, "../../../uploads/avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, png, or webp images are allowed."));
    }
  },
});

const { uploadAvatar, removeAvatar } = require("../../controllers/settingsController");
router.post("/settings/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/settings/avatar", removeAvatar);

module.exports = router;
