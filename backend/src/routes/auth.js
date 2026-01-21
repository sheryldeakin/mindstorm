const express = require("express");
const {
  register,
  login,
  changePassword,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  me,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

/** Express router for authentication and session management. */
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", protect, changePassword);
router.get("/sessions", protect, listSessions);
router.post("/sessions/:id/revoke", protect, revokeSession);
router.post("/sessions/revoke-others", protect, revokeOtherSessions);
router.get("/me", protect, me);

module.exports = router;
