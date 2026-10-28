// FocusFlow AI Extension — Smart Focus & Website Protection Background Service Worker (MV3)
//
// Capabilities:
//  - DeclarativeNetRequest (DNR) dynamic rules for real, synchronous navigation
//    blocking in Single-Site Focus Lock and Smart Focus Mode.
//  - Genuine browser event handling:
//      * chrome.tabs.onActivated (tab switch distinction)
//      * chrome.tabs.onUpdated (domain navigation distinction)
//      * chrome.windows.onFocusChanged (window focus / defocus)
//      * chrome.idle (system idle duration accounting)
//  - Privacy-safe aggregate interaction telemetry from content scripts
//    (keystrokes, throttled mouse movements, clicks, scrolls, visibility).
//  - Context-aware YouTube evaluation (video title, channel, task keywords).
//  - Automatic state recovery on service worker restarts.

importScripts('classifier.js');

let backendUrl = 'http://localhost:5001';
let appUrl = 'http://localhost:3000';

// ─── Session State ────────────────────────────────────────────────────────────
let sessionActive = false;
let paused = false;
let authToken = null;
let userId = null;
let userEmail = null;
let userName = null;
let currentSessionId = null;
let taskTitle = '';
let subject = '';
let strictness = 'balanced';
let mode = 'smart'; // 'smart' | 'single_site' | 'strict_lock'
let primarySite = '';
let browserProtection = true;
let allowedSites = [];
let blockedSites = [];
let warningSites = [];
let temporaryExceptions = [];
let videoExceptions = [];
let endsAt = 0;
let startedAt = 0;
let remainingSecondsWhenPaused = 0;

// ─── Live Telemetry Counters ──────────────────────────────────────────────────
let tabSwitchCount = 0;
let domainNavCount = 0;
let idleTimeSeconds = 0;
let warningCount = 0;
let blockedAttempts = 0;

let keyboardRate = 0;
let mouseRate = 0;
let clickRate = 0;
let scrollRate = 0;

let keyboardTotal = 0;
let mouseTotal = 0;
let clickTotal = 0;
let scrollTotal = 0;
let lastInteractionTime = 0;

let idleSince = 0;
let windowUnfocusedAt = 0;
let lastDomain = null;
let lastEventFlush = 0;

const THRESHOLDS = {
  idleWarningSeconds: 120,
  metricsFlushMs: 20000,
};

// ─── Restore State on Service Worker Start ────────────────────────────────────
chrome.storage.local.get(
  [
    'sessionActive', 'paused', 'authToken', 'userId', 'userEmail', 'userName',
    'currentSessionId', 'taskTitle', 'subject', 'strictness', 'mode', 'primarySite',
    'browserProtection', 'allowedSites', 'blockedSites', 'warningSites',
    'temporaryExceptions', 'videoExceptions', 'endsAt', 'startedAt',
    'remainingSecondsWhenPaused', 'backendUrl', 'appUrl',
    'tabSwitchCount', 'domainNavCount', 'idleTimeSeconds', 'warningCount', 'blockedAttempts',
    'keyboardTotal', 'mouseTotal', 'clickTotal', 'scrollTotal', 'lastInteractionTime',
    'idleSince', 'lastDomain',
  ],
  (result) => {
    sessionActive = Boolean(result.sessionActive);
    paused = Boolean(result.paused);
    authToken = result.authToken || null;
    userId = result.userId || null;
    userEmail = result.userEmail || null;
    userName = result.userName || null;
    currentSessionId = result.currentSessionId || null;
    taskTitle = result.taskTitle || '';
    subject = result.subject || '';
    strictness = result.strictness || 'balanced';
    mode = result.mode || 'smart';
    primarySite = result.primarySite || '';
    browserProtection = result.browserProtection !== false;
    allowedSites = result.allowedSites || [];
    blockedSites = result.blockedSites || [];
    warningSites = result.warningSites || [];
    temporaryExceptions = result.temporaryExceptions || [];
    videoExceptions = result.videoExceptions || [];
    endsAt = result.endsAt || 0;
    startedAt = result.startedAt || 0;
    remainingSecondsWhenPaused = result.remainingSecondsWhenPaused || 0;
    backendUrl = result.backendUrl || backendUrl;
    appUrl = result.appUrl || appUrl;

    tabSwitchCount = result.tabSwitchCount || 0;
    domainNavCount = result.domainNavCount || 0;
    idleTimeSeconds = result.idleTimeSeconds || 0;
    warningCount = result.warningCount || 0;
    blockedAttempts = result.blockedAttempts || 0;

    keyboardTotal = result.keyboardTotal || 0;
    mouseTotal = result.mouseTotal || 0;
    clickTotal = result.clickTotal || 0;
    scrollTotal = result.scrollTotal || 0;
    lastInteractionTime = result.lastInteractionTime || 0;
    idleSince = result.idleSince || 0;
    lastDomain = result.lastDomain || null;

    chrome.storage.local.set({ lastHeartbeatAt: Date.now() });

    if (sessionActive && authToken) {
      syncStateFromBackend();
    } else {
      updateDNRRules();
    }
  }
);

// ─── Install / Reload Handler ─────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  updateDNRRules();
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (!tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      }).catch(() => null);
    }
  } catch (_) {}
});

// ─── Recovery from Backend ────────────────────────────────────────────────────
async function syncStateFromBackend() {
  try {
    const response = await fetch(`${backendUrl}/api/focus/state`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) return;
    const data = await response.json();

    if (data.expired || !data.state) {
      if (sessionActive) clearSession();
      return;
    }

    const state = data.state;
    sessionActive = true;
    paused = Boolean(state.paused);
    currentSessionId = state.sessionId;
    taskTitle = state.taskTitle || '';
    subject = state.subject || '';
    strictness = state.strictness || 'balanced';
    mode = state.mode || 'smart';
    primarySite = state.primarySite || '';
    browserProtection = state.browserProtection !== false;
    allowedSites = state.allowedSites || [];
    blockedSites = state.blockedSites || [];
    warningSites = state.warningSites || [];
    temporaryExceptions = state.temporaryExceptions || [];
    startedAt = state.startedAt || Date.now();
    endsAt = state.endsAt || 0;

    chrome.storage.local.set({
      sessionActive: true,
      paused,
      currentSessionId,
      taskTitle,
      subject,
      strictness,
      mode,
      primarySite,
      browserProtection,
      allowedSites,
      blockedSites,
      warningSites,
      temporaryExceptions,
      startedAt,
      endsAt,
    });

    updateDNRRules();
  } catch {
    // Offline fallback: keep persisted local rules
    updateDNRRules();
  }
}

// ─── Declarative Net Request Dynamic Rules ────────────────────────────────────
// Provides synchronous, reliable blocking without page flash.
async function updateDNRRules() {
  try {
    if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.getDynamicRules) {
      return;
    }

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((r) => r.id);

    if (!sessionActive || paused || !browserProtection) {
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds,
        });
      }
      return;
    }

    function getHostFromUrl(urlStr) {
      try {
        return FocusFlowClassifier.cleanHost(new URL(urlStr).hostname);
      } catch (_) {
        return '';
      }
    }

    const appHost = getHostFromUrl(appUrl);
    const backendHost = getHostFromUrl(backendUrl);
    const safeSystemHosts = Array.from(new Set([
      'localhost',
      '127.0.0.1',
      '[::1]',
      ...(appHost ? [appHost] : []),
      ...(backendHost ? [backendHost] : []),
    ])).filter(Boolean);

    const newRules = [];
    let nextId = 1;

    const isSingleSiteLock =
      mode === 'single_site' ||
      strictness === 'single_site' ||
      (Boolean(primarySite) && mode === 'strict_lock');

    if (isSingleSiteLock) {
      const cleanPrimary = FocusFlowClassifier.cleanHost(primarySite);
      const excludedDomains = Array.from(new Set([
        ...safeSystemHosts,
        ...(cleanPrimary ? [cleanPrimary] : []),
        ...(allowedSites || []).map((s) => FocusFlowClassifier.cleanHost(s)).filter(Boolean),
      ]));

      newRules.push({
        id: nextId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            extensionPath: `/blocked.html?mode=single_site&primary=${encodeURIComponent(cleanPrimary || '')}&task=${encodeURIComponent(taskTitle || '')}`,
          },
        },
        condition: {
          urlFilter: '|http',
          resourceTypes: ['main_frame'],
          excludedRequestDomains: excludedDomains,
        },
      });
    } else {
      const isStrictLock = mode === 'strict_lock' || strictness === 'strict';

      // During Strict Focus Lock with explicit allowed sites, block outside the approved learning/work set
      if (isStrictLock && (allowedSites || []).length > 0) {
        const approvedSet = Array.from(new Set([
          ...safeSystemHosts,
          ...(allowedSites || []).map((s) => FocusFlowClassifier.cleanHost(s)).filter(Boolean),
          ...FocusFlowClassifier.SITE_GROUPS.developer.map((s) => FocusFlowClassifier.cleanHost(s)),
          ...FocusFlowClassifier.SITE_GROUPS.education.map((s) => FocusFlowClassifier.cleanHost(s)),
          ...FocusFlowClassifier.SITE_GROUPS.research.map((s) => FocusFlowClassifier.cleanHost(s)),
          ...FocusFlowClassifier.SITE_GROUPS.business.map((s) => FocusFlowClassifier.cleanHost(s)),
          ...FocusFlowClassifier.SITE_GROUPS.search.map((s) => FocusFlowClassifier.cleanHost(s)),
        ]));

        newRules.push({
          id: nextId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              extensionPath: `/blocked.html?mode=strict_lock&task=${encodeURIComponent(taskTitle || '')}&category=distracting&reason=${encodeURIComponent('Browsing outside approved learning and work sites is blocked during Strict Focus Lock.')}`,
            },
          },
          condition: {
            urlFilter: '|http',
            resourceTypes: ['main_frame'],
            excludedRequestDomains: approvedSet,
          },
        });
      }

      // Synchronously block known distracting domains (social, entertainment) and explicit blocked sites
      const domainsToBlock = [
        ...(blockedSites || []),
        ...(isStrictLock ? FocusFlowClassifier.SITE_GROUPS.social : []),
        ...(isStrictLock ? FocusFlowClassifier.SITE_GROUPS.entertainment : []),
        ...Array.from(tempBlockUntil.entries())
          .filter(([_, exp]) => exp > Date.now())
          .map(([d]) => d),
      ].map((s) => FocusFlowClassifier.cleanHost(s)).filter(Boolean);

      const uniqueBlocked = Array.from(new Set(domainsToBlock));

      for (const domain of uniqueBlocked) {
        if (!domain || safeSystemHosts.includes(domain)) continue;
        if (FocusFlowClassifier.matchesDomain(domain, allowedSites)) continue;

        newRules.push({
          id: nextId++,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: {
              extensionPath: `/blocked.html?domain=${encodeURIComponent(domain)}&task=${encodeURIComponent(taskTitle || '')}&category=distracting&reason=${encodeURIComponent('Blocked during active focus session')}`,
            },
          },
          condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: ['main_frame'],
          },
        });
      }
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules,
    });
  } catch (err) {
    console.warn('[FocusFlow] DNR update error:', err);
  }
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────
function clearSession() {
  sessionActive = false;
  paused = false;
  currentSessionId = null;
  taskTitle = '';
  subject = '';
  tabSwitchCount = 0;
  domainNavCount = 0;
  idleTimeSeconds = 0;
  warningCount = 0;
  blockedAttempts = 0;
  keyboardTotal = 0;
  mouseTotal = 0;
  clickTotal = 0;
  scrollTotal = 0;
  lastInteractionTime = 0;
  idleSince = 0;
  windowUnfocusedAt = 0;
  lastDomain = null;
  temporaryExceptions = [];
  videoExceptions = [];
  endsAt = 0;
  remainingSecondsWhenPaused = 0;
  tempBlockUntil.clear();
  localEscalationCounts.clear();

  chrome.storage.local.set({
    sessionActive: false,
    paused: false,
    currentSessionId: null,
    taskTitle: '',
    subject: '',
    tabSwitchCount: 0,
    domainNavCount: 0,
    idleTimeSeconds: 0,
    warningCount: 0,
    blockedAttempts: 0,
    keyboardTotal: 0,
    mouseTotal: 0,
    clickTotal: 0,
    scrollTotal: 0,
    lastInteractionTime: 0,
    idleSince: 0,
    temporaryExceptions: [],
    videoExceptions: [],
    currentSite: null,
    pendingWarning: null,
    lastBlockedDomain: null,
    endsAt: 0,
    remainingSecondsWhenPaused: 0,
    lastHeartbeatAt: Date.now(),
  });

  updateDNRRules();
}

// ─── Storage Changes Listener ─────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  let rulesNeedUpdate = false;

  if (changes.sessionActive) {
    sessionActive = Boolean(changes.sessionActive.newValue);
    rulesNeedUpdate = true;
    if (!sessionActive) {
      tabSwitchCount = 0;
      domainNavCount = 0;
      idleTimeSeconds = 0;
      warningCount = 0;
      blockedAttempts = 0;
      keyboardTotal = 0;
      mouseTotal = 0;
      clickTotal = 0;
      scrollTotal = 0;
      lastInteractionTime = 0;
      idleSince = 0;
    }
  }

  if (changes.paused) {
    paused = Boolean(changes.paused.newValue);
    rulesNeedUpdate = true;
  }
  if (changes.authToken) authToken = changes.authToken.newValue || null;
  if (changes.backendUrl) backendUrl = changes.backendUrl.newValue || backendUrl;
  if (changes.appUrl) appUrl = changes.appUrl.newValue || appUrl;
  if (changes.userId) userId = changes.userId.newValue || null;
  if (changes.currentSessionId) currentSessionId = changes.currentSessionId.newValue || null;
  if (changes.taskTitle) taskTitle = changes.taskTitle.newValue || '';
  if (changes.subject) subject = changes.subject.newValue || '';
  if (changes.strictness) {
    strictness = changes.strictness.newValue || 'balanced';
    rulesNeedUpdate = true;
  }
  if (changes.mode) {
    mode = changes.mode.newValue || 'smart';
    rulesNeedUpdate = true;
  }
  if (changes.primarySite) {
    primarySite = changes.primarySite.newValue || '';
    rulesNeedUpdate = true;
  }
  if (changes.browserProtection) {
    browserProtection = changes.browserProtection.newValue !== false;
    rulesNeedUpdate = true;
  }
  if (changes.allowedSites) {
    allowedSites = changes.allowedSites.newValue || [];
    rulesNeedUpdate = true;
  }
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue || [];
    rulesNeedUpdate = true;
  }
  if (changes.warningSites) warningSites = changes.warningSites.newValue || [];
  if (changes.temporaryExceptions) temporaryExceptions = changes.temporaryExceptions.newValue || [];
  if (changes.videoExceptions) videoExceptions = changes.videoExceptions.newValue || [];
  if (changes.endsAt) endsAt = changes.endsAt.newValue || 0;
  if (changes.startedAt) startedAt = changes.startedAt.newValue || 0;

  if (rulesNeedUpdate) {
    updateDNRRules();
  }
});

// ─── Domain Helper ────────────────────────────────────────────────────────────
function getDomainFromUrl(url) {
  try {
    if (
      !url ||
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:')
    ) {
      return null;
    }
    return FocusFlowClassifier.cleanHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

// ─── Active Site Inspection & Action ──────────────────────────────────────────
async function handleActiveSite(tabId, url, title) {
  const hostname = getDomainFromUrl(url);
  if (!hostname) return;

  const host = FocusFlowClassifier.cleanHost(hostname);

  const classification = FocusFlowClassifier.classifySite({
    hostname: host,
    url,
    title,
    taskTitle,
    subject,
    strictness,
    mode,
    primarySite,
    allowedSites,
    blockedSites,
    warningSites,
    temporaryExceptions,
    videoExceptions,
  });

  chrome.storage.local.set({
    currentSite: {
      domain: host,
      title: title || '',
      category: classification.category,
      reason: classification.reason,
      action: classification.action,
      timestamp: Date.now(),
    },
  });

  notifyDashboard({
    domain: host,
    title: title || '',
    category: classification.category,
    reason: classification.reason,
    action: classification.action,
    timestamp: Date.now(),
  });

  if (!sessionActive || paused || !browserProtection) {
    return;
  }

  // 1. Allowed or temporary exception
  if (classification.category === 'productive' || classification.exception) {
    recordSessionEvent('site_allowed', classification.reason, host, {
      classification: classification.category,
      action: 'allow',
      confidence: classification.confidence,
    });
    return;
  }

  // 2. Blocked or Distracting
  if (classification.category === 'distracting' || classification.action === 'block') {
    if (classification.action === 'block') {
      blockedAttempts += 1;
      chrome.storage.local.set({ blockedAttempts, lastBlockedDomain: host });
      recordSessionEvent('site_blocked', classification.reason, host, {
        classification: 'distracting',
        action: 'block',
        confidence: classification.confidence,
      });
      redirectTabToBlockPage(tabId, host, classification);
      return;
    }

    await escalateDistraction(tabId, host, url, title, classification);
    return;
  }

  // 3. Potentially Productive / Unknown / Warning
  if (
    classification.category === 'possibly_productive' ||
    classification.category === 'unknown'
  ) {
    const confidence = classification.confidence || 0.5;
    const shouldAsk =
      classification.action === 'warn' ||
      confidence >= 0.65 ||
      (strictness === 'strict' && confidence >= 0.5);

    if (shouldAsk) {
      warningCount += 1;
      chrome.storage.local.set({ warningCount });
      const decided = await maybeShowWarningOverlay(tabId, host, url, title, classification);
      if (!decided) {
        recordSessionEvent('site_warning', classification.reason, host, {
          classification: classification.category,
          action: 'warn',
          confidence: classification.confidence,
        });
        showWarningNotification(classification.reason, host);
      }
    } else {
      recordSessionEvent('site_allowed', classification.reason, host, {
        classification: classification.category,
        action: 'allow',
        confidence: classification.confidence,
      });
    }
  }
}

function notifyDashboard(site) {
  chrome.tabs.query({}, (tabs) => {
    const targetHost = getDomainFromUrl(appUrl);
    for (const tab of tabs) {
      if (tab.id == null || !tab.url) continue;
      const tabHost = getDomainFromUrl(tab.url);
      const isTarget =
        tabHost === targetHost ||
        (tabHost && (tabHost.includes('focusflow') || tabHost === 'localhost' || tabHost === '127.0.0.1'));
      if (isTarget) {
        chrome.tabs.sendMessage(tab.id, { type: 'FOCUSFLOW_SITE_UPDATE', site }, () => {
          void chrome.runtime.lastError;
        });
      }
    }
  });
}

// ─── Escalation for Distracting Domains ───────────────────────────────────────
const tempBlockUntil = new Map();
const localEscalationCounts = new Map();

async function escalateDistraction(tabId, host, url, title, classification) {
  let action = 'warn';
  let message = classification.reason;
  let attemptCount = 0;

  if (authToken && currentSessionId) {
    try {
      const response = await fetch(`${backendUrl}/api/focus/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sessionId: currentSessionId, domain: host }),
      });
      if (response.ok) {
        const data = await response.json();
        action = data.action || 'warn';
        message = data.message || message;
        attemptCount = data.attemptCount || 1;
        if (data.action === 'block' && data.exceptionMinutes) {
          tempBlockUntil.set(host, Date.now() + data.exceptionMinutes * 60 * 1000);
          updateDNRRules();
        }
      }
    } catch {
      localEscalationCounts.set(host, (localEscalationCounts.get(host) || 0) + 1);
      const count = localEscalationCounts.get(host);
      action = count >= 2 ? 'block' : 'warn';
      attemptCount = count;
    }
  } else {
    localEscalationCounts.set(host, (localEscalationCounts.get(host) || 0) + 1);
    const count = localEscalationCounts.get(host);
    action = count >= 2 ? 'block' : 'warn';
    attemptCount = count;
  }

  if (action === 'block') {
    blockedAttempts += 1;
    chrome.storage.local.set({ blockedAttempts, lastBlockedDomain: host });
    recordSessionEvent('site_blocked', message, host, {
      classification: 'distracting',
      action: 'block',
      confidence: classification.confidence,
    });
    redirectTabToBlockPage(tabId, host, classification, message, attemptCount);
  } else {
    warningCount += 1;
    chrome.storage.local.set({ warningCount });
    recordSessionEvent('distraction_detected', message, host, {
      classification: 'distracting',
      action: 'warn',
      confidence: classification.confidence,
    });
    showWarningNotification(message, host);
  }
}

function showWarningNotification(message, host) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'FocusFlow — Focus Drift Detected',
      message: `${message} (${host})`,
      silent: false,
    });
  } catch {
    // Notifications permission unavailable
  }
}

// ─── Warning Overlay ──────────────────────────────────────────────────────────
const warnedThisLoad = new Set();

async function maybeShowWarningOverlay(tabId, host, url, title, classification) {
  const key = `${tabId}:${host}`;
  if (warnedThisLoad.has(key)) return true;
  warnedThisLoad.add(key);

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['overlay.js'],
      world: 'ISOLATED',
    });
    await chrome.tabs.sendMessage(tabId, {
      type: 'FOCUSFLOW_SHOW_OVERLAY',
      domain: host,
      taskTitle,
      reason: classification.reason,
      remainingSeconds: Math.max(0, Math.floor((endsAt - Date.now()) / 1000)),
      isYouTube: host.includes('youtube.com'),
      videoId: classification.videoId || null,
    });
    recordSessionEvent('site_warning', classification.reason, host, {
      classification: classification.category,
      action: 'warn',
      confidence: classification.confidence,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Redirect Tab to Block Page ───────────────────────────────────────────────
function redirectTabToBlockPage(tabId, host, classification, message, attemptCount) {
  const params = new URLSearchParams({
    domain: host,
    task: taskTitle || '',
    category: classification?.category || 'distracting',
    reason: message || classification?.reason || '',
    attempts: String(attemptCount || 1),
    remaining: String(Math.max(0, Math.floor((endsAt - Date.now()) / 1000))),
    blockedAt: String(Date.now()),
    mode: mode || 'smart',
    primary: primarySite || '',
  });
  chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL('blocked.html') + '?' + params.toString(),
  });
}

// ─── Return to Task Handler ───────────────────────────────────────────────────
function handleReturnToTask(sender, sendResponse) {
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;

  chrome.storage.local.get(['appUrl', 'primarySite', 'allowedSites', 'taskTitle'], (storage) => {
    const appUrl = storage?.appUrl || 'http://localhost:3000';
    const cleanPrimary = storage?.primarySite || primarySite;
    const sites = storage?.allowedSites || allowedSites || [];

    let targetUrl = null;
    if (cleanPrimary) {
      targetUrl = cleanPrimary.startsWith('http') ? cleanPrimary : `https://${cleanPrimary}`;
    } else if (sites.length > 0 && sites[0]) {
      targetUrl = sites[0].startsWith('http') ? sites[0] : `https://${sites[0]}`;
    } else {
      targetUrl = `${appUrl}/dashboard/sessions`;
    }

    if (!tabId) {
      if (typeof sendResponse === 'function') {
        sendResponse({ ok: true, action: 'navigated', targetUrl });
      }
      return;
    }

    const queryInfo = windowId ? { windowId } : { currentWindow: true };
    chrome.tabs.query(queryInfo, (tabs) => {
      const allTabs = tabs || [];
      const validTabs = allTabs.filter((t) =>
        t.id !== tabId &&
        t.url &&
        !t.url.includes('blocked.html') &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('about:')
      );

      if (validTabs.length > 0) {
        let preferredTab = null;
        if (cleanPrimary) {
          const primaryHost = FocusFlowClassifier.cleanHost(cleanPrimary);
          preferredTab = validTabs.find((t) => {
            const h = getDomainFromUrl(t.url);
            return h && h.includes(primaryHost);
          });
        }
        if (!preferredTab && sites.length > 0) {
          preferredTab = validTabs.find((t) => {
            const h = getDomainFromUrl(t.url);
            return h && FocusFlowClassifier.matchesDomain(h, sites);
          });
        }
        if (!preferredTab) {
          preferredTab = validTabs.find((t) => t.url && t.url.includes('/dashboard'));
        }
        if (!preferredTab) {
          preferredTab = validTabs[validTabs.length - 1];
        }

        chrome.tabs.update(preferredTab.id, { active: true }, () => {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              chrome.tabs.update(tabId, { url: targetUrl });
            }
          });
        });

        if (typeof sendResponse === 'function') {
          sendResponse({ ok: true, action: 'switched', targetTabId: preferredTab.id });
        }
      } else {
        chrome.tabs.update(tabId, { url: targetUrl }, () => {
          if (typeof sendResponse === 'function') {
            sendResponse({ ok: true, action: 'navigated', targetUrl });
          }
        });
      }
    });
  });
}

// ─── Temporary Exceptions ─────────────────────────────────────────────────────
async function grantTemporaryException(domain, minutes) {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  temporaryExceptions = [
    ...(temporaryExceptions || []).filter((e) => e.domain !== domain),
    { domain, expiresAt },
  ];
  chrome.storage.local.set({ temporaryExceptions });

  if (authToken && currentSessionId) {
    fetch(`${backendUrl}/api/focus/exception`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ domain, minutes }),
    }).catch(() => null);
  }

  recordSessionEvent('site_allowed', `Temporary exception for ${minutes} min`, domain, {
    classification: 'possibly_productive',
    action: 'allow',
  });

  updateDNRRules();
}

function grantVideoException(videoId) {
  if (!videoId) return;
  if (!videoExceptions.includes(videoId)) {
    videoExceptions.push(videoId);
    chrome.storage.local.set({ videoExceptions });
    recordSessionEvent('site_allowed', `Approved YouTube video for session (${videoId})`, 'youtube.com', {
      classification: 'productive',
      action: 'allow',
    });
  }
}

// ─── Message Handling ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FOCUSFLOW_AUTH_SYNC') {
    const { token, user } = message;
    if (token && user && user.id) {
      const userChanged = userId && String(userId) !== String(user.id);
      if (userChanged) {
        clearSession();
      }
      authToken = token;
      userId = String(user.id);
      userEmail = user.email || null;
      userName = user.name || null;
      chrome.storage.local.set({
        authToken,
        userId,
        userEmail,
        userName,
        lastHeartbeatAt: Date.now(),
      });
      syncStateFromBackend();
    } else {
      // User logged out
      clearSession();
      authToken = null;
      userId = null;
      userEmail = null;
      userName = null;
      chrome.storage.local.set({
        authToken: null,
        userId: null,
        userEmail: null,
        userName: null,
        lastHeartbeatAt: Date.now(),
      });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'FOCUSFLOW_GET_COUNTERS') {
    sendResponse({
      ok: true,
      counters: {
        tabSwitches: tabSwitchCount,
        domainNavigations: domainNavCount,
        idleTimeSeconds: effectiveIdleSeconds(),
        warningCount,
        blockedAttempts,
        keyboardEvents: keyboardTotal,
        mouseEvents: mouseTotal,
      },
    });
    return false;
  }

  if (message.type === 'FOCUSFLOW_GET_AUTH_STATUS') {
    sendResponse({
      ok: true,
      authenticated: Boolean(authToken && userId),
      user: {
        id: userId,
        email: userEmail,
        name: userName,
      },
      sessionActive,
      paused,
      currentSessionId,
      taskTitle,
    });
    return false;
  }

  if (message.type === 'FOCUSFLOW_DISCONNECT') {
    clearSession();
    authToken = null;
    userId = null;
    userEmail = null;
    userName = null;
    chrome.storage.local.set({
      authToken: null,
      userId: null,
      userEmail: null,
      userName: null,
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'FOCUSFLOW_WEB_COMMAND') {
    const command = message.command || {};
    if (command.type === 'START') {
      const session = command.session;
      if (!session || typeof session.sessionId !== 'string') {
        sendResponse({ ok: false, error: 'A signed-in focus session is required.' });
        return false;
      }

      sessionActive = true;
      paused = false;
      authToken = command.token || authToken;
      userId = command.userId ? String(command.userId) : userId;
      if (command.user?.email) userEmail = command.user.email;
      if (command.user?.name) userName = command.user.name;

      currentSessionId = session.sessionId;
      taskTitle = session.taskTitle || '';
      subject = session.subject || '';
      strictness = session.strictness || 'balanced';
      mode = session.mode || 'smart';
      primarySite = session.primarySite || '';
      browserProtection = session.browserProtection !== false;
      allowedSites = Array.isArray(session.allowedSites) ? session.allowedSites : [];
      blockedSites = Array.isArray(session.blockedSites) ? session.blockedSites : [];
      warningSites = Array.isArray(session.warningSites) ? session.warningSites : [];
      startedAt = Number(session.startedAt) || Date.now();
      endsAt = Number(session.endsAt) || 0;

      tabSwitchCount = 0;
      domainNavCount = 0;
      idleTimeSeconds = 0;
      warningCount = 0;
      blockedAttempts = 0;
      keyboardTotal = 0;
      mouseTotal = 0;
      clickTotal = 0;
      scrollTotal = 0;
      lastInteractionTime = Date.now();
      temporaryExceptions = [];
      videoExceptions = [];

      chrome.storage.local.set({
        sessionActive,
        paused,
        authToken,
        userId,
        userEmail,
        userName,
        currentSessionId,
        taskTitle,
        subject,
        strictness,
        mode,
        primarySite,
        browserProtection,
        allowedSites,
        blockedSites,
        warningSites,
        startedAt,
        endsAt,
        tabSwitchCount,
        domainNavCount,
        idleTimeSeconds,
        warningCount,
        blockedAttempts,
        keyboardTotal,
        mouseTotal,
        clickTotal,
        scrollTotal,
        lastInteractionTime,
        temporaryExceptions,
        videoExceptions,
        lastHeartbeatAt: Date.now(),
      });

      updateDNRRules();
      sendResponse({ ok: true });
      return false;
    }

    if (command.type === 'PAUSE') {
      paused = command.paused === true;
      if (Number.isFinite(command.endsAt) && command.endsAt > 0) endsAt = command.endsAt;
      chrome.storage.local.set({ paused, endsAt, lastHeartbeatAt: Date.now() });
      updateDNRRules();
      sendResponse({ ok: true });
      return false;
    }

    if (command.type === 'CLEAR') {
      clearSession();
      sendResponse({ ok: true });
      return false;
    }

    sendResponse({ ok: false, error: 'Unknown FocusFlow command.' });
    return false;
  }

  if (message.type === 'FOCUSFLOW_OVERLAY_DECISION') {
    const { domain, decision, videoId } = message;
    if (decision === 'continue') {
      grantTemporaryException(domain, 10);
    } else if (decision === 'allow_video') {
      grantVideoException(videoId);
    } else if (decision === 'block') {
      tempBlockUntil.set(domain, Date.now() + 30 * 60 * 1000);
      updateDNRRules();
      if (sender.tab?.id != null) {
        redirectTabToBlockPage(sender.tab.id, domain, {
          category: 'distracting',
          reason: 'You chose to block this site.',
        });
      }
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'INTERACTION_METRICS') {
    if (typeof message.keyStrokes === 'number') {
      keyboardRate = message.keyStrokes;
      keyboardTotal += message.keyStrokes;
    }
    if (typeof message.mouseMovements === 'number') {
      mouseRate = message.mouseMovements;
      mouseTotal += message.mouseMovements;
    }
    if (typeof message.clicks === 'number') {
      clickRate = message.clicks;
      clickTotal += message.clicks;
    }
    if (typeof message.scrolls === 'number') {
      scrollRate = message.scrolls;
      scrollTotal += message.scrolls;
    }
    if (typeof message.lastInteraction === 'number') {
      lastInteractionTime = Math.max(lastInteractionTime, message.lastInteraction);
    }

    chrome.storage.local.set({
      keyboardRate,
      mouseRate,
      clickRate,
      scrollRate,
      keyboardTotal,
      mouseTotal,
      clickTotal,
      scrollTotal,
      lastInteractionTime,
      lastHeartbeatAt: Date.now(),
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'YOUTUBE_METADATA') {
    if (sessionActive && !paused && sender.tab?.id) {
      handleActiveSite(sender.tab.id, message.url || sender.tab.url, message.title || sender.tab.title);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'FOCUSFLOW_RETURN_TO_TASK') {
    const { domain, blockedTimestamp } = message;
    let recoveryDurationSeconds = null;
    if (typeof blockedTimestamp === 'number' && blockedTimestamp > 0) {
      recoveryDurationSeconds = Math.max(0, Math.round((Date.now() - blockedTimestamp) / 1000));
    }
    recordSessionEvent('distraction_recovered', `Returned to focus task: ${taskTitle || 'active session'}`, domain, {
      classification: 'distracting',
      action: 'recovered',
      confidence: 1.0,
      recoveryDurationSeconds,
    });
    handleReturnToTask(sender, sendResponse);
    return true;
  }

  if (message.type === 'FOCUSFLOW_ALLOW_VIDEO') {
    grantVideoException(message.videoId);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'FOCUSFLOW_END_SESSION') {
    endSessionFromExtension('completed');
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'FOCUSFLOW_PAUSE_TOGGLE') {
    togglePauseFromExtension();
    sendResponse({ ok: true });
    return false;
  }

  return true;
});

// ─── Tab Activation (Tab Switch Detection) ────────────────────────────────────
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!sessionActive) return;

  tabSwitchCount += 1;
  chrome.storage.local.set({ tabSwitchCount, lastTabSwitchTime: Date.now(), lastHeartbeatAt: Date.now() });

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    const newDomain = getDomainFromUrl(tab.url) || 'newtab';

    recordSessionEvent('tab_switched', `Switched to tab: ${newDomain}`, newDomain === 'newtab' ? null : newDomain, {
      fromDomain: lastDomain || undefined,
      classification: newDomain !== 'newtab' ? FocusFlowClassifier.classifySite({
        hostname: newDomain,
        url: tab.url,
        title: tab.title || '',
        taskTitle,
        subject,
        strictness,
        mode,
        primarySite,
        allowedSites,
        blockedSites,
        warningSites,
        temporaryExceptions,
        videoExceptions,
      }).category : 'unknown',
      action: 'observed',
    });

    if (newDomain !== 'newtab') {
      lastDomain = newDomain;
      handleActiveSite(activeInfo.tabId, tab.url, tab.title || '');
    }
    sendTelemetry();
  });
});

// ─── Tab Updates (Domain Navigation & Title Updates) ──────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionActive || !tab.active || !tab.url) return;

  const currentHost = getDomainFromUrl(tab.url);
  if (!currentHost) return;

  // Distinguish domain navigation from tab activation
  if (changeInfo.url) {
    const previousHost = lastDomain;
    if (previousHost && currentHost !== previousHost) {
      domainNavCount += 1;
      chrome.storage.local.set({ domainNavCount });
      recordSessionEvent('domain_navigation', `Navigated from ${previousHost} to ${currentHost}`, currentHost, {
        fromDomain: previousHost,
        action: 'observed',
      });
      lastDomain = currentHost;
    }
  }

  if (changeInfo.status === 'complete' || changeInfo.title) {
    handleActiveSite(tabId, tab.url, tab.title || '');
  }
});

// ─── Browser Window Focus Changes ─────────────────────────────────────────────
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (!sessionActive) return;

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus (user moved to desktop or another application)
    windowUnfocusedAt = Date.now();
  } else {
    // User returned to Chrome window
    if (windowUnfocusedAt > 0) {
      const awaySeconds = Math.round((Date.now() - windowUnfocusedAt) / 1000);
      windowUnfocusedAt = 0;
      if (awaySeconds >= 10) {
        recordSessionEvent('window_focus_restored', `Returned to Chrome after ${awaySeconds}s`, null, {
          action: 'observed',
        });
      }
    }
  }
});

// ─── Idle Detection ───────────────────────────────────────────────────────────
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((newState) => {
  if (!sessionActive || paused) {
    idleSince = 0;
    return;
  }

  if (newState === 'idle' || newState === 'locked') {
    if (!idleSince) idleSince = Date.now();
  } else if (newState === 'active') {
    if (idleSince) {
      idleTimeSeconds += Math.max(0, Math.round((Date.now() - idleSince) / 1000));
      idleSince = 0;
    }
  }

  const totalIdleSeconds = effectiveIdleSeconds();
  chrome.storage.local.set({ idleTimeSeconds, idleSince });

  if (totalIdleSeconds >= THRESHOLDS.idleWarningSeconds) {
    recordSessionEvent('idle_detected', `Idle for ${Math.floor(totalIdleSeconds / 60)} min`, null, {
      action: 'idle',
    });
  }
  sendTelemetry();
});

function effectiveIdleSeconds() {
  const ongoing = idleSince ? Math.max(0, Math.round((Date.now() - idleSince) / 1000)) : 0;
  return idleTimeSeconds + ongoing;
}

// ─── Periodic Telemetry Flush & Expiry ────────────────────────────────────────
chrome.alarms.create('heartbeat', { periodInMinutes: 0.2 }); // every 12 seconds
chrome.alarms.create('metrics-flush', { periodInMinutes: 0.33 }); // every 20 seconds
chrome.alarms.create('expiry-check', { periodInMinutes: 0.25 });

chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.local.set({ lastHeartbeatAt: Date.now() });

  if (alarm.name === 'metrics-flush') {
    sendTelemetry();
  }

  if (alarm.name === 'expiry-check' && sessionActive && !paused && endsAt) {
    if (Date.now() >= endsAt) {
      endSessionFromExtension('completed');
    }
  }
});

// ─── End Session from Extension ───────────────────────────────────────────────
async function endSessionFromExtension(status) {
  const sessionId = currentSessionId;
  clearSession();

  if (authToken && sessionId) {
    try {
      await fetch(`${backendUrl}/api/focus/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          status,
          durationSeconds: Math.max(0, Math.floor((Date.now() - (startedAt || Date.now())) / 1000)),
          tabSwitches: tabSwitchCount,
          domainNavigations: domainNavCount,
          idleTimeSeconds: effectiveIdleSeconds(),
          warningCount,
          blockedAttempts,
          keyboardEvents: keyboardTotal,
          mouseEvents: mouseTotal,
        }),
      });
    } catch {
      // Backend offline
    }
  }
  chrome.runtime.sendMessage({ type: 'FOCUSFLOW_SESSION_ENDED', status }).catch(() => null);
}

async function togglePauseFromExtension() {
  if (!authToken || !currentSessionId) return;
  const endpoint = paused ? '/api/focus/resume' : '/api/focus/pause';
  try {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      paused = !paused;
      if (paused) {
        remainingSecondsWhenPaused = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      } else if (data.state?.endsAt) {
        endsAt = data.state.endsAt;
      }
      chrome.storage.local.set({ paused, endsAt, remainingSecondsWhenPaused });
      updateDNRRules();
    }
  } catch {
    // Offline
  }
}

// ─── Event Recording & Telemetry ──────────────────────────────────────────────
function recordSessionEvent(eventType, details, domain, extra = {}) {
  if (!authToken || !currentSessionId) return;
  const payload = {
    sessionId: currentSessionId,
    eventType,
    details,
    domain: domain || null,
    fromDomain: extra.fromDomain || null,
    classification: extra.classification || null,
    action: extra.action || null,
    confidence: extra.confidence ?? null,
    recoveryDurationSeconds: extra.recoveryDurationSeconds ?? null,
  };
  fetch(`${backendUrl}/api/focus/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

async function sendTelemetry() {
  if (!authToken || !sessionActive) return;

  chrome.storage.local.set({ lastHeartbeatAt: Date.now() });

  if (currentSessionId && Date.now() - lastEventFlush > THRESHOLDS.metricsFlushMs) {
    lastEventFlush = Date.now();
    try {
      const response = await fetch(`${backendUrl}/api/focus/sync-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          tabSwitches: tabSwitchCount,
          domainNavigations: domainNavCount,
          warningCount,
          blockedAttempts,
          idleTimeSeconds: effectiveIdleSeconds(),
          distractionEvents: warningCount + blockedAttempts,
          keyboardEvents: keyboardTotal,
          mouseEvents: mouseTotal,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        chrome.storage.local.set({ currentScore: data.session?.finalFocusScore ?? null });
      }
    } catch {
      // Offline
    }
  }
}
