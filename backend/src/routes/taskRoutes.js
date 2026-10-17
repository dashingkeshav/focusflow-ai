/**
 * FocusFlow AI — Task Routes
 * Scoped to authenticated user via protect middleware.
 */

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", taskController.getTasks);
router.post("/", taskController.createTask);
router.get("/next-action", taskController.getNextAction);
router.get("/estimate", taskController.getTaskEstimate);
router.get("/:id", taskController.getTaskById);
router.put("/:id", taskController.updateTask);
router.patch("/:id/status", taskController.updateTaskStatus);
router.patch("/:id/subtasks/:subtaskId", taskController.toggleSubtask);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
