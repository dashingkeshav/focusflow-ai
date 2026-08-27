const express = require("express");

const router = express.Router();

const focusController =
  require("../controllers/focusController");

const authMiddleware =
  require("../middleware/authMiddleware");


// =====================================================
// FOCUS ROUTES
// =====================================================

// Calculate focus score
router.post(
  "/calculate",
  authMiddleware,
  focusController.calculateFocusScore
);


module.exports = router;