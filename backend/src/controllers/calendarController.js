/**
 * FocusFlow AI — Calendar Controller
 * Persists scheduled calendar events and AI plan items into Supabase PostgreSQL.
 */

const { pool } = require("../config/db");

// GET CALENDAR EVENTS
exports.getEvents = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await pool.query(
      `SELECT id, title, start_time as "startTime", end_time as "endTime",
              event_type as "eventType", linked_goal_name as "linkedGoal",
              linked_task_id as "linkedTaskId", description, created_at as "createdAt"
       FROM calendar_events
       WHERE user_id = $1
       ORDER BY start_time ASC`,
      [userId]
    );

    return res.status(200).json({ success: true, events: result.rows });
  } catch (error) {
    console.error("Get Calendar Events Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch calendar events." });
  }
};

// CREATE SINGLE EVENT
exports.createEvent = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { title, startTime, endTime, eventType, linkedGoal, description } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Title, start time, and end time are required." });
    }

    const startAt = new Date(startTime);
    const endAt = new Date(endTime);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ success: false, message: "A valid start time before the end time is required." });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      [String(userId)]
    );

    const overlaps = await client.query(
      `SELECT id, title, start_time, end_time
       FROM calendar_events
       WHERE user_id = $1 AND start_time < $3 AND end_time > $2
       LIMIT 1
       FOR UPDATE`,
      [userId, startAt, endAt]
    );
    if (overlaps.rows.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: "This event overlaps an existing calendar event.",
        conflict: overlaps.rows[0],
      });
    }

    const result = await client.query(
      `INSERT INTO calendar_events (user_id, title, start_time, end_time, event_type, linked_goal_name, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, start_time as "startTime", end_time as "endTime",
                 event_type as "eventType", linked_goal_name as "linkedGoal", description`,
      [userId, title.trim(), startAt, endAt, eventType || "focus", linkedGoal || null, description || null]
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json({ success: true, event: result.rows[0] });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // Preserve the original error while attempting to release transaction locks.
      }
    }
    console.error("Create Calendar Event Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create calendar event." });
  } finally {
    if (client) client.release();
  }
};

// APPLY AI PLAN TO CALENDAR
exports.applyPlanToCalendar = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { items, planDate } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ success: false, message: "Plan must contain between 1 and 100 items." });
    }

    const dateString = planDate == null
      ? (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      })()
      : planDate;
    if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return res.status(400).json({ success: false, message: "planDate must be a valid YYYY-MM-DD date." });
    }
    const [year, month, day] = dateString.split("-").map(Number);
    const baseDate = new Date(year, month - 1, day);
    if (
      baseDate.getFullYear() !== year
      || baseDate.getMonth() !== month - 1
      || baseDate.getDate() !== day
    ) {
      return res.status(400).json({ success: false, message: "planDate must be a valid YYYY-MM-DD date." });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestAllowedDate = new Date(today);
    latestAllowedDate.setDate(latestAllowedDate.getDate() + 365);
    if (baseDate < today || baseDate > latestAllowedDate) {
      return res.status(400).json({ success: false, message: "planDate must be today or within the next 365 days." });
    }

    const validTypes = new Set(["focus", "focus_block", "review", "habit", "habit_block", "break"]);
    const normalizedItems = [];
    const skippedPlanItems = [];
    const seenPlanItemIds = new Set();
    for (const [index, item] of items.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} is invalid.` });
      }

      const planItemId = item.id == null ? String(index) : String(item.id);
      if (!planItemId.trim() || planItemId.length > 128 || seenPlanItemIds.has(planItemId)) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} has an invalid or duplicate id.` });
      }
      seenPlanItemIds.add(planItemId);

      const status = item.status == null ? null : String(item.status).trim().toLowerCase();
      if (status && ["completed", "skipped"].includes(status)) {
        skippedPlanItems.push(planItemId);
        continue;
      }
      if (status && !["planned", "rescheduled", "in_progress"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Plan item ${index + 1} has an unsupported status.`,
        });
      }

      const type = typeof item.type === "string" ? item.type.toLowerCase() : "";
      if (!validTypes.has(type)) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} has an unsupported type.` });
      }

      const durationMinutes = Number(item.durationMinutes);
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} duration must be an integer from 1 to 480 minutes.` });
      }
      const title = typeof item.title === "string" && item.title.trim()
        ? item.title.trim().slice(0, 255)
        : type === "break" ? "Focus Break" : "";
      if (!title) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} requires a title.` });
      }

      const timeMatch = typeof item.time === "string"
        ? item.time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/)
        : null;
      if (!timeMatch) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} time must use HH:mm or HH:mm - HH:mm format.` });
      }
      const startHour = Number(timeMatch[1]);
      const startMinute = Number(timeMatch[2]);
      const endHour = timeMatch[3] == null ? null : Number(timeMatch[3]);
      const endMinute = timeMatch[4] == null ? null : Number(timeMatch[4]);
      if (
        startHour > 23 || startMinute > 59
        || (endHour != null && (endHour > 23 || endMinute > 59))
      ) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} time is outside the valid day.` });
      }

      const eventStart = new Date(baseDate);
      eventStart.setHours(startHour, startMinute, 0, 0);
      const eventEnd = endHour == null
        ? new Date(eventStart.getTime() + durationMinutes * 60000)
        : new Date(baseDate);
      if (endHour != null) {
        eventEnd.setHours(endHour, endMinute, 0, 0);
        if (eventEnd <= eventStart || eventEnd.getTime() - eventStart.getTime() !== durationMinutes * 60000) {
          return res.status(400).json({ success: false, message: `Plan item ${index + 1} time range must match its duration.` });
        }
      }
      if (eventStart <= new Date()) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} starts in the past.` });
      }

      const linkedGoal = typeof item.linkedGoal === "string" && item.linkedGoal.trim()
        ? item.linkedGoal.trim().slice(0, 255)
        : null;
      const goalId = typeof item.goalId === "string" && item.goalId.trim()
        ? item.goalId.trim()
        : null;
      if (goalId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId)) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} has an invalid goalId.` });
      }
      const taskId = typeof item.taskId === "string" && item.taskId.trim()
        ? item.taskId.trim()
        : null;
      if (taskId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} has an invalid taskId.` });
      }
      if (type === "break" && taskId) {
        return res.status(400).json({ success: false, message: `Plan item ${index + 1} cannot link a task to a break.` });
      }
      const allowedPriorities = new Set(["Critical", "High", "Medium", "Low"]);
      const priority = allowedPriorities.has(item.priority) ? item.priority : "Medium";
      const why = typeof item.why === "string" ? item.why.trim().slice(0, 5000) : "";

      normalizedItems.push({
        type,
        planItemId,
        title,
        durationMinutes,
        priority,
        linkedGoal,
        goalId,
        taskId,
        why,
        eventStart,
        eventEnd,
      });
    }

    if (!normalizedItems.length) {
      return res.status(200).json({
        success: true,
        message: "No calendar entries created; all supplied plan items were already completed or skipped.",
        tasks: [],
        events: [],
        taskLinks: [],
        skippedPlanItems,
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Share the calendar event writer's per-user lock so regular event creates
    // and plan approvals cannot race past each other's overlap checks.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      [String(userId)]
    );

    const scheduleItems = normalizedItems.filter((item) => item.eventStart < item.eventEnd);
    if (scheduleItems.length) {
      const firstStart = new Date(Math.min(...scheduleItems.map((item) => item.eventStart.getTime())));
      const lastEnd = new Date(Math.max(...scheduleItems.map((item) => item.eventEnd.getTime())));
      const existingEvents = await client.query(
        `SELECT id, title, start_time, end_time
         FROM calendar_events
         WHERE user_id = $1
           AND start_time < $3
           AND end_time > $2
         FOR UPDATE`,
        [userId, firstStart, lastEnd]
      );

      const conflicts = [];
      for (let index = 0; index < scheduleItems.length; index++) {
        const item = scheduleItems[index];
        const conflictEvent = existingEvents.rows.find((event) => (
          new Date(event.start_time) < item.eventEnd
          && new Date(event.end_time) > item.eventStart
        ));
        if (conflictEvent) {
          conflicts.push({
            planItemId: item.planItemId,
            eventId: conflictEvent.id,
            title: conflictEvent.title,
            startTime: conflictEvent.start_time,
            endTime: conflictEvent.end_time,
          });
        }

        const planConflict = scheduleItems.slice(index + 1).find((other) => (
          other.eventStart < item.eventEnd && other.eventEnd > item.eventStart
        ));
        if (planConflict) {
          conflicts.push({
            planItemId: item.planItemId,
            conflictingPlanItemId: planConflict.planItemId,
            title: planConflict.title,
            startTime: planConflict.eventStart.toISOString(),
            endTime: planConflict.eventEnd.toISOString(),
          });
        }
      }

      if (conflicts.length) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(409).json({
          success: false,
          message: "This plan overlaps existing calendar events or another plan item. Resolve the conflicts and try again.",
          conflicts,
        });
      }
    }

    const createdEvents = [];
    const createdTasks = [];
    const taskLinks = [];

    for (const item of normalizedItems) {
      const isBreak = item.type === "break";
      let task = null;
      if (!isBreak && item.taskId) {
        const taskResult = await client.query(
          `SELECT t.id, t.user_id, t.goal_id, t.title, t.description, t.priority,
                  t.status, t.due_date, t.estimated_duration, t.created_at, t.updated_at,
                  g.name AS goal_name
           FROM tasks t
           LEFT JOIN goals g ON g.id = t.goal_id AND g.user_id = t.user_id
           WHERE t.id = $1 AND t.user_id = $2
             AND t.status IN ('todo', 'in_progress')
           FOR UPDATE OF t`,
          [item.taskId, userId]
        );
        if (!taskResult.rows.length) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return res.status(404).json({ success: false, message: "A linked pending task was not found for this user." });
        }
        task = taskResult.rows[0];
      }

      let goal = task?.goal_id
        ? { id: task.goal_id, name: task.goal_name }
        : null;
      if (item.goalId || item.linkedGoal) {
        const goalResult = item.goalId
          ? await client.query(
            "SELECT id, name FROM goals WHERE id = $1 AND user_id = $2",
            [item.goalId, userId]
          )
          : await client.query(
            "SELECT id, name FROM goals WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1",
            [userId, item.linkedGoal]
          );
        if (!goalResult.rows.length) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return res.status(400).json({ success: false, message: "A linked goal was not found for this user." });
        }
        goal = goalResult.rows[0];
        if (item.linkedGoal && item.linkedGoal.toLowerCase() !== goal.name.toLowerCase()) {
          await client.query("ROLLBACK");
          transactionStarted = false;
          return res.status(400).json({ success: false, message: "Linked goal name and goalId do not match." });
        }
      }

      if (task && (item.goalId || item.linkedGoal) && task.goal_id !== goal?.id) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(400).json({ success: false, message: "The linked task does not belong to the supplied goal." });
      }

      if (!isBreak) {
        if (!task) {
          const taskResult = await client.query(
            `INSERT INTO tasks (
               user_id, goal_id, title, description, priority, status,
               due_date, estimated_duration
             )
             VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7)
             RETURNING id, user_id, goal_id, title, description, priority,
                       status, due_date, estimated_duration, created_at, updated_at`,
            [
              userId,
              goal?.id || null,
              item.title,
              item.why || "Approved plan item.",
              item.priority,
              item.eventStart,
              item.durationMinutes,
            ]
          );
          task = taskResult.rows[0];
          createdTasks.push(task);
        } else {
          task = {
            id: task.id,
            user_id: task.user_id,
            goal_id: task.goal_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            due_date: task.due_date,
            estimated_duration: task.estimated_duration,
            created_at: task.created_at,
            updated_at: task.updated_at,
          };
          createdTasks.push(task);
        }
      }

      const eventType = isBreak ? "break" : item.type === "review" ? "review" : "focus";
      const eventResult = await client.query(
        `INSERT INTO calendar_events (
           user_id, title, start_time, end_time, event_type,
           linked_goal_name, linked_task_id, description
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, title, start_time as "startTime", end_time as "endTime",
                   event_type as "eventType", linked_goal_name as "linkedGoal",
                   linked_task_id as "linkedTaskId", description`,
        [
          userId,
          item.title,
          item.eventStart,
          item.eventEnd,
          eventType,
          goal?.name || item.linkedGoal,
          task?.id || null,
          item.why || null,
        ]
      );
      const event = eventResult.rows[0];
      createdEvents.push(event);
      if (task) {
        taskLinks.push({ planItemId: item.planItemId, taskId: task.id, eventId: event.id });
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: `Created ${createdTasks.length} task(s) and scheduled ${createdEvents.length} calendar event(s).`,
      tasks: createdTasks,
      events: createdEvents,
      taskLinks,
      skippedPlanItems,
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // Preserve the original failure while best-effort rolling back.
      }
    }
    console.error("Apply Plan to Calendar Error:", error);
    return res.status(500).json({ success: false, message: "Failed to apply plan to calendar." });
  } finally {
    if (client) client.release();
  }
};

// DELETE EVENT
exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    await pool.query("DELETE FROM calendar_events WHERE id = $1 AND user_id = $2", [id, userId]);

    return res.status(200).json({ success: true, message: "Event removed from calendar." });
  } catch (error) {
    console.error("Delete Calendar Event Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete event." });
  }
};
