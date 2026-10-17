const express = require("express");
const router = express.Router();
const goalController = require("../controllers/goalController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

router.get("/", goalController.getGoals);
router.post("/", goalController.createGoal);
router.put("/:id", goalController.updateGoal);
router.delete("/:id", goalController.deleteGoal);

// Tasks under goal
router.post("/:id/tasks", goalController.addTask);
router.patch("/:id/tasks/:taskId", goalController.toggleTask);
router.put("/:id/tasks/:taskId", goalController.editTask);
router.delete("/:id/tasks/:taskId", goalController.deleteTask);

// Milestones under goal
router.post("/:id/milestones", goalController.addMilestone);
router.patch("/:id/milestones/:milestoneId", goalController.toggleMilestone);
router.delete("/:id/milestones/:milestoneId", goalController.deleteMilestone);

// Habit checkin
router.post("/:id/habit/check", goalController.checkHabit);

module.exports = router;
