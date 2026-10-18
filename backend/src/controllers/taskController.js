/**
 * FocusFlow AI — Real Tasks Controller
 * Production-ready PostgreSQL Task Management scoped to authenticated req.user.id.
 * Interconnects with Goals, Achievements, Calendar, and Smart Focus Sessions.
 */

const { pool } = require("../config/db");
const { evaluateUserAchievements } = require("../utils/achievementEvaluator");

/**
 * Re-calculate progress for a goal based on linked tasks and milestones.
 */
async function recalculateGoalProgress(goalId, userId) {
  if (!goalId || !userId) return;

  try {
    // 1. Fetch tasks linked to this goal
    const tasksRes = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM tasks
       WHERE goal_id = $1 AND user_id = $2`,
      [goalId, userId]
    );

    const taskTotal = parseInt(tasksRes.rows[0]?.total || 0, 10);
    const taskCompleted = parseInt(tasksRes.rows[0]?.completed || 0, 10);

    // 2. Fetch goal milestones
    const goalRes = await pool.query(
      `SELECT milestones, tasks, habit, habit_streak FROM goals WHERE id = $1 AND user_id = $2`,
      [goalId, userId]
    );

    if (goalRes.rows.length === 0) return;
    const goal = goalRes.rows[0];

    const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
    const milestoneTotal = milestones.length;
    const milestoneCompleted = milestones.filter((m) => m.completed).length;

    // Check legacy tasks if any
    const legacyTasks = Array.isArray(goal.tasks) ? goal.tasks : [];
    const legacyTotal = legacyTasks.length;
    const legacyCompleted = legacyTasks.filter((t) => t.done).length;

    const totalItems = taskTotal + milestoneTotal + legacyTotal;
    const completedItems = taskCompleted + milestoneCompleted + legacyCompleted;

    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const isCompleted = totalItems > 0 && completedItems === totalItems;

    await pool.query(
      `UPDATE goals
       SET progress = $1,
           status = CASE
             WHEN $2 = true THEN 'Completed'
             WHEN status = 'Completed' AND $2 = false THEN 'Active'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [progress, isCompleted, goalId, userId]
    );
  } catch (err) {
    console.error("recalculateGoalProgress error:", err);
  }
}

// GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { status, priority, goalId, search, sortBy = "created_at", order = "desc" } = req.query;

    let query = `
      SELECT t.id, t.user_id, t.goal_id, t.title, t.description, t.priority,
             t.status, t.due_date, t.estimated_duration, t.actual_duration,
             t.milestone, t.tags, t.subtasks, t.is_recurring, t.recurrence_rule,
             t.completed_at, t.created_at, t.updated_at,
             g.name as goal_name, g.category as goal_category
      FROM tasks t
      LEFT JOIN goals g ON t.goal_id = g.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status && status !== "all") {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority && priority !== "all") {
      query += ` AND LOWER(t.priority) = LOWER($${paramIndex++})`;
      params.push(priority);
    }

    if (goalId && goalId !== "all") {
      query += ` AND t.goal_id = $${paramIndex++}`;
      params.push(goalId);
    }

    if (search && search.trim()) {
      query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const allowedSortCols = {
      created_at: "t.created_at",
      due_date: "t.due_date",
      priority: "t.priority",
      title: "t.title",
      status: "t.status",
    };
    const sortCol = allowedSortCols[sortBy] || "t.created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY ${sortCol} ${sortOrder} NULLS LAST`;

    const result = await pool.query(query, params);

    // Compute task counts for rapid tab filtering
    const countsRes = await pool.query(
      `SELECT
         COUNT(*) as all,
         COUNT(*) FILTER (WHERE status = 'todo') as todo,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    );

    const counts = countsRes.rows[0] || { all: 0, todo: 0, in_progress: 0, completed: 0, overdue: 0 };

    return res.status(200).json({
      success: true,
      tasks: result.rows,
      counts: {
        all: parseInt(counts.all || 0, 10),
        todo: parseInt(counts.todo || 0, 10),
        in_progress: parseInt(counts.in_progress || 0, 10),
        completed: parseInt(counts.completed || 0, 10),
        overdue: parseInt(counts.overdue || 0, 10),
      },
    });
  } catch (error) {
    console.error("getTasks Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tasks." });
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const {
      title,
      description,
      priority = "Medium",
      status = "todo",
      dueDate,
      estimatedDuration = 25,
      goalId,
      tags = [],
      subtasks = [],
      isRecurring = false,
      recurrenceRule,
    } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Task title must be at least 2 characters." });
    }

    // Verify goal belongs to user if goalId is specified
    let verifiedGoalId = null;
    if (goalId) {
      const gCheck = await pool.query("SELECT id FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
      if (gCheck.rows.length > 0) {
        verifiedGoalId = goalId;
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO tasks (
         user_id, goal_id, title, description, priority, status,
         due_date, estimated_duration, tags, subtasks,
         is_recurring, recurrence_rule, completed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        userId,
        verifiedGoalId,
        title.trim(),
        description ? description.trim() : "",
        priority,
        status,
        dueDate ? new Date(dueDate) : null,
        Number(estimatedDuration) || 25,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        JSON.stringify(Array.isArray(subtasks) ? subtasks : []),
        Boolean(isRecurring),
        recurrenceRule || null,
        status === "completed" ? new Date() : null,
      ]
    );

    const task = insertRes.rows[0];

    // If linked to goal, recalculate progress
    if (verifiedGoalId) {
      await recalculateGoalProgress(verifiedGoalId, userId);
    }

    // Evaluate achievements
    const io = req.app?.get ? req.app.get("io") : null;
    await evaluateUserAchievements(userId, io);

    if (io) {
      io.to(`user:${userId}`).emit("task:created", { task });
    }

    return res.status(201).json({ success: true, task });
  } catch (error) {
    console.error("createTask Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create task." });
  }
};

// GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const resDb = await pool.query(
      `SELECT t.*, g.name as goal_name
       FROM tasks t
       LEFT JOIN goals g ON t.goal_id = g.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );

    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    return res.status(200).json({ success: true, task: resDb.rows[0] });
  } catch (error) {
    console.error("getTaskById Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch task." });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedDuration,
      goalId,
      tags,
      subtasks,
      isRecurring,
      recurrenceRule,
    } = req.body;

    // Verify task exists and belongs to user
    const existing = await pool.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const current = existing.rows[0];

    // Determine completion timestamp
    let completedAt = current.completed_at;
    if (status && status !== current.status) {
      completedAt = status === "completed" ? new Date() : null;
    }

    // Verify goal if provided
    let verifiedGoalId = current.goal_id;
    if (goalId !== undefined) {
      if (goalId === null || goalId === "") {
        verifiedGoalId = null;
      } else {
        const gCheck = await pool.query("SELECT id FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
        if (gCheck.rows.length > 0) {
          verifiedGoalId = goalId;
        }
      }
    }

    const updateRes = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           status = COALESCE($4, status),
           due_date = $5,
           estimated_duration = COALESCE($6, estimated_duration),
           goal_id = $7,
           tags = COALESCE($8, tags),
           subtasks = COALESCE($9, subtasks),
           is_recurring = COALESCE($10, is_recurring),
           recurrence_rule = $11,
           completed_at = $12,
           updated_at = NOW()
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [
        title !== undefined ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        priority || null,
        status || null,
        dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : current.due_date,
        estimatedDuration !== undefined ? Number(estimatedDuration) : null,
        verifiedGoalId,
        tags !== undefined ? JSON.stringify(tags) : null,
        subtasks !== undefined ? JSON.stringify(subtasks) : null,
        isRecurring !== undefined ? Boolean(isRecurring) : null,
        recurrenceRule !== undefined ? recurrenceRule : current.recurrence_rule,
        completedAt,
        id,
        userId,
      ]
    );

    const task = updateRes.rows[0];

    // Recalculate goal progress if goal attached or status changed
    if (verifiedGoalId) {
      await recalculateGoalProgress(verifiedGoalId, userId);
    }
    if (current.goal_id && current.goal_id !== verifiedGoalId) {
      await recalculateGoalProgress(current.goal_id, userId);
    }

    const io = req.app?.get ? req.app.get("io") : null;
    await evaluateUserAchievements(userId, io);

    if (io) {
      io.to(`user:${userId}`).emit("task:updated", { task });
    }

    return res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("updateTask Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update task." });
  }
};

// PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const validStatuses = ["todo", "in_progress", "completed", "blocked"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid task status." });
    }

    const completedAt = status === "completed" ? new Date() : null;

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1,
           completed_at = $2,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, completedAt, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = result.rows[0];

    if (task.goal_id) {
      await recalculateGoalProgress(task.goal_id, userId);
    }

    const io = req.app?.get ? req.app.get("io") : null;
    await evaluateUserAchievements(userId, io);

    if (io) {
      io.to(`user:${userId}`).emit("task:updated", { task });
    }

    return res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("updateTaskStatus Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update task status." });
  }
};

// PATCH /api/tasks/:id/subtasks/:subtaskId
exports.toggleSubtask = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id, subtaskId } = req.params;
    const { completed } = req.body;

    const taskRes = await pool.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = taskRes.rows[0];
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

    const updatedSubtasks = subtasks.map((st) => {
      if (st.id === subtaskId) {
        return { ...st, completed: Boolean(completed) };
      }
      return st;
    });

    const updateRes = await pool.query(
      `UPDATE tasks
       SET subtasks = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(updatedSubtasks), id, userId]
    );

    const updatedTask = updateRes.rows[0];
    const io = req.app?.get ? req.app.get("io") : null;
    if (io) {
      io.to(`user:${userId}`).emit("task:updated", { task: updatedTask });
    }

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("toggleSubtask Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update subtask." });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const delRes = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, goal_id",
      [id, userId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const deleted = delRes.rows[0];
    if (deleted.goal_id) {
      await recalculateGoalProgress(deleted.goal_id, userId);
    }

    const io = req.app?.get ? req.app.get("io") : null;
    await evaluateUserAchievements(userId, io);

    if (io) {
      io.to(`user:${userId}`).emit("task:deleted", { taskId: id });
    }

    return res.status(200).json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("deleteTask Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete task." });
  }
};

// GET /api/tasks/next-action
// Answers "What should I focus on now?" based on priority, deadline urgency,
// goal link, remaining duration, and past performance.
exports.getNextAction = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const tasksRes = await pool.query(
      `SELECT t.id, t.user_id, t.goal_id, t.title, t.description, t.priority,
              t.status, t.due_date, t.estimated_duration, t.actual_duration,
              t.milestone, t.tags, t.subtasks, t.created_at,
              g.name as goal_name, g.category as goal_category, g.target_value as goal_target
       FROM tasks t
       LEFT JOIN goals g ON t.goal_id = g.id
       WHERE t.user_id = $1 AND t.status != 'completed'
       ORDER BY t.created_at DESC`,
      [userId]
    );

    const openTasks = tasksRes.rows;
    if (openTasks.length === 0) {
      return res.status(200).json({
        success: true,
        hasTask: false,
        task: null,
        reason: "No active tasks in your queue. Create a task or generate a plan to start focusing.",
        alternativeTasks: [],
      });
    }

    const now = Date.now();

    // Score tasks mathematically
    const scored = openTasks.map((task) => {
      let score = 0;
      const reasons = [];

      // 1. Priority scoring
      const p = String(task.priority || "Medium").toLowerCase();
      if (p === "critical") {
        score += 50;
        reasons.push("Critical priority");
      } else if (p === "high") {
        score += 35;
        reasons.push("High priority");
      } else if (p === "medium") {
        score += 20;
      } else {
        score += 10;
      }

      // 2. Deadline urgency
      if (task.due_date) {
        const dueDateMs = new Date(task.due_date).getTime();
        const diffDays = (dueDateMs - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) {
          score += 45;
          reasons.push("Overdue deadline requiring immediate attention");
        } else if (diffDays <= 1) {
          score += 35;
          reasons.push("Due today");
        } else if (diffDays <= 3) {
          score += 20;
          reasons.push(`Due in ${Math.ceil(diffDays)} days`);
        } else {
          score += 5;
        }
      }

      // 3. Goal relevance
      if (task.goal_name) {
        score += 15;
        reasons.push(`Directly advances goal "${task.goal_name}"`);
      }

      // 4. In progress status
      if (task.status === "in_progress") {
        score += 10;
        reasons.push("Already in progress");
      }

      // 5. Sprint-friendly duration (15 to 60 mins)
      const est = Number(task.estimated_duration) || 25;
      if (est >= 15 && est <= 60) {
        score += 5;
      }

      const fullReason = reasons.length > 0
        ? `Recommended because: ${reasons.join(", ")}.`
        : `Recommended based on queued priority and timeline.`;

      return {
        task,
        score,
        reason: fullReason,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternativeTasks = scored.slice(1, 6).map((s) => s.task);

    return res.status(200).json({
      success: true,
      hasTask: true,
      task: best.task,
      reason: best.reason,
      score: best.score,
      alternativeTasks,
    });
  } catch (error) {
    console.error("getNextAction Error:", error);
    return res.status(500).json({ success: false, message: "Failed to determine next action." });
  }
};

// GET /api/tasks/estimate
// Reality Learning Engine: compares planned vs actual task duration
// from the user's authentic history of completed tasks.
exports.getTaskEstimate = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { title = "", goalId, tags = "" } = req.query;

    // Fetch user's completed tasks with recorded duration
    const historyRes = await pool.query(
      `SELECT id, title, estimated_duration, actual_duration, tags, goal_id, completed_at
       FROM tasks
       WHERE user_id = $1 AND status = 'completed' AND actual_duration > 0
       ORDER BY completed_at DESC
       LIMIT 100`,
      [userId]
    );

    const completed = historyRes.rows;

    // Tokenize title to find similar completed tasks
    const keywords = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    let matching = [];
    if (keywords.length > 0 || goalId) {
      matching = completed.filter((t) => {
        if (goalId && t.goal_id === goalId) return true;
        const tTitle = (t.title || "").toLowerCase();
        return keywords.some((k) => tTitle.includes(k));
      });
    }

    if (matching.length >= 2) {
      const actuals = matching.map((t) => Number(t.actual_duration));
      const sum = actuals.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / actuals.length);
      const min = Math.min(...actuals);
      const max = Math.max(...actuals);

      return res.status(200).json({
        success: true,
        hasComparableHistory: true,
        sampleCount: matching.length,
        estimatedDuration: avg,
        minDuration: min,
        maxDuration: max,
        explanation: `Similar completed tasks took approximately ${min}–${max} minutes (average: ${avg}m, based on ${matching.length} past completed tasks).`,
      });
    }

    // Fall back to general completed tasks history if at least 3 exist
    if (completed.length >= 3) {
      const allActuals = completed.map((t) => Number(t.actual_duration));
      const allSum = allActuals.reduce((a, b) => a + b, 0);
      const allAvg = Math.round(allSum / allActuals.length);
      const allMin = Math.min(...allActuals);
      const allMax = Math.max(...allActuals);

      return res.status(200).json({
        success: true,
        hasComparableHistory: true,
        sampleCount: completed.length,
        estimatedDuration: allAvg,
        minDuration: allMin,
        maxDuration: allMax,
        explanation: `Estimate: ${allAvg} minutes. Based on your general completed tasks (average: ${allAvg}m across ${completed.length} tasks).`,
      });
    }

    // Insufficient historical data: transparent initial estimate
    return res.status(200).json({
      success: true,
      hasComparableHistory: false,
      sampleCount: completed.length,
      estimatedDuration: 25,
      explanation: "Initial estimate: 25 minutes. FocusFlow will learn and personalize your duration estimates once you complete more tasks.",
    });
  } catch (error) {
    console.error("getTaskEstimate Error:", error);
    return res.status(500).json({ success: false, message: "Failed to calculate duration estimate." });
  }
};

module.exports.recalculateGoalProgress = recalculateGoalProgress;

