/**
 * FocusFlow AI — Focus Score Calculation Engine
 *
 * Formula (deterministic — same inputs produce same output):
 *   Base score: 100
 *   − 4  per tab switch
 *   − 10 per camera distraction event
 *   − 1.5 per 10 s of idle time
 *   − 15 per distraction-domain visit
 *   + 5  if keyboard rate is in productive range (15–120 kpm)
 *   + 3  if mouse rate is in productive range (5–60 mpm)
 *   Clamped to [0, 100]
 *
 * Distraction thresholds:
 *   tabSwitches    >= 5   → distracted
 *   cameraDistract >= 2   → distracted
 *   idleSeconds    >= 120 → distracted
 *   score          < 65   → distracted
 */
exports.calculateFocusScore = (req, res) => {
  try {
    const {
      tabSwitches = 0,
      idleTimeSeconds = 0,
      keyboardRate = 0,
      mouseRate = 0,
      cameraDistractions = 0,
      distractionDomainCount = 0,
    } = req.body;

    let score = 100;
    score -= tabSwitches * 4;
    score -= cameraDistractions * 10;
    score -= Math.floor(idleTimeSeconds / 10) * 1.5;
    score -= distractionDomainCount * 15;

    if (keyboardRate > 15 && keyboardRate < 120) score += 5;
    if (mouseRate > 5 && mouseRate < 60) score += 3;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let isDistracted = false;
    let alertMessage = '';

    if (cameraDistractions >= 2) {
      isDistracted = true;
      alertMessage = `Camera alert: ${cameraDistractions} look-away events detected.`;
    } else if (tabSwitches >= 5) {
      isDistracted = true;
      alertMessage = `High tab-switching rate detected (${tabSwitches} switches).`;
    } else if (idleTimeSeconds >= 120) {
      isDistracted = true;
      alertMessage = `Inactivity detected for ${Math.floor(idleTimeSeconds / 60)} minutes.`;
    } else if (score < 65) {
      isDistracted = true;
      alertMessage = `Focus score dropped to ${score}. Return to your study task.`;
    }

    return res.json({
      success: true,
      score,
      isDistracted,
      alertMessage,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
