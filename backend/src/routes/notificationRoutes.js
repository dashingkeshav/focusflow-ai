const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.post("/", notificationController.createCustomNotification);
router.post("/test", notificationController.sendTestNotification);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.delete("/", notificationController.clearAllNotifications);

module.exports = router;
