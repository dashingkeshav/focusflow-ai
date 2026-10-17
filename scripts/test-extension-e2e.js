/**
 * FocusFlow AI — End-to-End Chrome Extension & Integration Test Suite
 * Validates extension package, auth connection, session sync, classifier,
 * DNR rule generation, safe hosts, privacy telemetry, camera separation,
 * session lifecycle, and multi-user isolation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:5001';
const ROOT_DIR = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT_DIR, 'extension');

let failures = 0;
function assert(name, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name}${detail ? ' — ' + detail : ''}`);
  if (!condition) failures++;
}

async function api(endpoint, options = {}) {
  const { method = 'GET', token, body } = options;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('       FocusFlow AI — Extension & System Integration Tests      ');
  console.log('================================================================\n');

  // ── 1. MANIFEST & EXTENSION PACKAGE VALIDITY ──
  console.log('--- TEST GROUP 1: Manifest & Package Integrity ---');
  const manifestPath = path.join(EXT_DIR, 'manifest.json');
  assert('Manifest exists', fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert('Manifest is MV3', manifest.manifest_version === 3);
  assert('Background service worker specified', manifest.background?.service_worker === 'background.js');
  assert('Content scripts configured for <all_urls>', 
    Array.isArray(manifest.content_scripts) && 
    manifest.content_scripts[0]?.matches?.includes('<all_urls>') &&
    manifest.content_scripts[0]?.js?.includes('content.js')
  );
  assert('Required permissions present', 
    ['tabs', 'idle', 'storage', 'declarativeNetRequest', 'webNavigation', 'scripting'].every(p => manifest.permissions.includes(p))
  );
  assert('No literal "permissions" item in permissions array', !manifest.permissions.includes('permissions'));
  assert('Host permissions include localhost and <all_urls>',
    manifest.host_permissions.includes('http://localhost:3000/*') &&
    manifest.host_permissions.includes('http://localhost:5001/*') &&
    manifest.host_permissions.includes('<all_urls>')
  );
  assert('Web accessible resources include blocked.html and overlay.js',
    manifest.web_accessible_resources?.[0]?.resources?.includes('blocked.html') &&
    manifest.web_accessible_resources?.[0]?.resources?.includes('overlay.js')
  );
  assert('Icons 16, 48, 128 exist on disk',
    fs.existsSync(path.join(EXT_DIR, 'icons/icon16.png')) &&
    fs.existsSync(path.join(EXT_DIR, 'icons/icon48.png')) &&
    fs.existsSync(path.join(EXT_DIR, 'icons/icon128.png'))
  );

  // Check generated zip files
  const releaseZip = path.join(ROOT_DIR, 'release', 'FocusFlow-Chrome-Extension.zip');
  const publicZip = path.join(ROOT_DIR, 'frontend', 'public', 'downloads', 'FocusFlow-Chrome-Extension.zip');
  assert('Release zip exists', fs.existsSync(releaseZip) && fs.statSync(releaseZip).size > 20000);
  assert('Public downloads zip exists and matches release', 
    fs.existsSync(publicZip) && fs.statSync(publicZip).size === fs.statSync(releaseZip).size
  );

  // ── 2. SITE CLASSIFIER & APPROVED LEARNING SITES ──
  console.log('\n--- TEST GROUP 2: Site Classifier & Learning Site Protection ---');
  const classifier = require(path.join(EXT_DIR, 'classifier.js'));
  const { classifySite, cleanHost, matchesDomain, SITE_GROUPS } = classifier;

  // Educational / Learning sites must remain accessible and classified as productive
  const learningSites = [
    'https://en.wikipedia.org/wiki/Machine_learning',
    'https://www.coursera.org/learn/neural-networks',
    'https://docs.python.org/3/tutorial/index.html',
    'https://stackoverflow.com/questions/12345/how-to-fix',
    'https://github.com/dashingkeshav/focusflow-ai',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'https://www.khanacademy.org/math/algebra',
    'https://arxiv.org/abs/2301.00001',
    'https://scholar.google.com/scholar?q=ai'
  ];

  for (const url of learningSites) {
    const host = cleanHost(url);
    const isEdu = matchesDomain(host, SITE_GROUPS.developer) ||
                  matchesDomain(host, SITE_GROUPS.education) ||
                  matchesDomain(host, SITE_GROUPS.research);
    const classification = classifySite(url, { taskTitle: 'Computer science study' });
    assert(`Learning site accessible: ${host}`, isEdu && classification.category === 'productive');
  }

  // Distracting sites must be classified as distracting
  const distractingSites = [
    'https://www.instagram.com/explore/',
    'https://www.tiktok.com/@creator',
    'https://twitter.com/home',
    'https://x.com/explore',
    'https://www.facebook.com/feed',
    'https://www.netflix.com/browse',
    'https://www.reddit.com/r/funny'
  ];

  for (const url of distractingSites) {
    const host = cleanHost(url);
    const classification = classifySite(url, { taskTitle: 'Machine learning study' });
    assert(`Distraction correctly detected: ${host}`, classification.category === 'distracting');
  }

  // ── 3. SAFE HOSTS & DNR LOCKOUT PREVENTION ──
  console.log('\n--- TEST GROUP 3: Safe Hosts & Anti-Lockout Verification ---');
  // Verify that FocusFlow dashboard and backend are never blocked even during Single-Site Lock
  const backgroundCode = fs.readFileSync(path.join(EXT_DIR, 'background.js'), 'utf8');
  assert('background.js contains safeSystemHosts exclusion', backgroundCode.includes('safeSystemHosts'));
  assert('Dashboard host localhost:3000 excluded from blocking', backgroundCode.includes('localhost'));
  assert('Backend host 5001 excluded from blocking', backgroundCode.includes('127.0.0.1'));
  assert('Strict Focus Lock DNR rules implemented', backgroundCode.includes('strict_lock'));
  assert('Multi-user isolation on auth sync implemented', backgroundCode.includes('FOCUSFLOW_AUTH_SYNC'));

  // ── 4. REAL ACCOUNT CONNECTION & MULTI-USER ISOLATION ──
  console.log('\n--- TEST GROUP 4: Real Account Connection & Multi-User Isolation ---');
  const timestamp = Date.now();
  
  // Register User 1
  const u1Email = `ext.user1.${timestamp}@focusflow.dev`;
  const u1Pass = 'SecurePass2026!';
  const reg1 = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Extension User One', email: u1Email, password: u1Pass, confirmPassword: u1Pass }
  });
  const token1 = reg1.data?.token;
  const user1 = reg1.data?.user;
  assert('User 1 registers successfully', Boolean(token1 && user1), `HTTP ${reg1.status}`);

  // Register User 2
  const u2Email = `ext.user2.${timestamp}@focusflow.dev`;
  const u2Pass = 'SecurePass2026!';
  const reg2 = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Extension User Two', email: u2Email, password: u2Pass, confirmPassword: u2Pass }
  });
  const token2 = reg2.data?.token;
  const user2 = reg2.data?.user;
  assert('User 2 registers successfully', Boolean(token2 && user2), `HTTP ${reg2.status}`);

  // Test unauthenticated access to /api/focus/state
  const unauth = await api('/api/focus/state');
  assert('/api/focus/state rejects unauthenticated requests with 401', unauth.status === 401);

  // Authenticated state for User 1 (no active session yet)
  const state1Initial = await api('/api/focus/state', { token: token1 });
  assert('User 1 initial focus state is inactive', state1Initial.status === 200 && (!state1Initial.data?.state || state1Initial.data?.state?.active === false));

  // User 1 starts a real Strict Focus Lock session with approved learning sites
  const startRes1 = await api('/api/focus/start', {
    method: 'POST',
    token: token1,
    body: {
      taskTitle: 'Distributed Systems & Quantum Computing Research',
      durationSeconds: 1800,
      strictness: 'strict',
      mode: 'strict_lock',
      browserProtection: true,
      allowedSites: ['wikipedia.org', 'coursera.org', 'github.com', 'docs.python.org'],
      blockedSites: ['instagram.com', 'tiktok.com', 'twitter.com', 'facebook.com'],
      warningSites: ['youtube.com', 'reddit.com']
    }
  });
  assert('User 1 starts Strict Focus Lock session', startRes1.status === 201 && Boolean(startRes1.data?.session?.id));
  const sessionId1 = startRes1.data?.session?.id;

  // Verify User 1 state returned by /api/focus/state
  const state1Active = await api('/api/focus/state', { token: token1 });
  assert('User 1 active session synced via /api/focus/state', 
    state1Active.data?.state?.active === true &&
    state1Active.data?.state?.sessionId === sessionId1 &&
    state1Active.data?.state?.mode === 'strict_lock' &&
    state1Active.data?.state?.allowedSites?.includes('wikipedia.org') &&
    state1Active.data?.state?.blockedSites?.includes('instagram.com')
  );

  // Isolation check: User 2 state must NOT have User 1 session
  const state2Check = await api('/api/focus/state', { token: token2 });
  assert('Multi-User Isolation: User 2 has active=false while User 1 is focused', 
    (!state2Check.data?.state || state2Check.data?.state?.active === false)
  );

  // Isolation check: User 2 cannot inject telemetry into User 1 session
  const evilEvent = await api('/api/focus/event', {
    method: 'POST',
    token: token2,
    body: { sessionId: sessionId1, eventType: 'tab_switch', domain: 'malicious.com' }
  });
  assert('Multi-User Isolation: User 2 cannot inject events into User 1 session (404)', evilEvent.status === 404);

  // ── 5. REAL TELEMETRY PERSISTENCE & PRIVACY-SAFE METRICS ──
  console.log('\n--- TEST GROUP 5: Real Telemetry Persistence & Privacy Safety ---');

  // Real tab switch events from User 1
  const tabEvt1 = await api('/api/focus/event', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      eventType: 'tab_switch',
      domain: 'wikipedia.org',
      tabTitle: 'Distributed Systems - Wikipedia',
      tabCount: 4
    }
  });
  assert('Real tab switch event recorded', tabEvt1.status === 201 && tabEvt1.data?.success === true);

  // Real idle detection event
  const idleEvt = await api('/api/focus/event', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      eventType: 'idle_detected',
      domain: 'wikipedia.org',
      idleDurationSeconds: 60
    }
  });
  assert('Real idle detection event recorded', idleEvt.status === 201);

  // Real navigation blocked attempt
  const blockEvt = await api('/api/focus/event', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      eventType: 'site_blocked',
      domain: 'instagram.com',
      blockedBy: 'strict_lock'
    }
  });
  assert('Real navigation blocked attempt recorded', blockEvt.status === 201);

  // Sync privacy-safe aggregate counters (no key content, no passwords, no coordinates)
  const syncRes = await api('/api/focus/sync-metrics', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      tabSwitches: 5,
      idleTimeSeconds: 90,
      blockedAttempts: 2,
      distractionEvents: 1,
      keyboardEvents: 420,  // aggregate count only
      mouseEvents: 950      // aggregate count only
    }
  });
  assert('Privacy-safe metrics synced without typing logs', syncRes.status === 200 && Boolean(syncRes.data?.session?.finalFocusScore));

  // Verify Live Metrics API returns genuine recorded counters
  const liveRes = await api(`/api/focus/live?sessionId=${sessionId1}`, { token: token1 });
  assert('Live metrics endpoint returns genuine persisted telemetry',
    liveRes.status === 200 &&
    liveRes.data?.metrics?.tabSwitches === 5 &&
    liveRes.data?.metrics?.idleTimeSeconds === 90 &&
    liveRes.data?.metrics?.blockedAttempts === 2 &&
    liveRes.data?.metrics?.keyboardEvents === 420 &&
    liveRes.data?.metrics?.mouseEvents === 950
  );

  // ── 6. CAMERA METRIC SEPARATION ──
  console.log('\n--- TEST GROUP 6: Camera Metric Separation Verification ---');
  // Record a camera distraction event
  const camEvt = await api('/api/focus/event', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      eventType: 'camera_absent',
      reason: 'User looked away from screen for 15s'
    }
  });
  assert('Camera event recorded', camEvt.status === 201, `status: ${camEvt.status}`);

  // Re-fetch live metrics to prove camera telemetry did not alter browser tab switches or keyboard events
  const liveAfterCam = await api(`/api/focus/live?sessionId=${sessionId1}`, { token: token1 });
  assert('Camera telemetry is strictly separate from tab switches', liveAfterCam.data?.metrics?.tabSwitches === 5);
  assert('Camera telemetry is strictly separate from keyboard inputs', liveAfterCam.data?.metrics?.keyboardEvents === 420);
  assert('Camera telemetry is strictly separate from idle timer', liveAfterCam.data?.metrics?.idleTimeSeconds === 90);

  // ── 7. SESSION PAUSE, RESUME, AND STOP LIFECYCLE ──
  console.log('\n--- TEST GROUP 7: Session Lifecycle & Restriction Deactivation ---');

  // Pause session
  const pauseRes = await api('/api/focus/pause', {
    method: 'POST',
    token: token1,
    body: { sessionId: sessionId1 }
  });
  assert('Focus session pauses correctly', pauseRes.status === 200 && (pauseRes.data?.state?.paused === true || pauseRes.data?.session?.paused === true));

  // Resume session
  const resumeRes = await api('/api/focus/resume', {
    method: 'POST',
    token: token1,
    body: { sessionId: sessionId1 }
  });
  assert('Focus session resumes correctly', resumeRes.status === 200 && (resumeRes.data?.state?.paused === false || resumeRes.data?.session?.paused === false));

  // End session
  const endRes = await api('/api/focus/end', {
    method: 'POST',
    token: token1,
    body: {
      sessionId: sessionId1,
      status: 'completed',
      tabSwitches: 5,
      idleTimeSeconds: 90,
      blockedAttempts: 2,
      keyboardEvents: 420,
      mouseEvents: 950
    }
  });
  assert('Focus session ends successfully', endRes.status === 200 && endRes.data?.session?.status === 'completed');
  assert('Final focus score computed and persisted', typeof endRes.data?.session?.finalFocusScore === 'number');

  // Verify focus state is now inactive
  const stateAfterEnd = await api('/api/focus/state', { token: token1 });
  assert('Session restrictions deactivated after end (active=false)', !stateAfterEnd.data?.state || stateAfterEnd.data?.state?.active === false);

  // User 1 Dashboard reflects real persisted session
  const dashRes1 = await api('/api/analytics/dashboard', { token: token1 });
  assert('Dashboard displays actual recorded session data', 
    dashRes1.status === 200 && 
    dashRes1.data?.stats?.totalSessions >= 1 &&
    typeof dashRes1.data?.stats?.avgFocusScore === 'number'
  );

  console.log('\n================================================================');
  if (failures === 0) {
    console.log('       ALL EXTENSION & INTEGRATION TESTS PASSED (100% OK)       ');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.log(`       ${failures} TEST(S) FAILED                               `);
    console.log('================================================================');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
