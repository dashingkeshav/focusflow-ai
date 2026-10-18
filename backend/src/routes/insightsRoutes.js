const express = require("express");
const router = express.Router();

const insightsController = require("../controllers/insightsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireFeature } = require("../utils/entitlements");

// Real AI insights generated from the user's own goals/tasks/sessions/distractions/trends
// Free gets up to 3 runs per day; Pro gets unlimited runs
router.get("/generate", authMiddleware, requireFeature("ai_insights_generate"), insightsController.handleInsights);

module.exports = router;
