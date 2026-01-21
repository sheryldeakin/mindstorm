const express = require("express");
const { listEntries, createEntry, getEntry, updateEntry, deleteEntry } = require("../controllers/entriesController");
const { protect } = require("../middleware/auth");

/** Express router for journal entry CRUD endpoints. */
const router = express.Router();

router.use(protect);
router.get("/", listEntries);
router.post("/", createEntry);
router.get("/:id", getEntry);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);

module.exports = router;
