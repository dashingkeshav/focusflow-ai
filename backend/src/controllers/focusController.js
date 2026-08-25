exports.calculateFocusScore = (req, res) => {
  try {
    const { tabSwitches = 0, idleTimeSeconds = 0, keyboardRate = 0, mouseRate = 0 } = req.body;

    let score = 100;
    score -= tabSwitches * 4;
    score -= Math.floor(idleTimeSeconds / 10) * 1.5;

    if (keyboardRate > 15 && keyboardRate < 120) {
      score += 5;
    }
    if (mouseRate > 5 && mouseRate < 60) {
      score += 3;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let isDistracted = false;
    let alertMessage = '';

    if (tabSwitches >= 5) {
      isDistracted = true;
      alertMessage = `High tab switching rate detected (${tabSwitches} switches).`;
    } else if (idleTimeSeconds >= 120) {
      isDistracted = true;
      alertMessage = `Inactivity detected for ${Math.floor(idleTimeSeconds / 60)} minutes.`;
    } else if (score < 65) {
      isDistracted = true;
      alertMessage = `Focus Score dropped to ${score}. Refocus on primary study tab.`;
    }

    return res.json({
      success: true,
      score,
      isDistracted,
      alertMessage,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
