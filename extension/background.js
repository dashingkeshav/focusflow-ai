// FocusFlow AI Extension Background Service Worker (Manifest V3)
// Enhanced: Tab Switch Lock during active focus duration

let tabSwitchCount = 0;
let idleTimeSeconds = 0;
let sessionActive = false;
let tabLockActive = false;
let focusFlowTabId = null;
let currentScore = 95;

// Sync state from chrome.storage (set by the FocusFlow dashboard)
chrome.storage.local.get(
  ['sessionActive', 'tabLockActive', 'focusFlowTabId'],
  (result) => {
    sessionActive = result.sessionActive || false;
    tabLockActive = result.tabLockActive || false;
    focusFlowTabId = result.focusFlowTabId || null;
  }
);

// Listen for storage changes from the dashboard page
chrome.storage.onChanged.addListener((changes) => {
  if (changes.sessionActive) sessionActive = changes.sessionActive.newValue;
  if (changes.tabLockActive) tabLockActive = changes.tabLockActive.newValue;
  if (changes.focusFlowTabId) focusFlowTabId = changes.focusFlowTabId.newValue;
  if (changes.tabSwitchCount) tabSwitchCount = changes.tabSwitchCount.newValue;
});

// Listen for active tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
  tabSwitchCount++;
  console.log(`[FocusFlow Extension] Tab switched. Total: ${tabSwitchCount}`);

  // TAB LOCK ENFORCEMENT: If session is locked and student switches away, snap back
  if (tabLockActive && focusFlowTabId && activeInfo.tabId !== focusFlowTabId) {
    console.log(`[FocusFlow Extension] Tab switch BLOCKED — snapping back to FocusFlow tab.`);
    
    // Immediately switch back to the FocusFlow focus dashboard tab
    chrome.tabs.update(focusFlowTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.log('[FocusFlow] Could not snap back tab:', chrome.runtime.lastError.message);
      }
    });

    // Record violation in storage so dashboard can read it
    chrome.storage.local.set({
      tabSwitchCount,
      lastTabSwitchTime: Date.now(),
      tabLockViolation: true,
    });
  } else {
    chrome.storage.local.set({
      tabSwitchCount,
      lastTabSwitchTime: Date.now(),
    });
  }

  sendTelemetryToBackend();
});

// Listen for Idle state changes
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((newState) => {
  console.log(`[FocusFlow Extension] Idle state: ${newState}`);
  if (newState === 'idle' || newState === 'locked') {
    idleTimeSeconds += 60;
  } else if (newState === 'active') {
    idleTimeSeconds = 0;
  }
  chrome.storage.local.set({ idleTimeSeconds });
  sendTelemetryToBackend();
});

// Function to send telemetry to Node/Express backend
async function sendTelemetryToBackend() {
  try {
    const calculatedScore = Math.max(
      0,
      100 - tabSwitchCount * 4 - Math.floor(idleTimeSeconds / 10)
    );
    currentScore = calculatedScore;

    await fetch('http://localhost:5000/api/focus/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabSwitches: tabSwitchCount,
        idleTimeSeconds,
        keyboardRate: 45,
        mouseRate: 25,
        tabLockActive,
      }),
    });
  } catch {
    console.log('[FocusFlow Extension] Backend offline — using local fallback state.');
  }
}
