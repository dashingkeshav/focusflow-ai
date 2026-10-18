const Session = require("../models/Session");
const ActivityEvent = require("../models/ActivityEvent");
const { pool } = require("../config/db");
const {
  WARNING_EVENT_TYPES,
  CAMERA_EVENT_TYPES,
  computeSessionMetrics,
  computeElapsedSeconds,
} = require("../utils/focusMetrics");


// =====================================================
// START SESSION
// POST /api/sessions/start
// =====================================================

exports.startSession = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const userId = req.user.id;
    const taskId = req.body.taskId || null;
    const task = taskId
      ? await Session.findOwnedTask(taskId, userId)
      : null;

    if (taskId && !task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or does not belong to you.",
      });
    }

    const requestedDuration =
      req.body.plannedDurationSeconds ?? req.body.durationSeconds;
    let plannedDurationSeconds = 0;
    if (requestedDuration != null) {
      plannedDurationSeconds = Number(requestedDuration);
      if (!Number.isInteger(plannedDurationSeconds) || plannedDurationSeconds < 60 || plannedDurationSeconds > 28800) {
        return res.status(400).json({
          success: false,
          message: "plannedDurationSeconds must be an integer from 60 to 28800.",
        });
      }
    } else if (task) {
      plannedDurationSeconds = Math.max(60, Math.min(28800, Number(task.estimated_duration || 25) * 60));
    }

    const title =
      typeof req.body.title === "string" &&
      req.body.title.trim()
        ? req.body.title.trim()
        : task?.title || "Study Focus Session";


    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      [`focus-session:${userId}`]
    );

    const session = await Session.create({
        userId,
        taskId,
        title,
        startTime: new Date(),
        status: "active",
        plannedDurationSeconds,
      }, client);

    await client.query(
      `UPDATE sessions
       SET status = 'cancelled', end_time = $1, updated_at = NOW()
       WHERE user_id = $2 AND status = 'active' AND id <> $3`,
      [new Date(), userId, session.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;


    return res.status(201).json({
      success: true,
      message: "Focus session started",
      session,
    });

  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // Preserve the original error while attempting to release transaction locks.
      }
    }

    console.error(
      "startSession error:",
      error
    );

    if (error.code === "TASK_NOT_OWNED") {
      return res.status(404).json({
        success: false,
        message: "Task not found or does not belong to you.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to start focus session.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};


// =====================================================
// END SESSION
// POST /api/sessions/end
// =====================================================

exports.endSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      sessionId,
      tabSwitches,
      idleTimeSeconds,
      cameraDistractions,
      warningCount,
      blockedAttempts,
      distractionEvents,
      keyboardEvents,
      mouseEvents,
      status,
    } = req.body;


    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }


    const existing = await Session.findOne({
      id: sessionId,
      userId,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found or does not belong to you.",
      });
    }

    const endAt = Date.now();

    // Client counters are real extension measurements — keep them as floors.
    // Duration and scores are computed server-side from persisted real data;
    // no fabricated default (100/100) is ever stored.
    const measured = {
      tabSwitches: Math.max(existing.tabSwitches || 0, Number(tabSwitches) || 0),
      idleTimeSeconds: Math.max(existing.idleTimeSeconds || 0, Number(idleTimeSeconds) || 0),
      cameraDistractions: Math.max(existing.cameraDistractions || 0, Number(cameraDistractions) || 0),
      warningCount: Math.max(existing.warningCount || 0, Number(warningCount) || 0),
      blockedAttempts: Math.max(existing.blockedAttempts || 0, Number(blockedAttempts) || 0),
      distractionEvents: Math.max(existing.distractionEvents || 0, Number(distractionEvents) || 0),
      keyboardEvents: Math.max(existing.keyboardEvents || 0, Number(keyboardEvents) || 0),
      mouseEvents: Math.max(existing.mouseEvents || 0, Number(mouseEvents) || 0),
    };

    await Session.findOneAndUpdate(
      {
        id: sessionId,
        userId,
      },
      {
        $set: {
          ...measured,
          endTime: new Date(endAt),
          durationSeconds: computeElapsedSeconds(existing, endAt),
          status: status || "completed",
        },
      }
    );

    const finalRow = await Session.findOne({ id: sessionId, userId });
    const metrics = await computeSessionMetrics(finalRow);

    const scorePatch =
      metrics.focusScore != null
        ? {
            finalFocusScore: metrics.focusScore,
            avgFocusScore:
              (finalRow.focusScoreSamples || 0) > 0
                ? finalRow.avgFocusScore
                : metrics.focusScore,
          }
        : { finalFocusScore: null, avgFocusScore: null };

    const session = await Session.findOneAndUpdate(
      { id: sessionId, userId },
      { $set: scorePatch },
      { new: true }
    );

    try {
      const io = req.app?.get ? req.app.get("io") : null;
      const { createNotification } = require("../utils/notificationService");
      const durationMin = Math.max(1, Math.round((session?.durationSeconds || 0) / 60));
      const score = metrics?.focusScore ?? session?.avgFocusScore ?? null;
      const scoreText = score != null ? ` Flow score: ${score}/100.` : "";
      await createNotification({
        userId,
        title: "Focus Sprint Complete ⚡",
        message: `Session completed! You logged ${durationMin} min of dedicated focus.${scoreText}`,
        type: "focus",
        link: "/dashboard/sessions",
        io,
      });
    } catch (nErr) {
      console.warn("Failed to create session notification in endSession:", nErr.message);
    }

    return res.json({
      success: true,
      message:
        "Session completed successfully",
      session,
      metrics,
    });

  } catch (error) {

    console.error(
      "endSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to end focus session.",
    });
  }
};


// =====================================================
// HISTORY
// GET /api/sessions/history
// =====================================================

exports.getSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const requestedLimit =
      Number.parseInt(
        req.query.limit,
        10
      );

    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;


    const sessions =
      await Session.find({
        userId,
        limit,
      });


    return res.json({
      success: true,
      count: sessions.length,
      sessions,
    });

  } catch (error) {

    console.error(
      "getSessionHistory error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch session history.",
    });
  }
};


// =====================================================
// RECORD ACTIVITY EVENT
// POST /api/sessions/event
// =====================================================

exports.recordEvent = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      sessionId,
      eventType,
      details,
      domain,
      warningNumber,
    } = req.body;


    if (!sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message:
          "sessionId and eventType are required",
      });
    }


    // Verify session belongs to current user
    const session =
      await Session.findOne({
        id: sessionId,
        userId,
      });


    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found or access denied",
      });
    }


    const event =
      await ActivityEvent.create({
        userId,
        sessionId,
        eventType,
        details,
        domain:
          domain || null,
        warningNumber:
          warningNumber ?? null,
        timestamp:
          new Date(),
      });

    // Persist the real measured counters on the session row so analytics,
    // the dashboard and the Focus Score all read the same source of truth.
    const counterPatch = { lastTelemetryAt: new Date() };
    if (WARNING_EVENT_TYPES.includes(eventType)) {
      counterPatch.warningCount = (session.warningCount || 0) + 1;
    }
    if (CAMERA_EVENT_TYPES.includes(eventType)) {
      counterPatch.cameraDistractions = (session.cameraDistractions || 0) + 1;
    }
    await Session.findOneAndUpdate(
      { id: sessionId, userId },
      { $set: counterPatch }
    );

    const io = req.app.get("io");
    if (io) {
      const updatedSession = await Session.findOne({ id: sessionId, userId });
      const metrics = await computeSessionMetrics(updatedSession);
      io.to(`user:${userId}`).emit("focus_event", {
        sessionId,
        eventType,
        domain: domain || null,
        reason: typeof details === "string" ? details : null,
        timestamp: Date.now(),
      });
      io.to(`user:${userId}`).emit("focus_metrics", {
        sessionId,
        ...metrics,
        timestamp: Date.now(),
      });
    }

    return res.status(201).json({
      success: true,
      event,
    });

  } catch (error) {

    console.error(
      "recordEvent error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to record activity event.",
    });
  }
};


// =====================================================
// ACTIVE SESSION
// GET /api/sessions/active
// =====================================================

exports.getActiveSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session =
      await Session.findOne({
        userId,
        status: "active",
      });


    return res.json({
      success: true,
      session:
        session || null,
    });

  } catch (error) {

    console.error(
      "getActiveSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch active session.",
    });
  }
};