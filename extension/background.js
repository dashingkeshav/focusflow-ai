// FocusFlow AI Extension — Background Service Worker (Manifest V3)
// Real multi-user: userId/sessionId/token are received from the dashboard
// and stored in chrome.storage.local before any telemetry is sent.

const BACKEND_URL = 'http://localhost:5005';

let tabSwitchCount = 0;
let idleTimeSeconds = 0;
let sessionActive = false;
let tabLockActive = false;
let focusFlowTabId = null;
let authToken = null;
let userId = null;
let currentSessionId = null;
let warningCount = 0;
let blockedAttempts = 0;

// ─── Configurable distraction thresholds ─────────────────────────────────────
const THRESHOLDS = {
  tabSwitchWarning: 3,   // warn after this many switches
  tabSwitchBlock: 5,     // block after this many switches
  idleWarningSeconds: 120,
  warningMax: 3,         // trigger blocking after 3 warnings
};

// Distracting domains — configurable, stored in chrome.storage
let distractingDomains = [
  'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com',
  'x.com', 'tiktok.com', 'reddit.com', 'netflix.com', 'twitch.tv',
  'snapchat.com', 'discord.com', 'pinterest.com', 'tumblr.com',
];

// ─── Restore state on service worker start ───────────────────────────────────
chrome.storage.local.get(
  ['sessionActive', 'tabLockActive', 'focusFlowTabId', 'authToken',
   'userId', 'currentSessionId', 'warningCount', 'blockedAttempts',
   'distractingDomains'],
  (result) => {
    sessionActive     = result.sessionActive || false;
    tabLockActive     = result.tabLockActive || false;
    focusFlowTabId    = result.focusFlowTabId || null;
    authToken         = result.authToken || null;
    userId            = result.userId || null;
    currentSessionId  = result.currentSessionId || null;
    warningCount      = result.warningCount || 0;
    blockedAttempts   = result.blockedAttempts || 0;
    if (result.distractingDomains) {
      distractingDomains = result.distractingDomains;
    }
  }
);

// ─── Storage change listener ──────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.sessionActive)    sessionActive    = changes.sessionActive.newValue;
  if (changes.tabLockActive)    tabLockActive    = changes.tabLockActive.newValue;
  if (changes.focusFlowTabId)   focusFlowTabId   = changes.focusFlowTabId.newValue;
  if (changes.authToken)        authToken        = changes.authToken.newValue;
  if (changes.userId)           userId           = changes.userId.newValue;
  if (changes.currentSessionId) currentSessionId = changes.currentSessionId.newValue;
  if (changes.warningCount)     warningCount     = changes.warningCount.newValue;
  if (changes.distractingDomains) distractingDomains = changes.distractingDomains.newValue;

  // When session ends, reset counters
  if (changes.sessionActive && !changes.sessionActive.newValue) {
    tabSwitchCount   = 0;
    idleTimeSeconds  = 0;
    warningCount     = 0;
    blockedAttempts  = 0;
    chrome.storage.local.set({
      tabSwitchCount: 0, idleTimeSeconds: 0,
      warningCount: 0, blockedAttempts: 0,
      tabLockViolation: false,
    });
  }
});

// ─── Tab activation listener ──────────────────────────────────────────────────
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!sessionActive) return;

  tabSwitchCount++;
  chrome.storage.local.set({ tabSwitchCount, lastTabSwitchTime: Date.now() });

  // TAB LOCK: if lock is active and user switched away, snap back
  if (tabLockActive && focusFlowTabId && activeInfo.tabId !== focusFlowTabId) {
    blockedAttempts++;
    chrome.storage.local.set({ tabLockViolation: true, blockedAttempts });

    // Snap back to FocusFlow tab
    chrome.tabs.update(focusFlowTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[FocusFlow] Snap-back failed:', chrome.runtime.lastError.message);
      }
    });

    // Notify the dashboard via storage that a block occurred
    chrome.storage.local.set({ lastBlockTime: Date.now() });
    return;
  }

  // Check warning thresholds
  if (tabSwitchCount >= THRESHOLDS.tabSwitchWarning) {
    issueWarning(`Tab switch detected (${tabSwitchCount} switches during session)`);
  }

  sendTelemetry();
});

// ─── Tab URL change listener — check for distracting domains ─────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionActive || changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  try {
    const hostname = new URL(tab.url).hostname.replace('www.', '');
    const isDistracting = distractingDomains.some((d) => hostname.includes(d));

    if (isDistracting) {
      chrome.storage.local.set({ lastDistractingDomain: hostname });

      if (tabLockActive) {
        blockedAttempts++;
        chrome.storage.local.set({ blockedAttempts });
        // Redirect to the blocked page
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL('blocked.html') + `?domain=${encodeURIComponent(hostname)}`,
        });
      } else {
        issueWarning(`Distracting site accessed: ${hostname}`);
      }
    }
  } catch {
    // ignore malformed URLs
  }
});

// ─── Idle state listener ──────────────────────────────────────────────────────
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((newState) => {
  if (!sessionActive) return;

  if (newState === 'idle' || newState === 'locked') {
    idleTimeSeconds += 60;
  } else if (newState === 'active') {
    idleTimeSeconds = 0;
  }

  chrome.storage.local.set({ idleTimeSeconds });

  if (idleTimeSeconds >= THRESHOLDS.idleWarningSeconds) {
    issueWarning(`Inactivity detected for ${Math.floor(idleTimeSeconds / 60)} minutes`);
  }

  sendTelemetry();
});

// ─── Warning system ───────────────────────────────────────────────────────────
function issueWarning(reason) {
  if (!sessionActive) return;

  warningCount++;
  chrome.storage.local.set({ warningCount, lastWarningReason: reason });

  // Notify the dashboard page about the warning via storage
  // (dashboard polls or uses storage.onChanged)
  chrome.storage.local.set({
    pendingWarning: {
      warningNumber: warningCount,
      reason,
      timestamp: Date.now(),
      sessionId: currentSessionId,
    },
  });

  // After max warnings, activate blocking
  if (warningCount >= THRESHOLDS.warningMax) {
    activateTabLock();
  }
}

function activateTabLock() {
  if (tabLockActive) return;
  tabLockActive = true;
  chrome.storage.local.set({
    tabLockActive: true,
    blockingActivatedAt: Date.now(),
    blockingReason: `${warningCount} distraction warnings reached`,
  });
}

// ─── Telemetry sender ─────────────────────────────────────────────────────────
async function sendTelemetry() {
  if (!authToken || !sessionActive) return;

  const calculatedScore = Math.max(
    0,
    Math.round(
      100 - tabSwitchCount * 4 - Math.floor(idleTimeSeconds / 10) * 1.5
    )
  );

  try {
    await fetch(`${BACKEND_URL}/api/focus/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        tabSwitches: tabSwitchCount,
        idleTimeSeconds,
        keyboardRate: 45,
        mouseRate: 25,
      }),
    });
  } catch {
    // Backend offline — continue locally, telemetry will catch up
    console.warn('[FocusFlow Extension] Backend offline — using local score:', calculatedScore);
  }

  // Update local score in storage so popup can read it
  chrome.storage.local.set({ currentScore: calculatedScore });
}

// ─── Message from content script ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'INTERACTION_METRICS') {
    // Store interaction rates for the popup display
    chrome.storage.local.set({
      keyboardRate: message.keyStrokes,
      mouseRate: message.mouseMovements,
    });
  }
});
