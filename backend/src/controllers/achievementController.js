/**
 * FocusFlow AI — Achievements Controller
 * Handles real-time system and custom achievements.
 */

const { pool } = require("../config/db");
const { evaluateUserAchievements } = require("../utils/achievementEvaluator");

// GET ALL ACHIEVEMENTS WITH LIVE STATS
exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const io = req.app?.get ? req.app.get("io") : null;
    // Ensure system achievements are evaluated against user's real DB stats
    await evaluateUserAchievements(userId, io);

    // Fetch all achievements for user (both system and custom)
    const result = await pool.query(
      `SELECT ua.id, ua.progress, ua.unlocked, ua.unlocked_at as "unlockedAt",
              ua.is_custom as "isCustom", ua.created_at as "createdAt",
              COALESCE(ad.key, 'custom') as key,
              COALESCE(ua.custom_title, ad.title) as title,
              COALESCE(ua.custom_description, ad.description) as description,
              COALESCE(ad.icon, 'Award') as icon,
              COALESCE(ad.category, 'custom') as category,
              COALESCE(ua.custom_target, ad.target, 1) as target
       FROM user_achievements ua
       LEFT JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked DESC, ua.created_at ASC`,
      [userId]
    );

    const achievements = result.rows.map((row) => {
      const target = Number(row.target) || 1;
      const progress = Number(row.progress) || 0;
      const pct = Math.min(100, Math.round((progress / target) * 100));
      const status = row.unlocked ? "Unlocked" : progress > 0 ? "In Progress" : "Locked";

      return {
        ...row,
        target,
        progress,
        percentage: pct,
        status,
      };
    });

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const inProgressCount = achievements.filter((a) => !a.unlocked && a.progress > 0).length;
    const totalCount = achievements.length;
    const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return res.status(200).json({
      success: true,
      achievements,
      stats: {
        unlocked: unlockedCount,
        inProgress: inProgressCount,
        total: totalCount,
        completionPercentage,
      },
    });
  } catch (error) {
    console.error("Get Achievements Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch achievements." });
  }
};

// CREATE CUSTOM ACHIEVEMENT
exports.createCustomAchievement = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { title, description, target } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Title must be at least 3 characters." });
    }

    const numTarget = parseInt(target, 10);
    if (isNaN(numTarget) || numTarget < 1) {
      return res.status(400).json({ success: false, message: "Target must be a positive integer." });
    }

    const result = await pool.query(
      `INSERT INTO user_achievements (user_id, is_custom, custom_title, custom_description, custom_target, progress, unlocked)
       VALUES ($1, true, $2, $3, $4, 0, false)
       RETURNING id, is_custom as "isCustom", custom_title as title, custom_description as description,
                 custom_target as target, progress, unlocked, created_at as "createdAt"`,
      [userId, title.trim(), description ? description.trim() : "", numTarget]
    );

    const created = {
      ...result.rows[0],
      key: "custom",
      icon: "Award",
      category: "custom",
      percentage: 0,
      status: "Locked",
    };

    return res.status(201).json({ success: true, achievement: created });
  } catch (error) {
    console.error("Create Custom Achievement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create achievement." });
  }
};

// UPDATE CUSTOM ACHIEVEMENT
exports.updateCustomAchievement = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, description, target, progress } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const checkRes = await pool.query(
      "SELECT id, is_custom, custom_target, progress FROM user_achievements WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Achievement not found." });
    }

    const existing = checkRes.rows[0];
    if (!existing.is_custom) {
      return res.status(403).json({
        success: false,
        message: "System achievement definitions and criteria cannot be edited.",
      });
    }

    const updatedTitle = title !== undefined ? title.trim() : undefined;
    const updatedDesc = description !== undefined ? description.trim() : undefined;
    const updatedTarget = target !== undefined ? parseInt(target, 10) : existing.custom_target;
    const updatedProgress = progress !== undefined ? parseInt(progress, 10) : existing.progress;

    const isUnlocked = updatedProgress >= updatedTarget;

    const result = await pool.query(
      `UPDATE user_achievements
       SET custom_title = COALESCE($1, custom_title),
           custom_description = COALESCE($2, custom_description),
           custom_target = COALESCE($3, custom_target),
           progress = COALESCE($4, progress),
           unlocked = $5,
           unlocked_at = CASE WHEN $5 AND unlocked_at IS NULL THEN NOW() ELSE unlocked_at END,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, is_custom as "isCustom", custom_title as title, custom_description as description,
                 custom_target as target, progress, unlocked, unlocked_at as "unlockedAt", created_at as "createdAt"`,
      [updatedTitle, updatedDesc, updatedTarget, updatedProgress, isUnlocked, id, userId]
    );

    const updated = {
      ...result.rows[0],
      key: "custom",
      icon: "Award",
      category: "custom",
      percentage: Math.min(100, Math.round((updatedProgress / updatedTarget) * 100)),
      status: isUnlocked ? "Unlocked" : updatedProgress > 0 ? "In Progress" : "Locked",
    };

    if (isUnlocked && !checkRes.rows[0].unlocked) {
      const io = req.app?.get ? req.app.get("io") : null;
      if (io) {
        io.to(`user:${userId}`).emit("achievement_unlocked", updated);
      }
    }

    return res.status(200).json({ success: true, achievement: updated });
  } catch (error) {
    console.error("Update Custom Achievement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update achievement." });
  }
};

// DELETE CUSTOM ACHIEVEMENT
exports.deleteCustomAchievement = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const checkRes = await pool.query(
      "SELECT id, is_custom FROM user_achievements WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Achievement not found." });
    }

    if (!checkRes.rows[0].is_custom) {
      return res.status(403).json({ success: false, message: "System achievements cannot be deleted." });
    }

    await pool.query("DELETE FROM user_achievements WHERE id = $1 AND user_id = $2", [id, userId]);

    return res.status(200).json({ success: true, message: "Custom achievement deleted successfully." });
  } catch (error) {
    console.error("Delete Custom Achievement Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete achievement." });
  }
};
