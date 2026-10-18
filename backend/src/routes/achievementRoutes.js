const express = require("express");
const router = express.Router();
const achievementController = require("../controllers/achievementController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", achievementController.getAchievements);
router.post("/custom", achievementController.createCustomAchievement);
router.put("/custom/:id", achievementController.updateCustomAchievement);
router.delete("/custom/:id", achievementController.deleteCustomAchievement);

module.exports = router;
