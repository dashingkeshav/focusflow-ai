/**
 * FocusFlow AI — Goal Controller
 * Production-ready PostgreSQL Goal Management scoped strictly to authenticated req.user.id.
 * Interconnects with first-class Tasks, Milestones, Habits, and Achievement Evaluator.
 */

const { pool } = require("../config/db");
const { evaluateUserAchievements } = require("../utils/achievementEvaluator");

// Helper to compute goal progress from linked tasks, milestones, and legacy tasks
async function computeGoalDetails(goalRow, userId) {
  const goalId = goalRow.id;

  // 1. Fetch real tasks linked to this goal from tasks table
  const tasksRes = await pool.query(
    `SELECT id, title, description, priority, status, due_date, estimated_duration, actual_duration, milestone, subtasks, completed_at
     FROM tasks
     WHERE goal_id = $1 AND user_id = $2
     ORDER BY created_at ASC`,
    [goalId, userId]
  );
  const linkedTasks = tasksRes.rows;

  const milestones = Array.isArray(goalRow.milestones) ? goalRow.milestones : [];
  const legacyTasks = Array.isArray(goalRow.tasks) ? goalRow.tasks : [];

  const taskTotal = linkedTasks.length;
  const taskCompleted = linkedTasks.filter((t) => t.status === "completed").length;

  const milestoneTotal = milestones.length;
  const milestoneCompleted = milestones.filter((m) => m.completed).length;

  const legacyTotal = legacyTasks.length;
  const legacyCompleted = legacyTasks.filter((t) => t.done).length;

  const totalItems = taskTotal + milestoneTotal + legacyTotal;
  const completedItems = taskCompleted + milestoneCompleted + legacyCompleted;

  let progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : (Number(goalRow.progress) || 0);

  // Determine computed status
  const targetDate = goalRow.target ? new Date(goalRow.target) : null;
  const now = new Date();
  const isTargetPast = targetDate && targetDate < now;

  let computedStatus = goalRow.status || "Active";
  if (progress === 100 || computedStatus === "Completed") {
    computedStatus = "Completed";
  } else if (isTargetPast) {
    computedStatus = "Overdue";
  } else if (targetDate && (targetDate.getTime() - now.getTime()) > 7 * 86400000 && progress === 0) {
    computedStatus = "Upcoming";
  } else {
    computedStatus = "Active";
  }

  return {
    ...goalRow,
    tasks: legacyTasks,
    linkedTasks,
    milestones,
    progress,
    computedStatus,
    isOverdue: isTargetPast && computedStatus !== "Completed",
    totalItems,
    completedItems,
    habitStreak: goalRow.habit_streak || 0,
  };
}

// GET ALL GOALS
exports.getGoals = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { filter, category, search, sortBy = "created_at", order = "desc" } = req.query;

    let query = `
      SELECT id, name, description, category, priority,
             start_date as start, target_date as target, target_value as "targetValue",
             habit, habit_streak, habit_last_completed_at, status, tasks, milestones, progress,
             created_at as created
      FROM goals
      WHERE user_id = $1
    `;
    const params = [userId];
    let pIdx = 2;

    if (category && category !== "all") {
      query += ` AND category ILIKE $${pIdx++}`;
      params.push(category);
    }

    if (search && search.trim()) {
      query += ` AND (name ILIKE $${pIdx} OR description ILIKE $${pIdx})`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const allowedSortCols = {
      created_at: "created_at",
      target_date: "target_date",
      priority: "priority",
      name: "name",
    };
    const col = allowedSortCols[sortBy] || "created_at";
    const ord = order.toLowerCase() === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY ${col} ${ord} NULLS LAST`;

    const result = await pool.query(query, params);

    // Compute details for each goal
    const goalsWithDetails = await Promise.all(
      result.rows.map((row) => computeGoalDetails(row, userId))
    );

    // Apply status filter if specified
    let filtered = goalsWithDetails;
    if (filter && filter !== "all") {
      const f = filter.toLowerCase();
      if (f === "active") {
        filtered = goalsWithDetails.filter((g) => g.computedStatus === "Active");
      } else if (f === "overdue") {
        filtered = goalsWithDetails.filter((g) => g.isOverdue);
      } else if (f === "upcoming") {
        filtered = goalsWithDetails.filter((g) => g.computedStatus === "Upcoming");
      } else if (f === "completed") {
        filtered = goalsWithDetails.filter((g) => g.computedStatus === "Completed");
      } else if (f === "habits") {
        filtered = goalsWithDetails.filter((g) => g.habit);
      }
    }

    // Counts summary
    const counts = {
      all: goalsWithDetails.length,
      active: goalsWithDetails.filter((g) => g.computedStatus === "Active").length,
      overdue: goalsWithDetails.filter((g) => g.isOverdue).length,
      upcoming: goalsWithDetails.filter((g) => g.computedStatus === "Upcoming").length,
      completed: goalsWithDetails.filter((g) => g.computedStatus === "Completed").length,
      habits: goalsWithDetails.filter((g) => g.habit).length,
    };

    return res.status(200).json({
      success: true,
      goals: filtered,
      counts,
    });
  } catch (error) {
    console.error("Get Goals Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch goals." });
  }
};

// CREATE GOAL
exports.createGoal = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { name, description, category, priority, start, target, targetValue, habit, tasks, milestones } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Goal name must be at least 3 characters." });
    }

    const initialMilestones = Array.isArray(milestones) ? milestones : [];
    const initialTasks = Array.isArray(tasks) ? tasks : [];

    const result = await pool.query(
      `INSERT INTO goals (
         user_id, name, description, category, priority, start_date,
         target_date, target_value, habit, tasks, milestones, progress
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, description, category, priority, start_date as start, target_date as target,
                 target_value as "targetValue", habit, habit_streak, status, tasks, milestones, progress, created_at as created`,
      [
        userId,
        name.trim(),
        description ? description.trim() : "",
        category || "Study",
        priority || "Medium",
        start || new Date().toISOString().slice(0, 10),
        target || null,
        Number(targetValue) || 10,
        Boolean(habit),
        JSON.stringify(initialTasks),
        JSON.stringify(initialMilestones),
        0,
      ]
    );

    const goal = await computeGoalDetails(result.rows[0], userId);

    // Evaluate achievements in background
    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);

    return res.status(201).json({ success: true, goal });
  } catch (error) {
    console.error("Create Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create goal." });
  }
};

// UPDATE GOAL
exports.updateGoal = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { name, description, category, priority, start, target, targetValue, habit, status, milestones, progress } = req.body;

    const result = await pool.query(
      `UPDATE goals
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           start_date = COALESCE($5, start_date),
           target_date = COALESCE($6, target_date),
           target_value = COALESCE($7, target_value),
           habit = COALESCE($8, habit),
           status = COALESCE($9, status),
           milestones = COALESCE($10, milestones),
           progress = COALESCE($11, progress),
           updated_at = NOW()
       WHERE id = $12 AND user_id = $13
       RETURNING id, name, description, category, priority, start_date as start, target_date as target,
                 target_value as "targetValue", habit, habit_streak, status, tasks, milestones, progress, created_at as created`,
      [
        name ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        category || null,
        priority || null,
        start || null,
        target || null,
        targetValue ? Number(targetValue) : null,
        habit !== undefined ? Boolean(habit) : null,
        status || null,
        milestones !== undefined ? JSON.stringify(milestones) : null,
        progress !== undefined ? Number(progress) : null,
        id,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const goal = await computeGoalDetails(result.rows[0], userId);
    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);

    return res.status(200).json({ success: true, goal });
  } catch (error) {
    console.error("Update Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update goal." });
  }
};

// DELETE GOAL
exports.deleteGoal = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // Set goal_id to null on any linked tasks
    await pool.query("UPDATE tasks SET goal_id = NULL WHERE goal_id = $1 AND user_id = $2", [id, userId]);

    const result = await pool.query("DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);

    return res.status(200).json({ success: true, message: "Goal deleted successfully." });
  } catch (error) {
    console.error("Delete Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete goal." });
  }
};

// MILESTONES MANAGEMENT
exports.addMilestone = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: goalId } = req.params;
    const { title, targetDate } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Milestone title must be at least 2 characters." });
    }

    const goalRes = await pool.query("SELECT milestones FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
    if (goalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const milestones = Array.isArray(goalRes.rows[0].milestones) ? goalRes.rows[0].milestones : [];
    const newMilestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      completed: false,
      targetDate: targetDate || null,
      createdAt: new Date().toISOString(),
    };

    milestones.push(newMilestone);

    const updateRes = await pool.query(
      "UPDATE goals SET milestones = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(milestones), goalId, userId]
    );

    const goal = await computeGoalDetails(updateRes.rows[0], userId);
    return res.status(201).json({ success: true, milestone: newMilestone, goal });
  } catch (error) {
    console.error("Add Milestone Error:", error);
    return res.status(500).json({ success: false, message: "Failed to add milestone." });
  }
};

exports.toggleMilestone = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: goalId, milestoneId } = req.params;
    const { completed } = req.body;

    const goalRes = await pool.query("SELECT milestones FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
    if (goalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const milestones = Array.isArray(goalRes.rows[0].milestones) ? goalRes.rows[0].milestones : [];
    const targetIdx = milestones.findIndex((m) => m.id === milestoneId);
    if (targetIdx === -1) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    milestones[targetIdx].completed = completed !== undefined ? Boolean(completed) : !milestones[targetIdx].completed;

    const updateRes = await pool.query(
      "UPDATE goals SET milestones = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(milestones), goalId, userId]
    );

    const goal = await computeGoalDetails(updateRes.rows[0], userId);
    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);

    return res.status(200).json({ success: true, goal });
  } catch (error) {
    console.error("Toggle Milestone Error:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle milestone." });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: goalId, milestoneId } = req.params;

    const goalRes = await pool.query("SELECT milestones FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
    if (goalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    let milestones = Array.isArray(goalRes.rows[0].milestones) ? goalRes.rows[0].milestones : [];
    milestones = milestones.filter((m) => m.id !== milestoneId);

    const updateRes = await pool.query(
      "UPDATE goals SET milestones = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(milestones), goalId, userId]
    );

    const goal = await computeGoalDetails(updateRes.rows[0], userId);
    return res.status(200).json({ success: true, goal });
  } catch (error) {
    console.error("Delete Milestone Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete milestone." });
  }
};

// CHECK HABIT & UPDATE STREAK
exports.checkHabit = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: goalId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const goalRes = await pool.query(
      "SELECT id, habit_streak, habit_last_completed_at FROM goals WHERE id = $1 AND user_id = $2",
      [goalId, userId]
    );

    if (goalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const goal = goalRes.rows[0];
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastDate = goal.habit_last_completed_at ? new Date(goal.habit_last_completed_at).toISOString().slice(0, 10) : null;

    let newStreak = goal.habit_streak || 0;

    if (lastDate === todayStr) {
      return res.status(200).json({ success: true, habitStreak: newStreak, message: "Habit already checked today." });
    }

    if (lastDate) {
      const diffMs = new Date(todayStr).getTime() - new Date(lastDate).getTime();
      const diffDays = Math.round(diffMs / 86400000);
      if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await pool.query(
      "UPDATE goals SET habit_streak = $1, habit_last_completed_at = CURRENT_DATE, updated_at = NOW() WHERE id = $2 AND user_id = $3",
      [newStreak, goalId, userId]
    );

    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);

    return res.status(200).json({
      success: true,
      habitStreak: newStreak,
      message: `Habit completed! Current streak: ${newStreak} day(s).`,
    });
  } catch (error) {
    console.error("Check Habit Error:", error);
    return res.status(500).json({ success: false, message: "Failed to check habit." });
  }
};

// Task endpoints for the Goals workspace — tasks live in the first-class
// tasks table with an optional milestone label, and progress flows into the
// linked goal via recalculateGoalProgress.
exports.addTask = async (req, res) => {
  const { title, milestone } = req.body;
  const { id: goalId } = req.params;
  const userId = req.user?.id;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Task title must be at least 3 characters." });
    }

    // Verify the goal belongs to this user
    const goalCheck = await pool.query("SELECT id FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const insertRes = await pool.query(
      `INSERT INTO tasks (user_id, goal_id, title, priority, status, milestone)
       VALUES ($1, $2, $3, 'Medium', 'todo', $4) RETURNING *`,
      [userId, goalId, title.trim(), milestone ? String(milestone).trim() || null : null]
    );
    const task = insertRes.rows[0];

    const { recalculateGoalProgress } = require("./taskController");
    await recalculateGoalProgress(goalId, userId);

    const io = req.app?.get ? req.app.get("io") : null;
    await evaluateUserAchievements(userId, io);
    if (io) io.to(`user:${userId}`).emit("task:created", { task });

    return res.status(201).json({ success: true, task });
  } catch (e) {
    console.error("addTask Error:", e);
    return res.status(500).json({ success: false, message: "Failed to add task." });
  }
};

exports.toggleTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user?.id;
  try {
    const cur = await pool.query("SELECT status, goal_id FROM tasks WHERE id = $1 AND user_id = $2", [taskId, userId]);
    if (cur.rows.length === 0) return res.status(404).json({ success: false, message: "Task not found" });
    const nextStatus = cur.rows[0].status === "completed" ? "todo" : "completed";
    const up = await pool.query(
      "UPDATE tasks SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
      [nextStatus, nextStatus === "completed" ? new Date() : null, taskId, userId]
    );
    if (cur.rows[0].goal_id) {
      const { recalculateGoalProgress } = require("./taskController");
      await recalculateGoalProgress(cur.rows[0].goal_id, userId);
    }
    const io = req.app?.get ? req.app.get("io") : null;
    evaluateUserAchievements(userId, io);
    return res.json({ success: true, task: up.rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.editTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, milestone } = req.body;
  const userId = req.user?.id;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Task title must be at least 3 characters." });
    }
    const up = await pool.query(
      "UPDATE tasks SET title = $1, milestone = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
      [title.trim(), milestone !== undefined ? String(milestone).trim() || null : null, taskId, userId]
    );
    if (up.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }
    return res.json({ success: true, task: up.rows[0] });
  } catch (e) {
    console.error("editTask Error:", e);
    return res.status(500).json({ success: false, message: "Failed to update task." });
  }
};

exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user?.id;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const del = await pool.query("DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING goal_id", [taskId, userId]);
    if (del.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }
    if (del.rows[0]?.goal_id) {
      const { recalculateGoalProgress } = require("./taskController");
      await recalculateGoalProgress(del.rows[0].goal_id, userId);
    }
    const io = req.app?.get ? req.app.get("io") : null;
    if (io) io.to(`user:${userId}`).emit("task:deleted", { taskId });
    return res.json({ success: true });
  } catch (e) {
    console.error("deleteTask Error:", e);
    return res.status(500).json({ success: false, message: "Failed to delete task." });
  }
};
