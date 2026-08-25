// FocusFlow AI Content Script for Interaction Telemetry

let keyStrokeCount = 0;
let mouseMovementCount = 0;

// Listen for keydown events without logging key values (Privacy-first)
window.addEventListener('keydown', () => {
  keyStrokeCount++;
});

// Throttle mouse movement tracking
let lastMouseMoveTime = 0;
window.addEventListener('mousemove', () => {
  const now = Date.now();
  if (now - lastMouseMoveTime > 200) {
    mouseMovementCount++;
    lastMouseMoveTime = now;
  }
});

// Every 10 seconds, send rate summary to background worker
setInterval(() => {
  if (keyStrokeCount > 0 || mouseMovementCount > 0) {
    chrome.runtime.sendMessage({
      type: 'INTERACTION_METRICS',
      keyStrokes: keyStrokeCount,
      mouseMovements: mouseMovementCount
    });
    // Reset counters
    keyStrokeCount = 0;
    mouseMovementCount = 0;
  }
}, 10000);
