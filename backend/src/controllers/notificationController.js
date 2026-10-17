const { pool } = require("../config/db");
const {
  formatNotification,
  createNotification,
  seedDefaultNotifications,
} = require("../utils/notificationService");

let testCounter = 0;
const TEST_TEMPLATES = [
  {
    title: "Focus Sprint Complete ⚡",
    message: "25-minute deep study block completed with a 96/100 Flow Score. Excellent work!",
    type: "focus",
    link: "/dashboard/sessions",
  },
  {
    title: "Achievement Unlocked 🏆",
    message: "Deep Worker unlocked! You've successfully logged 5 high-efficiency focus sessions.",
    type: "achievement",
    link: "/dashboard/goals?view=achievements",
  },
  {
    title: "Focus Drift Re-centered ⚠️",
    message: "Tab switches were detected on non-work domains. Great job recovering back into your flow zone.",
    type: "distraction",
    link: "/dashboard/distractions",
  },
  {
    title: "Daily Streak Protected 🔥",
    message: "Your focus streak is active and rising! Complete tomorrow's goal to maintain momentum.",
    type: "streak",
    link: "/dashboard",
  },
  {
    title: "AI Planner Recommendation 🎯",
    message: "Optimal cognitive peak detected. Your next 45-minute sprint has been drafted in AI Planner.",
    type: "goal",
    link: "/dashboard/planner",
  },
];

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const io = req.app?.get ? req.app.get("io") : null;

    // Check count first and seed defaults if empty
    const countCheck = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1`,
      [userId]
    );

    if (countCheck.rows[0]?.count === 0) {
      await seedDefaultNotifications(userId, io);
    }

    const notifRes = await pool.query(
      `SELECT id, user_id, title, message, type, link, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadRes = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND read = false`,
      [userId]
    );

    const notifications = notifRes.rows.map(formatNotification);
    const unreadCount = unreadRes.rows[0]?.count || 0;

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

// POST /api/notifications
exports.createCustomNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, message, type, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    const io = req.app?.get ? req.app.get("io") : null;
    const notification = await createNotification({
      userId,
      title,
      message,
      type: type || "info",
      link: link || null,
      io,
    });

    return res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("createCustomNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notification.",
    });
  }
};

// POST /api/notifications/test
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const template = TEST_TEMPLATES[testCounter % TEST_TEMPLATES.length];
    testCounter += 1;

    const io = req.app?.get ? req.app.get("io") : null;
    const notification = await createNotification({
      userId,
      title: template.title,
      message: template.message,
      type: template.type,
      link: template.link,
      io,
    });

    return res.status(200).json({
      success: true,
      message: "Test notification dispatched.",
      notification,
    });
  } catch (error) {
    console.error("sendTestNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dispatch test notification.",
    });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, read`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `UPDATE notifications
       SET read = true
       WHERE user_id = $1 AND read = false`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      updatedCount: result.rowCount,
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("deleteNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

// DELETE /api/notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    await pool.query(
      `DELETE FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications cleared.",
    });
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications.",
    });
  }
};
