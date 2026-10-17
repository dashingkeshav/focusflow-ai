const express = require("express");

const router = express.Router();

const focusController =
  require("../controllers/focusController");

const authMiddleware =
  require("../middleware/authMiddleware");


// =====================================================
// FOCUS ROUTES — Core focus sessions for Free & Pro
// =====================================================

// Calculate focus score (legacy, kept for compatibility)
router.post(
  "/calculate",
  authMiddleware,
  focusController.calculateFocusScore
);

// Real-time metrics + score for the active session (from persisted data)
router.get(
  "/live",
  authMiddleware,
  focusController.getLiveMetrics
);

// Canonical active focus state (extension + dashboard poll this)
router.get(
  "/state",
  authMiddleware,
  focusController.getFocusState
);

// Start a Smart Focus session with task context
router.post(
  "/start",
  authMiddleware,
  focusController.startFocusSession
);

// Pause protection + focus clock
router.post(
  "/pause",
  authMiddleware,
  focusController.pauseFocusSession
);

// Resume a paused session
router.post(
  "/resume",
  authMiddleware,
  focusController.resumeFocusSession
);

// End session, release protection, save summary
router.post(
  "/end",
  authMiddleware,
  focusController.endFocusSession
);

// Classify a site during the active session
router.post(
  "/classify",
  authMiddleware,
  focusController.classifySite
);

// Record a structured focus event
router.post(
  "/event",
  authMiddleware,
  focusController.recordFocusEvent
);

// Extension → backend aggregated metrics
router.post(
  "/sync-metrics",
  authMiddleware,
  focusController.syncMetrics
);

// Report repeated distraction, get escalated action
router.post(
  "/escalate",
  authMiddleware,
  focusController.escalateDomain
);

// Temporary exception (e.g. YouTube for 10 minutes)
router.post(
  "/exception",
  authMiddleware,
  focusController.grantException
);


module.exports = router;