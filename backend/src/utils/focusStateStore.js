/**
 * FocusFlow AI — Focus State Store
 * Server-side source of truth for the ACTIVE focus session, used by:
 *   - the extension (polls /api/focus/state)
 *   - the web dashboard (REST + Socket.io)
 * Kept in memory (per process) and mirrored to the sessions table;
 * the DB copy lets the extension recover after browser/extension restarts.
 */

const Session = require("../models/Session");

const states = new Map(); // userId → state

function activeState(userId) {
  if (!userId) return null;
  const state = states.get(userId);
  if (!state) return null;
  return state;
}

async function loadFromDb(userId) {
  try {
    let session = await Session.findOne({ userId, status: "active" });
    if (!session) {
      // A paused session also keeps protection state across restarts.
      session = await Session.findOne({ userId, status: "paused" });
    }
    if (!session) {
      states.delete(userId);
      return null;
    }
    const isPaused = session.status === "paused";
    const endsAt = session.startTime
      ? new Date(session.startTime).getTime() + (session.plannedDurationSeconds || 0) * 1000
      : 0;
    const state = {
      active: true,
      paused: isPaused,
      sessionId: session.id,
      userId,
      taskTitle: session.title || "Focus session",
      subject: session.subject || "",
      strictness: session.strictness || "balanced",
      mode: session.mode || session.strictness || "smart",
      primarySite: (session.allowedSites && session.allowedSites[0]) || "",
      startedAt: session.startTime ? new Date(session.startTime).getTime() : Date.now(),
      endsAt,
      plannedDurationSeconds: session.plannedDurationSeconds || 0,
      browserProtection: session.browserProtection !== false,
      allowedSites: session.allowedSites || [],
      blockedSites: session.blockedSites || [],
      warningSites: session.warningSites || [],
      escalatedDomains: session.escalatedDomains || {},
      warningCount: session.warningCount || 0,
      blockedAttempts: session.blockedAttempts || 0,
      tabSwitches: session.tabSwitches || 0,
      temporaryExceptions: [],
    };
    if (isPaused) {
      // Preserve remaining time across restarts: pause froze the remaining
      // seconds into plannedDurationSeconds, so rebuild endsAt from pausedAt.
      state.remainingSecondsWhenPaused = session.plannedDurationSeconds || 0;
      state.endsAt = session.pausedAt
        ? new Date(session.pausedAt).getTime() + state.remainingSecondsWhenPaused * 1000
        : endsAt;
    }
    states.set(userId, state);
    return state;
  } catch (error) {
    console.error("[focusStateStore] loadFromDb failed:", error.message);
    return null;
  }
}

function setState(userId, state) {
  if (!userId || !state) return;
  states.set(userId, { ...state, userId });
}

function clearState(userId) {
  if (!userId) return;
  states.delete(userId);
}

/** Merge partial updates into the active state (e.g. escalation counters). */
function updateState(userId, patch = {}) {
  const current = states.get(userId);
  if (!current) return null;
  const next = { ...current, ...patch };
  states.set(userId, next);
  return next;
}

module.exports = { activeState, loadFromDb, setState, clearState, updateState };
