/**
 * FocusFlow AI — Real telemetry metrics engine.
 *
 * Computes live and final focus metrics for a session from REAL persisted
 * data only:
 *   - the session row (counters live-synced from the Chrome extension and
 *     the web app: tab switches, idle seconds, warnings, blocks, camera
 *     events, keyboard/mouse activity counts)
 *   - the activity_events recorded during the session (authoritative floor:
 *     every tab switch, warning, block or camera event is an insert)
 *
 * Nothing here is ever invented:
 *   - A session with no telemetry at all gets focusScore = null and the UI
 *     must display "Not available" (never a default 100/100).
 *   - A score of 100 is only produced when telemetry WAS collected and the
 *     measured counters genuinely show zero distractions.
 */

const ActivityEvent = require("../models/ActivityEvent");

// Event types that represent a real warning the user actually received.
const WARNING_EVENT_TYPES = [
  "site_warning",
  "distraction_detected",
  "distraction_warning",
];

// Event types that represent a real camera look-away measurement.
const CAMERA_EVENT_TYPES = ["camera_absent", "camera_multiple", "camera_distraction", "face_not_visible"];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Pure score computation from real measured counters.
 * Returns null when there is no telemetry to score.
 */
function computeFocusScoreFromCounters(m) {
  if (!m.hasTelemetry) return null;

  let score = 100;
  score -= (m.tabSwitches || 0) * 3; // every real tab switch
  score -= Math.floor((m.idleTimeSeconds || 0) / 60) * 2; // per measured idle minute
  score -= (m.warningCount || 0) * 4; // every real warning shown
  score -= (m.blockedAttempts || 0) * 8; // every real block enforced
  score -= (m.cameraDistractions || 0) * 6; // every real look-away event

  // Small bonus for measured (privacy-safe) input engagement — only applied
  // when keyboard/mouse activity was actually collected by the extension.
  const keyboard = m.keyboardEvents || 0;
  const mouse = m.mouseEvents || 0;
  if (keyboard + mouse > 0) {
    const engaged =
      (keyboard >= 10 && keyboard <= 4000) || (mouse >= 30 && mouse <= 8000);
    if (engaged) score += 3;
  }

  return clampScore(score);
}

/**
 * Distraction alert derived from the real measured counters (highest
 * contributor first). Null when nothing measurable fired.
 */
function buildAlertMessage(m, score) {
  if (score == null) return null;
  if ((m.cameraDistractions || 0) >= 2) {
    return `Camera alert: ${m.cameraDistractions} look-away events detected.`;
  }
  if ((m.tabSwitches || 0) >= 5) {
    return `High tab-switching rate detected (${m.tabSwitches} switches).`;
  }
  if ((m.idleTimeSeconds || 0) >= 120) {
    return `Inactivity detected for ${Math.floor((m.idleTimeSeconds || 0) / 60)} minute(s).`;
  }
  if ((m.blockedAttempts || 0) >= 2) {
    return `${m.blockedAttempts} distracting sites were blocked. Return to your task.`;
  }
  if (score < 65) {
    return `Focus score dropped to ${score}. Return to your study task.`;
  }
  return null;
}

/**
 * Aggregate all real telemetry for a session.
 * Event counts act as a floor for the session-row counters so a missed
 * metrics flush can never lose recorded events.
 */
async function computeSessionMetrics(session) {
  if (!session) return null;

  const events = await ActivityEvent.find({ sessionId: session.id });
  const countByType = {};
  let keyboardFromEvents = 0;
  let mouseFromEvents = 0;
  for (const event of events) {
    countByType[event.eventType] = (countByType[event.eventType] || 0) + 1;
    const details =
      event.details && typeof event.details === "object" ? event.details : null;
    if (event.eventType === "input_activity" && details) {
      keyboardFromEvents += Number(details.keyboardEvents) || 0;
      mouseFromEvents += Number(details.mouseEvents) || 0;
    }
  }

  const hasTelemetry = Boolean(
    session.lastTelemetryAt ||
      events.length > 0 ||
      (session.tabSwitches || 0) > 0 ||
      (session.idleTimeSeconds || 0) > 0 ||
      (session.cameraDistractions || 0) > 0 ||
      (session.blockedAttempts || 0) > 0 ||
      (session.warningCount || 0) > 0
  );

  const metrics = {
    hasTelemetry,
    tabSwitches: Math.max(
      session.tabSwitches || 0,
      (countByType["tab_switched"] || 0) + (countByType["tab_switch"] || 0)
    ),
    idleTimeSeconds: Math.max(session.idleTimeSeconds || 0, 0),
    cameraDistractions: Math.max(
      session.cameraDistractions || 0,
      ...CAMERA_EVENT_TYPES.map((type) => countByType[type] || 0)
    ),
    warningCount: Math.max(
      session.warningCount || 0,
      WARNING_EVENT_TYPES.reduce(
        (sum, type) => sum + (countByType[type] || 0),
        0
      )
    ),
    blockedAttempts: Math.max(
      session.blockedAttempts || 0,
      countByType["site_blocked"] || 0
    ),
    distractionEvents: Math.max(
      session.distractionEvents || 0,
      countByType["distraction_detected"] || 0
    ),
    keyboardEvents: Math.max(
      session.keyboardEvents || 0,
      keyboardFromEvents
    ),
    mouseEvents: Math.max(session.mouseEvents || 0, mouseFromEvents),
    productiveSeconds: session.productiveSeconds || 0,
    focusScoreSamples: session.focusScoreSamples || 0,
    lastTelemetryAt: session.lastTelemetryAt || null,
  };

  metrics.focusScore = computeFocusScoreFromCounters(metrics);
  metrics.isDistracted =
    metrics.focusScore != null
      ? metrics.tabSwitches >= 5 ||
        metrics.cameraDistractions >= 2 ||
        metrics.idleTimeSeconds >= 120 ||
        metrics.focusScore < 65
      : false;
  metrics.alertMessage = buildAlertMessage(metrics, metrics.focusScore);

  return metrics;
}

/**
 * Rolling real score sample: folds a freshly measured score into the
 * session's running average (avg_focus_score) and latest value
 * (final_focus_score). Returns an empty patch when there is nothing
 * measurable — never a fabricated value.
 */
function applyScoreSample(existing, score) {
  if (score == null) return {};
  const previousSamples = existing.focusScoreSamples || 0;
  const previousAvg =
    existing.avgFocusScore == null ? 0 : Number(existing.avgFocusScore);
  const samples = previousSamples + 1;
  const average = Math.round((previousAvg * previousSamples + score) / samples);
  return {
    avgFocusScore: average,
    focusScoreSamples: samples,
    finalFocusScore: score,
  };
}

/**
 * Real elapsed focus seconds for a session: wall-clock time between start
 * and end minus the accumulated paused time (including an in-progress pause).
 */
function computeElapsedSeconds(session, endAtMs = Date.now()) {
  if (!session.startTime) return 0;
  const startedAt = new Date(session.startTime).getTime();
  const elapsed = Math.max(0, Math.floor((endAtMs - startedAt) / 1000));
  let pausedTotal = session.pausedSeconds || 0;
  if (session.pausedAt && session.status === "paused") {
    pausedTotal += Math.max(
      0,
      Math.floor((endAtMs - new Date(session.pausedAt).getTime()) / 1000)
    );
  }
  return Math.max(0, elapsed - Math.floor(pausedTotal));
}

module.exports = {
  WARNING_EVENT_TYPES,
  CAMERA_EVENT_TYPES,
  computeFocusScoreFromCounters,
  computeSessionMetrics,
  applyScoreSample,
  computeElapsedSeconds,
};
