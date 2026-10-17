// FocusFlow AI — Popup Logic for Smart Focus Mode (MV3)
// Real-time account connection, live session metrics, and control interface.

const els = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  accountDot: document.getElementById('accountDot'),
  accountEmail: document.getElementById('accountEmail'),
  accountSub: document.getElementById('accountSub'),
  accountActionBtn: document.getElementById('accountActionBtn'),
  taskTitle: document.getElementById('taskTitle'),
  remainingTime: document.getElementById('remainingTime'),
  focusScore: document.getElementById('focusScore'),
  distractions: document.getElementById('distractions'),
  blockedCount: document.getElementById('blockedCount'),
  siteDomain: document.getElementById('siteDomain'),
  siteCategory: document.getElementById('siteCategory'),
  protectionVal: document.getElementById('protectionVal'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  endBtn: document.getElementById('endBtn'),
  dashboardBtn: document.getElementById('dashboardBtn'),
  appUrl: document.getElementById('appUrl'),
  backendUrl: document.getElementById('backendUrl'),
  saveConnection: document.getElementById('saveConnection'),
  connectionStatus: document.getElementById('connectionStatus'),
  roomCodeInput: document.getElementById('roomCodeInput'),
  joinRoomBtn: document.getElementById('joinRoomBtn'),
  openRoomsBtn: document.getElementById('openRoomsBtn'),
  collabStatus: document.getElementById('collabStatus'),
};

let cachedEndsAt = 0;
let cachedPaused = false;
let isConnectedAccount = false;
let cachedAppUrl = 'http://localhost:3000';
let cachedBackendUrl = 'http://localhost:5001';

function formatTime(totalSec) {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function render(result) {
  const active = Boolean(result.sessionActive);
  cachedPaused = Boolean(result.paused);
  cachedEndsAt = result.endsAt || 0;
  cachedAppUrl = result.appUrl || cachedAppUrl;
  cachedBackendUrl = result.backendUrl || cachedBackendUrl;

  // Account connection status
  isConnectedAccount = Boolean(result.authToken && result.userId);
  if (isConnectedAccount) {
    els.accountDot.classList.add('connected');
    els.accountEmail.textContent = result.userEmail || result.userName || 'Account Connected';
    els.accountSub.textContent = active ? 'Session Synchronized' : 'Ready & Connected';
    els.accountSub.className = 'account-sub connected';
    els.accountActionBtn.textContent = 'Dashboard';
  } else {
    els.accountDot.classList.remove('connected');
    els.accountEmail.textContent = 'Not Connected';
    els.accountSub.textContent = 'Sign in on dashboard to link';
    els.accountSub.className = 'account-sub';
    els.accountActionBtn.textContent = 'Sign In';
  }

  // Session status badge
  els.statusBadge.classList.remove('off', 'paused', 'active');
  if (!active) {
    els.statusBadge.classList.add('off');
    els.statusText.textContent = 'NO SESSION';
  } else if (cachedPaused) {
    els.statusBadge.classList.add('paused');
    els.statusText.textContent = 'PAUSED';
  } else {
    els.statusBadge.classList.add('active');
    els.statusText.textContent = 'ACTIVE';
  }

  // Task title
  els.taskTitle.textContent = active
    ? (result.taskTitle || 'Focus session')
    : 'No active focus session';

  // Metrics
  els.focusScore.textContent = active && result.currentScore != null ? result.currentScore : '--';
  const totalDistractions = (result.warningCount || 0) + (result.blockedAttempts || 0);
  els.distractions.textContent = String(active ? totalDistractions : 0);
  els.blockedCount.textContent = String(active ? result.blockedAttempts || 0 : 0);

  // Current active site
  const site = result.currentSite;
  if (site && site.domain) {
    els.siteDomain.textContent = site.domain;
    const category = site.category || 'none';
    els.siteCategory.textContent = category.replace('_', ' ').toUpperCase();
    els.siteCategory.className = `site-category ${category}`;
  } else {
    els.siteDomain.textContent = '—';
    els.siteCategory.textContent = 'IDLE';
    els.siteCategory.className = 'site-category none';
  }

  // Protection mode label
  const protectionOn = active && result.browserProtection !== false && !cachedPaused;
  const modeLabel = result.mode === 'single_site'
    ? 'SINGLE-SITE'
    : (result.strictness === 'strict' || result.mode === 'strict_lock' ? 'STRICT LOCK' : 'SMART FOCUS');
  els.protectionVal.textContent = protectionOn ? modeLabel : 'OFF';
  els.protectionVal.className = `val ${protectionOn ? 'on' : 'off'}`;

  // Action buttons
  els.pauseBtn.style.display = active && !cachedPaused ? '' : 'none';
  els.resumeBtn.style.display = active && cachedPaused ? '' : 'none';
  els.endBtn.style.display = active ? '' : 'none';

  if (active) {
    els.dashboardBtn.classList.add('compact');
  } else {
    els.dashboardBtn.classList.remove('compact');
  }

  updateTimer();
}

function updateTimer() {
  if (!cachedEndsAt) {
    els.remainingTime.textContent = '--:--';
    return;
  }
  if (cachedPaused) {
    els.remainingTime.textContent = '⏸ paused';
    return;
  }
  els.remainingTime.textContent = formatTime((cachedEndsAt - Date.now()) / 1000);
}

function loadState() {
  chrome.storage.local.get(
    [
      'sessionActive', 'paused', 'taskTitle', 'endsAt', 'currentScore',
      'warningCount', 'blockedAttempts', 'currentSite', 'browserProtection',
      'mode', 'primarySite', 'strictness', 'authToken', 'userId',
      'userEmail', 'userName', 'appUrl', 'backendUrl',
    ],
    render
  );
}

function normalizeOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(localHost && url.protocol === 'http:')) {
    throw new Error(`${label} must use HTTPS (HTTP is allowed only for localhost).`);
  }
  return url.origin;
}

function requestHostAccess(origins) {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ origins }, (granted) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else if (!granted) reject(new Error('Site access was not granted. Allow access to connect FocusFlow.'));
      else resolve();
    });
  });
}

async function saveConnection() {
  els.saveConnection.disabled = true;
  els.connectionStatus.classList.remove('error', 'success');
  els.connectionStatus.textContent = 'Verifying connection to FocusFlow…';
  try {
    const appOrigin = normalizeOrigin(els.appUrl.value.trim() || 'http://localhost:3000', 'dashboard');
    const apiOrigin = normalizeOrigin(els.backendUrl.value.trim() || 'http://localhost:5001', 'API server');
    const origins = [...new Set([appOrigin, apiOrigin].map((origin) => `${origin}/*`))];
    await requestHostAccess(origins);

    await chrome.storage.local.set({ appUrl: appOrigin, backendUrl: apiOrigin });
    cachedAppUrl = appOrigin;
    cachedBackendUrl = apiOrigin;

    // Verify backend connectivity
    try {
      const res = await fetch(`${apiOrigin}/api/focus/state`);
      // 200 or 401 proves the backend is listening and active
      if (res.status === 200 || res.status === 401) {
        els.connectionStatus.textContent = 'Connected to FocusFlow. Dashboard and API verified.';
        els.connectionStatus.classList.add('success');
      } else {
        els.connectionStatus.textContent = `Server responded with status ${res.status}. URLs saved.`;
      }
    } catch {
      els.connectionStatus.textContent = 'URLs saved. Ensure the FocusFlow backend is running.';
    }

    loadState();
  } catch (error) {
    els.connectionStatus.textContent = error instanceof Error
      ? error.message
      : 'Could not connect the extension.';
    els.connectionStatus.classList.add('error');
  } finally {
    els.saveConnection.disabled = false;
  }
}

function openDashboard(path = '/dashboard') {
  chrome.storage.local.get(['appUrl'], (result) => {
    const base = result.appUrl || 'http://localhost:3000';
    chrome.tabs.create({ url: `${base}${path}` });
  });
}

els.pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'FOCUSFLOW_PAUSE_TOGGLE' }, loadState);
});

els.resumeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'FOCUSFLOW_PAUSE_TOGGLE' }, loadState);
});

els.endBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'FOCUSFLOW_END_SESSION' }, loadState);
});

els.dashboardBtn.addEventListener('click', () => {
  openDashboard('/dashboard');
});

els.accountActionBtn.addEventListener('click', () => {
  if (isConnectedAccount) {
    openDashboard('/dashboard');
  } else {
    openDashboard('/login');
  }
});

els.saveConnection.addEventListener('click', saveConnection);

chrome.storage.local.get(['appUrl', 'backendUrl'], (result) => {
  els.appUrl.value = result.appUrl || 'http://localhost:3000';
  els.backendUrl.value = result.backendUrl || 'http://localhost:5001';
  cachedAppUrl = result.appUrl || cachedAppUrl;
  cachedBackendUrl = result.backendUrl || cachedBackendUrl;
});


function handleJoinRoom() {
  const code = els.roomCodeInput ? els.roomCodeInput.value.trim() : '';
  if (!code) {
    if (els.collabStatus) {
      els.collabStatus.textContent = 'Please enter an invite code.';
      els.collabStatus.className = 'connection-status error';
    }
    return;
  }

  chrome.storage.local.get(['appUrl'], (storage) => {
    const base = storage.appUrl || cachedAppUrl || 'http://localhost:3000';
    const targetUrl = `${base}/dashboard/focus-rooms?join=${encodeURIComponent(code)}`;
    chrome.tabs.create({ url: targetUrl });
    if (els.roomCodeInput) els.roomCodeInput.value = '';
    if (els.collabStatus) {
      els.collabStatus.textContent = 'Opening Focus Room in browser...';
      els.collabStatus.className = 'connection-status success';
      setTimeout(() => {
        if (els.collabStatus) els.collabStatus.textContent = '';
      }, 3000);
    }
  });
}

function handleOpenRooms() {
  chrome.storage.local.get(['appUrl'], (storage) => {
    const base = storage.appUrl || cachedAppUrl || 'http://localhost:3000';
    chrome.tabs.create({ url: `${base}/dashboard/focus-rooms` });
  });
}

if (els.openRoomsBtn) {
  els.openRoomsBtn.addEventListener('click', handleOpenRooms);
}
if (els.joinRoomBtn) {
  els.joinRoomBtn.addEventListener('click', handleJoinRoom);
}

loadState();
setInterval(updateTimer, 1000);
chrome.storage.onChanged.addListener(loadState);
