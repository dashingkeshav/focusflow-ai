const express = require("express");

const router = express.Router();

const analyticsController =
  require("../controllers/analyticsController");

const authMiddleware =
  require("../middleware/authMiddleware");


// =====================================================
// ANALYTICS ROUTES
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

// Update current authenticated user
router.put(
  "/me",
  authMiddleware,
  analyticsController.updateMe
);


module.exports = router;