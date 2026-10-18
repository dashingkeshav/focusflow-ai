/**
 * FocusFlow AI — Policy Engine
 *
 * Maps a classification + context → action, per strictness mode:
 *   productive           → allow
 *   possibly_productive  → warn (balanced) / block (strict, after confirm)
 *   distracting          → block, with graduated escalation on repeats
 *
 * Escalation ladder (per domain):
 *   attempt 1–2 → warn   ("focus drift detected")
 *   attempt 3+  → block with temporary exception window (10 min cooldown)
 *
 * AI decisions are trusted only above CONFIDENCE_APPLY; between 0.50–0.79 the
 * decision downgrades to a warning; below 0.50 it is treated as unknown.
 */

const CONFIDENCE_APPLY = 0.8;
const CONFIDENCE_WARN = 0.5;

const ESCALATION = {
  WARN_UNTIL: 2,        // first two attempts are soft warnings
  BLOCK_AFTER: 2,       // third attempt blocks
  EXCEPTION_MINUTES: 10 // temporary exception after a block decision
};

/**
 * @param {object} params
 * @param {"productive"|"possibly_productive"|"distracting"} params.category
 * @param {number} params.confidence
 * @param {string} params.reason
 * @param {"balanced"|"strict"|"custom"} params.strictness
 * @param {number} params.attemptCount  how many times user hit this domain this session
 * @param {boolean} params.aiVerified   whether an AI decision with high confidence produced this
 */
function decideAction({
  category,
  confidence,
  strictness = "balanced",
  attemptCount = 0,
  aiVerified = false,
}) {
  // Confidence gating for AI-sourced decisions.
  let effectiveCategory = category;
  if (aiVerified) {
    if (confidence < CONFIDENCE_WARN) {
      effectiveCategory = "possibly_productive";
    } else if (confidence < CONFIDENCE_APPLY) {
      effectiveCategory = "possibly_productive";
    }
  }

  if (effectiveCategory === "productive") {
    return { action: "allow", effectiveCategory, notify: false };
  }

  if (effectiveCategory === "distracting") {
    const attempts = Math.max(1, attemptCount);
    if (attempts > ESCALATION.BLOCK_AFTER || aiVerified) {
      return {
        action: "block",
        effectiveCategory,
        notify: true,
        exceptionMinutes: ESCALATION.EXCEPTION_MINUTES,
        message: "Blocked during this focus session.",
      };
    }
    return {
      action: "warn",
      effectiveCategory,
      notify: true,
      message:
        attempts === 1
          ? "Focus drift detected. This site looks unrelated to your task."
          : `You've left your task ${attempts} times. Returning once more will block this site.`,
    };
  }

  // possibly_productive
  if (strictness === "strict") {
    return {
      action: "warn",
      effectiveCategory,
      notify: true,
      message: "Strict mode: confirm this site helps your current task.",
    };
  }
  return {
    action: "allow",
    effectiveCategory,
    notify: true,
    message: "Potentially useful — FocusFlow is watching how this site is used.",
  };
}

module.exports = { decideAction, CONFIDENCE_APPLY, CONFIDENCE_WARN, ESCALATION };
