const express = require("express");

const router = express.Router();

const distractionLogController = require("../controllers/distractionLogController");
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

// =====================================================
// ANALYTICS ROUTES (Accessible to Free & Pro with tiered limits)
// =====================================================

// Dashboard statistics
router.get(
  "/dashboard",
  authMiddleware,
  analyticsController.getDashboardStats
);

// Current authenticated user
router.get(
  "/me",
  authMiddleware,
  analyticsController.getMe
);

// Distraction log (Free: 15 recent events, Pro: full history)
router.get(
  "/distractions",
  authMiddleware,
  distractionLogController.getDistractionLog
);

// Distraction stats (real per-user stats)
router.get(
  "/distraction-stats",
  authMiddleware,
  distractionLogController.getDistractionStats
);

// Update current authenticated user
router.put(
  "/me",
  authMiddleware,
  analyticsController.updateMe
);

// Real date-range analytics report (Free: 7 days, Pro: custom & extended ranges)
router.get(
  "/report",
  authMiddleware,
  analyticsController.getDateRangeReport
);

// Personal Weekly Focus Review
router.get(
  "/weekly-review",
  authMiddleware,
  analyticsController.getWeeklyReview
);

module.exports = router;
