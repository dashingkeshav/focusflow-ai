const express = require("express");

const router = express.Router();

const sessionController =
  require("../controllers/sessionController");

const authMiddleware =
  require("../middleware/authMiddleware");


// =====================================================
// ALL SESSION ROUTES REQUIRE AUTHENTICATION
// =====================================================

// Start focus session
router.post(
  "/start",
  authMiddleware,
  sessionController.startSession
);

// End focus session
router.post(
  "/end",
  authMiddleware,
  sessionController.endSession
);

// Record activity event
router.post(
  "/event",
  authMiddleware,
  sessionController.recordEvent
);

// Get current active session
router.get(
  "/active",
  authMiddleware,
  sessionController.getActiveSession
);

// Get session history
router.get(
  "/history",
  authMiddleware,
  sessionController.getSessionHistory
);


module.exports = router;