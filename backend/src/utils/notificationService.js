const { pool } = require("../config/db");

/**
 * Format database notification row for API/Socket consumers.
 */
function formatNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type || "info",
    link: row.link || null,
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

/**
 * Creates a notification in PostgreSQL and broadcasts it via Socket.io to the user's room.
 */
async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link = null,
  io = null,
}) {
  if (!userId || !title || !message) {
    throw new Error("userId, title, and message are required for notification.");
  }

  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, title, message, type, link, read, created_at`,
    [userId, title.trim().slice(0, 255), message.trim(), type.trim().slice(0, 32), link || null]
  );

  const formatted = formatNotification(result.rows[0]);

  // Real-time broadcast
  if (io) {
    try {
      io.to(`user:${userId}`).emit("notification", formatted);
    } catch (socketErr) {
      console.warn("Socket broadcast error in createNotification:", socketErr.message);
    }
  }

  return formatted;
}

/**
 * Seeds default helpful onboarding notifications if the user has no notifications yet.
 */
async function seedDefaultNotifications(userId, io = null) {
  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1`,
      [userId]
    );

    if (countRes.rows[0]?.count === 0) {
      await createNotification({
        userId,
        title: "Welcome to FocusFlow AI ⚡",
        message: "Start a focus sprint to activate deep work telemetry and earn real-time flow points.",
        type: "focus",
        link: "/dashboard/sessions",
        io,
      });

      await createNotification({
        userId,
        title: "Streak Sentinel Active 🔥",
        message: "Complete at least one 25-minute focus session today to maintain your momentum.",
        type: "streak",
        link: "/dashboard",
        io,
      });

      await createNotification({
        userId,
        title: "AI Planner Ready 🎯",
        message: "Use the AI Planner to structure tasks, auto-schedule blocks, and eliminate cognitive overload.",
        type: "goal",
        link: "/dashboard/planner",
        io,
      });
    }
  } catch (err) {
    console.warn("seedDefaultNotifications warning:", err.message);
  }
}

module.exports = {
  formatNotification,
  createNotification,
  seedDefaultNotifications,
};
