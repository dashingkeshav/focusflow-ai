/**
 * FocusFlow AI — Smart Focus Mode Controller
 * Session lifecycle (start / pause / resume / end / state) + site classification API.
 * All operations verify session ownership via req.user.id.
 */

const Session = require("../models/Session");
const ActivityEvent = require("../models/ActivityEvent");
const { pool } = require("../config/db");
const focusStateStore = require("../utils/focusStateStore");
const { classifyHeuristic, cleanHost } = require("../utils/siteClassifier");
const { decideAction } = require("../utils/policyEngine");
const {
  WARNING_EVENT_TYPES,
  CAMERA_EVENT_TYPES,
  computeSessionMetrics,
  applyScoreSample,
  computeElapsedSeconds,
} = require("../utils/focusMetrics");

async function respondWithLiveMetrics(req, res, requestedSessionId) {
  const userId = req.user.id;
  const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));
  const sessionId = requestedSessionId || state?.sessionId || null;

  if (!sessionId) {
    return {
      success: true,
      sessionId: null,
      status: null,
      hasTelemetry: false,
      score: null,
      isDistracted: false,
      alertMessage: null,
      metrics: null,
      timestamp: Date.now(),
    };
  }

  const session = await Session.findOne({ id: sessionId, userId });
  if (!session) {
    return {
      success: true,
      sessionId: null,
      status: null,
      hasTelemetry: false,
      score: null,
      isDistracted: false,
      alertMessage: null,
      metrics: null,
      timestamp: Date.now(),
    };
  }

  const metrics = await computeSessionMetrics(session);
  return {
    success: true,
    sessionId: session.id,
    status: session.status,
    hasTelemetry: metrics.hasTelemetry,
    score: metrics.focusScore,
    isDistracted: metrics.isDistracted,
    alertMessage: metrics.alertMessage,
    metrics,
    timestamp: Date.now(),
  };
}

/**
 * Legacy focus score endpoint (kept for compatibility).
 * The score is always computed from the REAL persisted telemetry of the
 * user's active session — client-supplied numbers are never scored.
 * When no session is active or nothing has been measured, score is null
 * and the UI must show "Not available".
 */
exports.calculateFocusScore = async (req, res) => {
  try {
    const payload = await respondWithLiveMetrics(req, res, null);
    return res.json(payload);
  } catch (error) {
    console.error("calculateFocusScore error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate focus score."
    });
  }
};

/**
 * GET /api/focus/live
 * Real-time metrics + score for the active (or requested) session,
 * computed from persisted real data. Ownership enforced via req.user.id.
 */
exports.getLiveMetrics = async (req, res) => {
  try {
    const requested = typeof req.query.sessionId === "string" ? req.query.sessionId : null;
    const payload = await respondWithLiveMetrics(req, res, requested);
    return res.json(payload);
  } catch (error) {
    console.error("getLiveMetrics error:", error);
    return res.status(500).json({ success: false, message: "Failed to load live metrics." });
  }
};

function parseSiteList(input) {
  if (Array.isArray(input)) return input;
  return String(input || "")
    .split(",")
    .map((item) => cleanHost(item))
    .filter(Boolean)
    .slice(0, 50);
}

/**
 * GET /api/focus/state
 * Canonical active focus state — polled by the extension and dashboard.
 */
exports.getFocusState = async (req, res) => {
  try {
    const userId = req.user.id;

    let state = focusStateStore.activeState(userId);
    if (!state) {
      state = await focusStateStore.loadFromDb(userId);
    }

    if (state && state.endsAt && Date.now() > state.endsAt && !state.paused) {
      // Expire in-memory state; session record is finalized on next end/summary call.
      focusStateStore.clearState(userId);
      return res.json({ success: true, state: null, expired: true });
    }

    return res.json({ success: true, state: state || null });
  } catch (error) {
    console.error("getFocusState error:", error);
    return res.status(500).json({ success: false, message: "Failed to load focus state." });
  }
};

/**
 * POST /api/focus/start
 * Body: { taskTitle, subject?, durationSeconds, strictness, browserProtection,
 *         allowedSites?, blockedSites?, warningSites? }
 */
exports.startFocusSession = async (req, res) => {
  let client;
  let transactionStarted = false;
  try {
    const userId = req.user.id;

    const taskTitle =
      typeof req.body.taskTitle === "string" && req.body.taskTitle.trim()
        ? req.body.taskTitle.trim().slice(0, 160)
        : "";

    const requestedDuration = req.body.plannedDurationSeconds ?? req.body.durationSeconds;
    const durationSeconds = requestedDuration == null
      ? 1500
      : Number(requestedDuration);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 28800) {
      return res.status(400).json({
        success: false,
        message: "plannedDurationSeconds must be an integer from 60 to 28800.",
      });
    }

    const allowedSites = parseSiteList(req.body.allowedSites);
    const blockedSites = parseSiteList(req.body.blockedSites);
    const warningSites = parseSiteList(req.body.warningSites);

    const strictnessRaw = String(req.body.strictness || "balanced").toLowerCase();
    const strictness = ["balanced", "strict", "custom"].includes(strictnessRaw) ? strictnessRaw : "balanced";
    const mode = req.body.mode || (strictness === "strict" ? "strict_lock" : "smart");
    const primarySite = req.body.primarySite ? cleanHost(req.body.primarySite) : (allowedSites && allowedSites[0] ? cleanHost(allowedSites[0]) : "");

    const subject = typeof req.body.subject === "string" ? req.body.subject.trim().slice(0, 120) : "";
    const browserProtection = req.body.browserProtection !== false;

    const taskId = req.body.taskId || null;
    const task = taskId ? await Session.findOwnedTask(taskId, userId) : null;
    if (taskId && !task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or does not belong to you.",
      });
    }

    // Validate ownership before changing any existing active session.
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
      title: taskTitle || task?.title || "Study Focus Session",
      subject,
      startTime: new Date(),
      status: "active",
      strictness,
      mode,
      plannedDurationSeconds: durationSeconds,
      browserProtection,
      allowedSites,
      blockedSites,
      warningSites,
    }, client);

    await client.query(
      `UPDATE sessions
       SET status = 'cancelled', end_time = $1, updated_at = NOW()
       WHERE user_id = $2 AND status = 'active' AND id <> $3`,
      [new Date(), userId, session.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const now = Date.now();
    const state = {
      active: true,
      paused: false,
      sessionId: session.id,
      userId,
      taskId,
      taskTitle: session.title,
      subject,
      strictness,
      mode,
      primarySite,
      startedAt: now,
      endsAt: now + durationSeconds * 1000,
      plannedDurationSeconds: durationSeconds,
      browserProtection,
      allowedSites,
      blockedSites,
      warningSites,
      escalatedDomains: {},
      warningCount: 0,
      blockedAttempts: 0,
      tabSwitches: 0,
      temporaryExceptions: [],
    };
    focusStateStore.setState(userId, state);

    // Real-time sync to the dashboard
    const io = req.app?.get ? req.app.get("io") : null;
    if (io) {
      io.to(`user:${userId}`).emit("focus_state_changed", { state });
    }

    return res.status(201).json({ success: true, message: "Focus session started", session, state });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // Preserve the original error while attempting to release transaction locks.
      }
    }
    console.error("startFocusSession error:", error);
    if (error.code === "TASK_NOT_OWNED") {
      return res.status(404).json({
        success: false,
        message: "Task not found or does not belong to you.",
      });
    }
    return res.status(500).json({ success: false, message: "Failed to start focus session." });
  } finally {
    if (client) client.release();
  }
};

/**
 * POST /api/focus/pause
 * Pauses protection and the focus clock (idempotent).
 */
exports.pauseFocusSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));
    if (!state) {
      return res.status(404).json({ success: false, message: "No active focus session." });
    }

    const pausedAt = Date.now();
    const remainingMs = Math.max(0, state.endsAt - pausedAt);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    const updated = {
      ...state,
      paused: true,
      pausedAt,
      remainingSecondsWhenPaused: remainingSeconds,
    };
    focusStateStore.setState(userId, updated);

    await Session.findOneAndUpdate(
      { id: state.sessionId, userId },
      {
        $set: {
          pausedAt: new Date(pausedAt),
          plannedDurationSeconds: Math.max(remainingSeconds, 60),
          status: "paused",
        },
      }
    );

    const io = req.app?.get ? req.app.get("io") : null;
    if (io) io.to(`user:${userId}`).emit("focus_state_changed", { state: updated });

    return res.json({ success: true, message: "Focus session paused", state: updated });
  } catch (error) {
    console.error("pauseFocusSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to pause focus session." });
  }
};

/**
 * POST /api/focus/resume
 */
exports.resumeFocusSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));
    if (!state) {
      return res.status(404).json({ success: false, message: "No focus session to resume." });
    }

    // Push endsAt out by the paused duration so focus time is not consumed while paused.
    const pauseDurationMs = state.pausedAt ? Date.now() - state.pausedAt : 0;
    const endsAt = state.endsAt + pauseDurationMs;

    // Accumulate the real paused time onto the session so the final
    // duration can be computed as wall-clock time minus paused time.
    const existing = await Session.findOne({ id: state.sessionId, userId });
    const pausedSecondsTotal =
      (existing?.pausedSeconds || 0) + Math.max(0, Math.round(pauseDurationMs / 1000));

    const updated = {
      ...state,
      paused: false,
      pausedAt: null,
      endsAt,
    };
    focusStateStore.setState(userId, updated);

    await Session.findOneAndUpdate(
      { id: state.sessionId, userId },
      {
        $set: {
          pausedAt: null,
          pausedSeconds: pausedSecondsTotal,
          status: "active",
          plannedDurationSeconds: Math.ceil((endsAt - Date.now()) / 1000),
        },
      }
    );

    const io = req.app?.get ? req.app.get("io") : null;
    if (io) io.to(`user:${userId}`).emit("focus_state_changed", { state: updated });

    return res.json({ success: true, message: "Focus session resumed", state: updated });
  } catch (error) {
    console.error("resumeFocusSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to resume focus session." });
  }
};

/**
 * POST /api/focus/end
 * Ends the session, releases protection, records the summary.
 */
exports.endFocusSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));

    const {
      sessionId: bodySessionId,
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

    const sessionId = state?.sessionId || bodySessionId;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const existing = await Session.findOne({ id: sessionId, userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Session not found or does not belong to you." });
    }

    const endAt = Date.now();

    // Extension-reported counters are real measurements — fold them in as
    // floors so a final flush is never lost. Scores/duration are NEVER taken
    // from the client: they are computed from persisted real data below.
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

    const durationSeconds = computeElapsedSeconds(existing, endAt);

    const { notes, taskOutcome, markTaskCompleted } = req.body;

    await Session.findOneAndUpdate(
      { id: sessionId, userId },
      {
        $set: {
          ...measured,
          endTime: new Date(endAt),
          durationSeconds,
          status: status || "completed",
          notes: notes ? String(notes).trim().slice(0, 1000) : null,
          taskOutcome: taskOutcome || null,
        },
      }
    );

    // Final metrics from ALL persisted real data (events + counters).
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

    focusStateStore.clearState(userId);

    // If connected to a real task, update task progress and linked goal
    const linkedTaskId = existing.taskId || state?.taskId || (bodySessionId && req.body.taskId);
    if (linkedTaskId) {
      try {
        const durationMins = Math.max(1, Math.round(durationSeconds / 60));
        
        // Determine whether to mark complete, partial, or todo
        let targetTaskStatus = "in_progress";
        let isComplete = false;

        if (taskOutcome === "completed" || markTaskCompleted === true) {
          targetTaskStatus = "completed";
          isComplete = true;
        } else if (taskOutcome === "todo" || taskOutcome === "not_started") {
          targetTaskStatus = "todo";
          isComplete = false;
        } else if (taskOutcome === "in_progress" || markTaskCompleted === false) {
          targetTaskStatus = "in_progress";
          isComplete = false;
        } else {
          // Fallback legacy logic
          isComplete = status === "completed";
          targetTaskStatus = isComplete ? "completed" : "in_progress";
        }

        const { pool } = require("../config/db");
        await pool.query(
          `UPDATE tasks
           SET actual_duration = COALESCE(actual_duration, 0) + $1,
               status = $2,
               completed_at = CASE WHEN $3 = true THEN NOW() ELSE completed_at END,
               updated_at = NOW()
           WHERE id = $4 AND user_id = $5`,
          [durationMins, targetTaskStatus, isComplete, linkedTaskId, userId]
        );

        const taskRes = await pool.query(
          "SELECT goal_id FROM tasks WHERE id = $1 AND user_id = $2",
          [linkedTaskId, userId]
        );
        if (taskRes.rows[0]?.goal_id) {
          const { recalculateGoalProgress } = require("./taskController");
          await recalculateGoalProgress(taskRes.rows[0].goal_id, userId);
        }
      } catch (tErr) {
        console.error("Failed to update task on focus session end:", tErr);
      }
    }

    const io = req.app?.get ? req.app.get("io") : null;

    // Evaluate user achievements from real database activity
    try {
      const { evaluateUserAchievements } = require("../utils/achievementEvaluator");
      await evaluateUserAchievements(userId, io);
    } catch (aErr) {
      console.error("Failed to evaluate achievements on focus session end:", aErr);
    }

    if (io) io.to(`user:${userId}`).emit("focus_state_changed", { state: null, session, metrics });

    try {
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
      console.warn("Failed to create focus completion notification:", nErr.message);
    }

    return res.json({ success: true, message: "Session completed successfully", session, metrics });
  } catch (error) {
    console.error("endFocusSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to end focus session." });
  }
};

/**
 * POST /api/focus/classify
 * Body: { hostname, url?, title?, sessionId? }
 * Returns the classification + policy action for a site during the active session.
 * Optional OPENAI_API_KEY enables an AI second opinion (domain+title only, never page content).
 */
exports.classifySite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hostname, url, title } = req.body;

    if (!hostname || typeof hostname !== "string") {
      return res.status(400).json({ success: false, message: "hostname is required" });
    }

    const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));
    const taskTitle = state?.taskTitle || "";
    const subject = state?.subject || "";
    const strictness = state?.strictness || "balanced";

    const base = classifyHeuristic({
      hostname,
      url,
      title,
      taskTitle,
      subject,
      strictness,
      allowedSites: state?.allowedSites || [],
      blockedSites: state?.blockedSites || [],
      warningSites: state?.warningSites || [],
    });

    // Attempt counters for escalation (per domain, per session).
    const domain = cleanHost(hostname);
    const attempts = state?.escalatedDomains?.[domain]?.count || 0;

    const action = decideAction({
      category: base.category,
      confidence: base.confidence,
      strictness,
      attemptCount: attempts,
      aiVerified: false,
    });

    return res.json({
      success: true,
      classification: {
        category: action.effectiveCategory,
        confidence: base.confidence,
        reason: base.reason,
        action: action.action,
        message: action.message || "",
        exceptionMinutes: action.exceptionMinutes || null,
        taskTitle,
      },
    });
  } catch (error) {
    console.error("classifySite error:", error);
    return res.status(500).json({ success: false, message: "Classification failed." });
  }
};

/**
 * POST /api/focus/event
 * Records a structured focus event (tab_switched, distraction_detected, site_blocked, ...).
 * Mirrors the existing /api/sessions/event endpoint with the new classification fields.
 */
exports.recordFocusEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, eventType, domain, fromDomain, classification, action, reason, confidence, warningNumber, details, recoveryDurationSeconds, recovery_duration_seconds } = req.body;

    if (!sessionId || !eventType) {
      return res.status(400).json({ success: false, message: "sessionId and eventType are required" });
    }

    const session = await Session.findOne({ id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found or access denied" });
    }

    const event = await ActivityEvent.create({
      userId,
      sessionId,
      eventType,
      domain: domain || null,
      fromDomain: fromDomain || null,
      classification: classification || null,
      actionTaken: action || null,
      reason: reason || details || null,
      confidence: confidence ?? null,
      warningNumber: warningNumber ?? null,
      recoveryDurationSeconds: recoveryDurationSeconds ?? recovery_duration_seconds ?? null,
    });

    // Persist the real measured counters on the session row:
    //  - warnings: the extension never counts them itself, so the recorded
    //    warning events are the authoritative count
    //  - camera events: measured by the (opt-in) web camera monitor
    //  - lastTelemetryAt: proves real telemetry reached the backend
    const counterPatch = { lastTelemetryAt: new Date() };
    if (WARNING_EVENT_TYPES.includes(eventType)) {
      counterPatch.warningCount = (session.warningCount || 0) + 1;
    }
    if (CAMERA_EVENT_TYPES.includes(eventType)) {
      counterPatch.cameraDistractions = (session.cameraDistractions || 0) + 1;
    }
    await Session.findOneAndUpdate({ id: sessionId, userId }, { $set: counterPatch });

    // Re-read and compute real metrics so the dashboard gets live updates.
    const updatedSession = await Session.findOne({ id: sessionId, userId });
    const metrics = await computeSessionMetrics(updatedSession);

    // Live update for the dashboard activity panel
    const io = req.app?.get ? req.app.get("io") : null;
    if (io) {
      io.to(`user:${userId}`).emit("focus_event", {
        sessionId,
        eventType,
        domain: domain || null,
        fromDomain: fromDomain || null,
        classification: classification || null,
        action: action || null,
        reason: reason || details || null,
        timestamp: Date.now(),
      });
      io.to(`user:${userId}`).emit("focus_metrics", {
        sessionId,
        ...metrics,
        timestamp: Date.now(),
      });
    }

    return res.status(201).json({ success: true, event });
  } catch (error) {
    console.error("recordFocusEvent error:", error);
    return res.status(500).json({ success: false, message: "Failed to record focus event." });
  }
};

/**
 * POST /api/focus/sync-metrics
 * Extension pushes aggregated metrics (tab switches, blocked attempts, warning count).
 * Updates the session row + live state; the dashboard receives a focus_metrics event.
 */
exports.syncMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      sessionId,
      tabSwitches,
      warningCount,
      blockedAttempts,
      idleTimeSeconds,
      distractionEvents,
      productiveSeconds,
      keyboardEvents,
      mouseEvents,
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const state = focusStateStore.activeState(userId);
    const targetSessionId = state?.sessionId || sessionId;
    const existing = await Session.findOne({ id: targetSessionId, userId });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Session not found or access denied" });
    }

    // Extension-reported counters are real measurements; keep them monotonic
    // (a counter can only grow during a session) and stamp real telemetry.
    const patch = {
      tabSwitches: Math.max(Number(tabSwitches) || 0, existing.tabSwitches || 0),
      warningCount: Math.max(Number(warningCount) || 0, existing.warningCount || 0),
      blockedAttempts: Math.max(Number(blockedAttempts) || 0, existing.blockedAttempts || 0),
      idleTimeSeconds: Math.max(Number(idleTimeSeconds) || 0, existing.idleTimeSeconds || 0),
      distractionEvents: Math.max(Number(distractionEvents) || 0, existing.distractionEvents || 0),
      keyboardEvents: Math.max(Number(keyboardEvents) || 0, existing.keyboardEvents || 0),
      mouseEvents: Math.max(Number(mouseEvents) || 0, existing.mouseEvents || 0),
      lastTelemetryAt: new Date(),
    };
    if (productiveSeconds != null) {
      patch.productiveSeconds = Math.max(Number(productiveSeconds) || 0, existing.productiveSeconds || 0);
    }

    await Session.findOneAndUpdate({ id: targetSessionId, userId }, { $set: patch });

    // Fold the freshly measured score into the running average (real samples only).
    const refreshed = await Session.findOne({ id: targetSessionId, userId });
    const metrics = await computeSessionMetrics(refreshed);
    const scorePatch = applyScoreSample(refreshed, metrics.focusScore);
    if (Object.keys(scorePatch).length > 0) {
      await Session.findOneAndUpdate({ id: targetSessionId, userId }, { $set: scorePatch });
    }

    if (state) {
      focusStateStore.updateState(userId, {
        tabSwitches: patch.tabSwitches,
        warningCount: patch.warningCount,
        blockedAttempts: patch.blockedAttempts,
      });
    }

    const session = await Session.findOne({ id: targetSessionId, userId });

    const io = req.app?.get ? req.app.get("io") : null;
    if (io) {
      io.to(`user:${userId}`).emit("focus_metrics", {
        sessionId: targetSessionId,
        ...metrics,
        avgFocusScore: session.avgFocusScore,
        timestamp: Date.now(),
      });
    }

    return res.json({ success: true, session, metrics });
  } catch (error) {
    console.error("syncMetrics error:", error);
    return res.status(500).json({ success: false, message: "Failed to sync metrics." });
  }
};

/**
 * POST /api/focus/escalate
 * Extension reports a repeated distraction for a domain; increments the attempt counter
 * and returns the escalated action (warn → block with temporary exception window).
 */
exports.escalateDomain = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, domain } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, message: "domain is required" });
    }

    const state = focusStateStore.activeState(userId) || (await focusStateStore.loadFromDb(userId));
    if (!state) {
      return res.status(404).json({ success: false, message: "No active focus session." });
    }

    const cleanDomain = cleanHost(domain);
    const current = state.escalatedDomains?.[cleanDomain]?.count || 0;
    const nextCount = current + 1;
    const escalatedDomains = {
      ...(state.escalatedDomains || {}),
      [cleanDomain]: { count: nextCount, lastAt: Date.now() },
    };
    focusStateStore.updateState(userId, { escalatedDomains, distractionEvents: (state.distractionEvents || 0) + 1 });

    await Session.findOneAndUpdate(
      { id: state.sessionId, userId },
      { $set: { escalatedDomains, distractionEvents: (state.distractionEvents || 0) + 1 } }
    ).catch(() => null);

    const action = decideAction({
      category: "distracting",
      confidence: 0.98,
      strictness: state.strictness,
      attemptCount: nextCount,
      aiVerified: false,
    });

    return res.json({
      success: true,
      attemptCount: nextCount,
      action: action.action,
      message: action.message,
      exceptionMinutes: action.exceptionMinutes || null,
    });
  } catch (error) {
    console.error("escalateDomain error:", error);
    return res.status(500).json({ success: false, message: "Escalation failed." });
  }
};

/**
 * POST /api/focus/exception
 * Grants a temporary exception (e.g. "Continue on YouTube for 10 minutes").
 */
exports.grantException = async (req, res) => {
  try {
    const userId = req.user.id;
    const { domain, minutes = 10 } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, message: "domain is required" });
    }

    const state = focusStateStore.activeState(userId);
    if (!state) {
      return res.status(404).json({ success: false, message: "No active focus session." });
    }

    const cleanDomain = cleanHost(domain);
    const expiresAt = Date.now() + Math.max(1, Math.min(30, Number(minutes) || 10)) * 60 * 1000;
    const temporaryExceptions = [
      ...(state.temporaryExceptions || []).filter((e) => e.domain !== cleanDomain && e.expiresAt > Date.now()),
      { domain: cleanDomain, expiresAt },
    ];
    focusStateStore.updateState(userId, { temporaryExceptions });

    return res.json({ success: true, exception: { domain: cleanDomain, expiresAt } });
  } catch (error) {
    console.error("grantException error:", error);
    return res.status(500).json({ success: false, message: "Failed to grant exception." });
  }
};
