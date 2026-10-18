/**
 * FocusFlow AI — Real Rule-Based Achievement Engine
 * Evaluates real user activity from PostgreSQL (goals, tasks, sessions, plans, habits).
 * Automatically unlocks achievements, persists unlock timestamps, prevents duplicate unlocks,
 * and emits real-time Socket.IO notifications.
 */

const { pool } = require("../config/db");

async function evaluateUserAchievements(userId, io = null, client = null) {
  if (!userId) return null;
  const db = client || pool;

  try {
    // 1. Fetch real task statistics from first-class `tasks` table
    const taskStatsRes = await db.query(
      `SELECT
         COUNT(*) as total_tasks,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    );

    let dbTasksCount = parseInt(taskStatsRes.rows[0]?.total_tasks || 0, 10);
    let dbCompletedTasksCount = parseInt(taskStatsRes.rows[0]?.completed_tasks || 0, 10);

    // 2. Fetch all goals and legacy embedded tasks
    const goalsRes = await db.query(
      `SELECT id, status, habit, habit_streak, tasks, progress, milestones
       FROM goals
       WHERE user_id = $1`,
      [userId]
    );

    const goals = goalsRes.rows;
    let totalGoalsCount = goals.length;
    let completedGoalsCount = 0;
    let maxHabitStreak = 0;

    for (const g of goals) {
      const gProgress = Number(g.progress) || 0;
      if (g.status === "Completed" || gProgress >= 100) {
        completedGoalsCount++;
      }
      if (g.habit && typeof g.habit_streak === "number") {
        if (g.habit_streak > maxHabitStreak) {
          maxHabitStreak = g.habit_streak;
        }
      }
      // Fold in any legacy tasks in goals.tasks jsonb
      const legacyTasks = Array.isArray(g.tasks) ? g.tasks : [];
      if (legacyTasks.length > 0) {
        dbTasksCount += legacyTasks.length;
        dbCompletedTasksCount += legacyTasks.filter((t) => t.done).length;
      }
    }

    // 3. Fetch real focus sessions statistics
    const sessionStatsRes = await db.query(
      `SELECT
         COUNT(*) as total_sessions,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
         COALESCE(SUM(duration_seconds) FILTER (WHERE status = 'completed'), 0) as total_focus_seconds
       FROM sessions
       WHERE user_id = $1`,
      [userId]
    );

    const completedSessionsCount = parseInt(sessionStatsRes.rows[0]?.completed_sessions || 0, 10);
    const totalFocusMinutes = Math.floor(
      parseInt(sessionStatsRes.rows[0]?.total_focus_seconds || 0, 10) / 60
    );

    // 4. Fetch plan statistics
    const planStatsRes = await db.query(
      `SELECT COUNT(*) as plan_count
       FROM plan_versions
       WHERE user_id = $1`,
      [userId]
    );
    let userPlansCount = parseInt(planStatsRes.rows[0]?.plan_count || 0, 10);

    const activePlanRes = await db.query(
      `SELECT id, prompt FROM user_plans WHERE user_id = $1`,
      [userId]
    );
    if (activePlanRes.rows.length > 0 && activePlanRes.rows[0]?.prompt) {
      userPlansCount = Math.max(userPlansCount, 1);
    }

    // 5. Fetch all system achievement definitions
    const defsRes = await db.query(
      `SELECT id, key, title, description, icon, category, target
       FROM achievement_definitions
       WHERE is_active = true`
    );
    const definitions = defsRes.rows;

    const newlyUnlocked = [];

    for (const def of definitions) {
      let currentProgress = 0;

      switch (def.key) {
        case "first_task":
          currentProgress = dbTasksCount;
          break;
        case "task_manager":
          currentProgress = dbCompletedTasksCount;
          break;
        case "task_titan":
          currentProgress = dbCompletedTasksCount;
          break;
        case "goal_starter":
          currentProgress = totalGoalsCount;
          break;
        case "goal_finisher":
          currentProgress = completedGoalsCount;
          break;
        case "goal_master":
          currentProgress = completedGoalsCount;
          break;
        case "habit_keeper":
          currentProgress = maxHabitStreak;
          break;
        case "first_focus":
          currentProgress = completedSessionsCount;
          break;
        case "focus_pro":
          currentProgress = completedSessionsCount;
          break;
        case "century_focus":
          currentProgress = totalFocusMinutes;
          break;
        case "planner_pro":
          currentProgress = userPlansCount;
          break;
        default:
          currentProgress = 0;
          break;
      }

      const shouldUnlock = currentProgress >= def.target;

      const existingRes = await db.query(
        `SELECT id, unlocked, unlocked_at, progress
         FROM user_achievements
         WHERE user_id = $1 AND achievement_id = $2`,
        [userId, def.id]
      );

      if (existingRes.rows.length === 0) {
        let insertRes;
        try {
          insertRes = await db.query(
            `INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked, unlocked_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              userId,
              def.id,
              currentProgress,
              shouldUnlock,
              shouldUnlock ? new Date() : null,
            ]
          );
        } catch (insertErr) {
          if (insertErr.code === '23505') {
            // Concurrent insert race condition: fetch and continue as existing
            const retryRes = await db.query(
              `SELECT id, unlocked, unlocked_at, progress
               FROM user_achievements
               WHERE user_id = $1 AND achievement_id = $2`,
              [userId, def.id]
            );
            if (retryRes.rows.length > 0) {
              existingRes.rows = retryRes.rows;
            }
          } else {
            throw insertErr;
          }
        }

        if (insertRes && insertRes.rows.length > 0) {
          if (shouldUnlock) {
            newlyUnlocked.push({
              ...insertRes.rows[0],
              key: def.key,
              title: def.title,
              description: def.description,
              icon: def.icon,
              target: def.target,
            });
          }
        }
      }

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        const wasUnlocked = existing.unlocked;
        const nowUnlocked = wasUnlocked || shouldUnlock;
        const unlockedAt = wasUnlocked ? existing.unlocked_at : shouldUnlock ? new Date() : null;

        await db.query(
          `UPDATE user_achievements
           SET progress = $1, unlocked = $2, unlocked_at = $3, updated_at = NOW()
           WHERE id = $4`,
          [currentProgress, nowUnlocked, unlockedAt, existing.id]
        );

        if (!wasUnlocked && shouldUnlock) {
          newlyUnlocked.push({
            id: existing.id,
            user_id: userId,
            achievement_id: def.id,
            key: def.key,
            title: def.title,
            description: def.description,
            icon: def.icon,
            target: def.target,
            progress: currentProgress,
            unlocked: true,
            unlocked_at: unlockedAt,
          });
        }
      }
    }

    // 6. Real-time notification if achievements were newly unlocked
    if (newlyUnlocked.length > 0) {
      const { createNotification } = require("./notificationService");
      for (const ach of newlyUnlocked) {
        if (io) {
          io.to(`user:${userId}`).emit("achievement_unlocked", {
            achievement: ach,
            message: `Achievement Unlocked: ${ach.title}!`,
          });
        }
        await createNotification({
          userId,
          title: `Achievement Unlocked: ${ach.title} 🏆`,
          message: ach.description || `You unlocked the '${ach.title}' achievement!`,
          type: "achievement",
          link: "/dashboard/goals?view=achievements",
          io,
        }).catch((nErr) => console.warn("Failed to persist achievement notification:", nErr.message));
      }
    }

    return {
      success: true,
      newlyUnlocked,
      stats: {
        dbTasksCount,
        dbCompletedTasksCount,
        totalGoalsCount,
        completedGoalsCount,
        maxHabitStreak,
        completedSessionsCount,
        totalFocusMinutes,
        userPlansCount,
      },
    };
  } catch (err) {
    console.error("evaluateUserAchievements error:", err);
    return null;
  }
}

module.exports = { evaluateUserAchievements };
