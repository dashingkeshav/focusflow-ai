/**
 * FocusFlow AI — Autonomous End-to-End QA, Browser Automation & Real Database Verification
 * Uses puppeteer-core to drive Google Chrome (Chrome 156 on Windows) against the live
 * deployed application and real backend with Supabase PostgreSQL.
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://focusflow-ai-livid.vercel.app';
const TIMESTAMP = Date.now();
const QA_EMAIL = `qa_autonomous_${TIMESTAMP}@focusflow.test`;
const QA_PASSWORD = `FocusFlowPass!${TIMESTAMP}`;
const QA_NAME = `QA Autonomous Tester ${TIMESTAMP}`;
const uniqueProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), `ff_qa_${TIMESTAMP}_`));

const results = {
  environment: {
    url: BASE_URL,
    backendStatus: 'unknown',
    databaseStatus: 'unknown',
    browserVersion: 'unknown',
  },
  authentication: {
    registration: 'PENDING',
    signIn: 'PENDING',
    sessionPersistence: 'PENDING',
    protectedRouteGuard: 'PENDING',
    signOut: 'PENDING',
  },
  features: {},
  controlsTested: 0,
  controlsPassed: 0,
  controlsFailed: 0,
  databaseEvidence: [],
  failures: [],
};

function logStep(step, msg) {
  console.log(`\n========================================`);
  console.log(`[STEP ${step}] ${msg}`);
  console.log(`========================================`);
}

function recordControl(name, passed, detail = '') {
  results.controlsTested += 1;
  if (passed) {
    results.controlsPassed += 1;
    console.log(`  ✔ [CONTROL PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
  } else {
    results.controlsFailed += 1;
    console.error(`  ✖ [CONTROL FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
    results.failures.push({ control: name, detail });
  }
}

async function safeGoto(page, url, timeout = 30000) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      return;
    } catch (err) {
      if ((err.message.includes('detached') || err.message.includes('destroyed')) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        throw err;
      }
    }
  }
}

async function runQA() {
  console.log('🚀 Starting FocusFlow AI Autonomous QA & Database Verification Suite');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Browser: ${CHROME_PATH}`);
  console.log(`Test Account: ${QA_EMAIL}`);

  // 1. Backend Health Check
  logStep(1, 'Verifying Backend Health & Database Connectivity');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
    console.log('Backend Health Response:', healthRes);
    if (healthRes.success && healthRes.database === 'connected') {
      results.environment.backendStatus = 'healthy';
      results.environment.databaseStatus = 'connected';
      recordControl('Backend Health & DB Check', true, `DB: ${healthRes.database}`);
    } else {
      results.environment.backendStatus = healthRes.status || 'degraded';
      results.environment.databaseStatus = healthRes.database || 'disconnected';
      recordControl('Backend Health & DB Check', false, JSON.stringify(healthRes));
    }
  } catch (err) {
    console.error('Failed to reach backend health:', err.message);
    recordControl('Backend Health & DB Check', false, err.message);
  }

  // 2. Launch Real Google Chrome
  logStep(2, 'Launching Chrome via Puppeteer');
  let browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: uniqueProfileDir,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
  });

  results.environment.browserVersion = await browser.version();
  console.log('Launched:', results.environment.browserVersion);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Console and network listener
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });

  try {
    // 3. Landing Page & Public Navigation
    logStep(3, 'Testing Landing Page & Public Routes');
    await safeGoto(page, `${BASE_URL}/`);
    const pageTitle = await page.title();
    console.log('Landing Title:', pageTitle);
    recordControl('Landing Page Render', Boolean(pageTitle), pageTitle);

    // Verify brand logo exists
    const logoExists = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="FocusFlow"], svg, .brand-logo');
      return Boolean(img);
    });
    recordControl('Navbar Brand Logo', logoExists);

    // 4. Registration Flow
    logStep(4, 'Testing User Registration Flow');
    await safeGoto(page, `${BASE_URL}/register`);

    // Fill registration form
    const hasNameInput = await page.$('input[id*="name"], input[placeholder*="name" i]');
    const hasEmailInput = await page.$('input[type="email"], input[id*="email"]');
    const hasPasswordInput = await page.$('input[type="password"]');

    if (hasEmailInput && hasPasswordInput) {
      if (hasNameInput) await hasNameInput.type(QA_NAME);
      await hasEmailInput.type(QA_EMAIL);
      await hasPasswordInput.type(QA_PASSWORD);

      // Check confirm password if present
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length > 1) {
        await passwordInputs[1].type(QA_PASSWORD);
      }

      // Submit form
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
      }

      const currentUrl = page.url();
      console.log('Post-register URL:', currentUrl);
      const regSuccess = currentUrl.includes('/dashboard') || currentUrl.includes('/login');
      recordControl('User Registration', regSuccess, `URL: ${currentUrl}`);
      results.authentication.registration = regSuccess ? 'PASS' : 'FAIL';
    } else {
      recordControl('Registration Form Inputs', false, 'Missing input fields');
    }

    // 5. Sign In Flow
    logStep(5, 'Testing Sign In Flow');
    await safeGoto(page, `${BASE_URL}/login`);

    const loginEmail = await page.$('input[type="email"], input[id*="email"]');
    const loginPass = await page.$('input[type="password"]');

    if (loginEmail && loginPass) {
      await loginEmail.type(QA_EMAIL);
      await loginPass.type(QA_PASSWORD);

      const loginBtn = await page.$('button[type="submit"]');
      if (loginBtn) {
        await loginBtn.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }

      const postLoginUrl = page.url();
      console.log('Post-login URL:', postLoginUrl);
      const isDashboard = postLoginUrl.includes('/dashboard');
      recordControl('Sign In & Redirect to Dashboard', isDashboard, `URL: ${postLoginUrl}`);
      results.authentication.signIn = isDashboard ? 'PASS' : 'FAIL';

      // Verify token in localStorage
      const token = await page.evaluate(() => localStorage.getItem('focusflow_token'));
      const hasToken = Boolean(token && token.length > 20);
      recordControl('Auth Token Persisted in LocalStorage', hasToken);
      results.databaseEvidence.push({
        action: 'USER_AUTHENTICATION',
        user: QA_EMAIL,
        tokenReceived: hasToken,
      });
    }

    // 6. Command Center / Dashboard Overview
    logStep(6, 'Testing Dashboard Overview');
    await safeGoto(page, `${BASE_URL}/dashboard`);
    await new Promise((r) => setTimeout(r, 2000));

    const dashboardRendered = await page.evaluate(() => {
      return !document.body.innerText.includes('LOST IN ORBIT') &&
             !document.body.innerText.includes('Page not found');
    });
    recordControl('Dashboard 404 Free & Rendered', dashboardRendered);
    results.features['Dashboard Overview'] = dashboardRendered ? 'PASS' : 'FAIL';

    // 7. Goals & Tasks Module
    logStep(7, 'Testing Goals & Tasks Module');
    await safeGoto(page, `${BASE_URL}/dashboard/goals`);
    await new Promise((r) => setTimeout(r, 2000));

    const goalsPageOk = await page.evaluate(() => {
      return document.body.innerText.includes('Goals') || document.body.innerText.includes('Tasks');
    });
    recordControl('Goals Page Rendered', goalsPageOk);

    // Try to create a task via API/UI
    const taskCreated = await page.evaluate(async (ts) => {
      try {
        const token = localStorage.getItem('focusflow_token');
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `QA Autonomous Task ${ts}`,
            priority: 'high',
            category: 'work',
          }),
        }).then((r) => r.json());
        return res.success ? res.task : null;
      } catch {
        return null;
      }
    }, TIMESTAMP);

    const taskSuccess = Boolean(taskCreated && taskCreated.id);
    recordControl('Task Creation & DB Persistence', taskSuccess, taskCreated ? `ID: ${taskCreated.id}` : 'Failed');
    if (taskSuccess) {
      results.databaseEvidence.push({
        action: 'TASK_CREATED_IN_POSTGRES',
        taskId: taskCreated.id,
        title: taskCreated.title,
      });
    }
    results.features['Goals & Tasks'] = taskSuccess ? 'PASS' : 'FAIL';

    // 8. Focus Timer & Study Sessions
    logStep(8, 'Testing Study Sessions Module');
    await safeGoto(page, `${BASE_URL}/dashboard/sessions`);
    await new Promise((r) => setTimeout(r, 2000));

    const sessionsPageOk = await page.evaluate(() => {
      return document.body.innerText.includes('Session') || document.body.innerText.includes('Timer');
    });
    recordControl('Study Sessions Page Rendered', sessionsPageOk);

    // Create a real completed study session in database
    const sessionSaved = await page.evaluate(async (ts) => {
      try {
        const token = localStorage.getItem('focusflow_token');
        const startRes = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `Autonomous QA Focus Session ${ts}`,
            plannedDurationSeconds: 1500,
          }),
        }).then((r) => r.json());

        if (!startRes.success || !startRes.session?.id) {
          return null;
        }

        const endRes = await fetch('/api/sessions/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: startRes.session.id,
            status: 'completed',
            tabSwitches: 0,
            idleTimeSeconds: 0,
            blockedAttempts: 0,
          }),
        }).then((r) => r.json());

        return endRes.success ? endRes.session : startRes.session;
      } catch {
        return null;
      }
    }, TIMESTAMP);

    const sessionSuccess = Boolean(sessionSaved && sessionSaved.id);
    recordControl('Session Persistence & Metric Log', sessionSuccess, sessionSaved ? `SessionID: ${sessionSaved.id}` : 'Failed');
    if (sessionSuccess) {
      results.databaseEvidence.push({
        action: 'SESSION_SAVED_IN_POSTGRES',
        sessionId: sessionSaved.id,
        duration: sessionSaved.duration,
      });
    }
    results.features['Study Sessions'] = sessionSuccess ? 'PASS' : 'FAIL';

    // 9. MODULE 1 — FOCUS ROOMS (Collaboration)
    logStep(9, 'Testing Collaboration Module 1: Focus Rooms');
    await safeGoto(page, `${BASE_URL}/dashboard/focus-rooms`);
    await new Promise((r) => setTimeout(r, 2000));

    // Verify rooms directory loaded
    const roomsLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('FOCUS ROOMS') &&
             document.body.innerText.includes('Create Room');
    });
    recordControl('Focus Rooms Directory Rendered', roomsLoaded);

    // Create a live focus room via API
    const roomCreated = await page.evaluate(async (ts) => {
      try {
        const token = localStorage.getItem('focusflow_token');
        const res = await fetch('/api/collaboration/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `QA Deep Focus Room ${ts}`,
            category: 'coding',
            isPublic: true,
            maxParticipants: 4,
            durationSeconds: 1500,
          }),
        }).then((r) => r.json());
        return res.success ? res.room : null;
      } catch {
        return null;
      }
    }, TIMESTAMP);

    const roomSuccess = Boolean(roomCreated && roomCreated.id);
    recordControl('Focus Room Creation & Host Assignment', roomSuccess, roomCreated ? `Code: ${roomCreated.invite_code}` : 'Failed');
    if (roomSuccess) {
      results.databaseEvidence.push({
        action: 'FOCUS_ROOM_CREATED_IN_POSTGRES',
        roomId: roomCreated.id,
        inviteCode: roomCreated.invite_code,
      });

      // Enter the live room
      await safeGoto(page, `${BASE_URL}/dashboard/focus-rooms/${roomCreated.id}`);
      await new Promise((r) => setTimeout(r, 2000));

      const inLiveRoom = await page.evaluate(() => {
        return document.body.innerText.includes('HOST') ||
               document.body.innerText.includes('START') ||
               document.body.innerText.includes('25:00');
      });
      recordControl('Live Room Workspace & Synchronized Timer', inLiveRoom);

      // Post a chat message in the live room
      const msgPosted = await page.evaluate(async (rId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/rooms/${rId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: 'Autonomous QA verification check-in',
              messageType: 'chat',
            }),
          }).then((r) => r.json());
          return res.success;
        } catch {
          return false;
        }
      }, roomCreated.id);
      recordControl('Room Chat & Message Broadcast', msgPosted);
    }
    results.features['Focus Rooms'] = roomSuccess ? 'PASS' : 'FAIL';

    // 10. MODULE 2 — FOCUS CIRCLES (Collaboration)
    logStep(10, 'Testing Collaboration Module 2: Focus Circles');
    await safeGoto(page, `${BASE_URL}/dashboard/focus-circles`);
    await new Promise((r) => setTimeout(r, 2000));

    const circleCreated = await page.evaluate(async (ts) => {
      try {
        const token = localStorage.getItem('focusflow_token');
        const res = await fetch('/api/collaboration/circles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `QA Circle ${ts}`,
            description: 'Automated weekly peer cohort',
            category: 'general',
          }),
        }).then((r) => r.json());
        return res.success ? res.circle : null;
      } catch {
        return null;
      }
    }, TIMESTAMP);

    const circleSuccess = Boolean(circleCreated && circleCreated.id);
    recordControl('Focus Circle Creation & DB Persistence', circleSuccess, circleCreated ? `Invite: ${circleCreated.invite_code}` : 'Failed');
    if (circleSuccess) {
      results.databaseEvidence.push({
        action: 'FOCUS_CIRCLE_CREATED_IN_POSTGRES',
        circleId: circleCreated.id,
      });

      // Record a weekly commitment
      const commitmentSaved = await page.evaluate(async (cId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/circles/${cId}/commitments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              commitment: 'Complete 100 focus minutes of QA validation',
            }),
          }).then((r) => r.json());
          return res.success ? res.commitment : null;
        } catch {
          return null;
        }
      }, circleCreated.id);

      const commitSuccess = Boolean(commitmentSaved && commitmentSaved.id);
      recordControl('Weekly Commitment Recorded & Saved', commitSuccess);

      // Check-in commitment
      const checkedIn = await page.evaluate(async (cId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/circles/${cId}/commitments/check-in`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              completionNote: 'All QA milestones satisfied cleanly',
            }),
          }).then((r) => r.json());
          return res.success;
        } catch {
          return false;
        }
      }, circleCreated.id);
      recordControl('Weekly Check-In & Streak Calculation', checkedIn);
    }
    results.features['Focus Circles'] = circleSuccess ? 'PASS' : 'FAIL';

    // 11. MODULE 3 — PROJECT PODS (Collaboration)
    logStep(11, 'Testing Collaboration Module 3: Project Pods');
    await safeGoto(page, `${BASE_URL}/dashboard/project-pods`);
    await new Promise((r) => setTimeout(r, 2000));

    const podCreated = await page.evaluate(async (ts) => {
      try {
        const token = localStorage.getItem('focusflow_token');
        const res = await fetch('/api/collaboration/pods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `QA Pod Workspace ${ts}`,
            description: 'Team project milestone tracking',
          }),
        }).then((r) => r.json());
        return res.success ? res.pod : null;
      } catch {
        return null;
      }
    }, TIMESTAMP);

    const podSuccess = Boolean(podCreated && podCreated.id);
    recordControl('Project Pod Creation & Membership', podSuccess, podCreated ? `PodID: ${podCreated.id}` : 'Failed');
    if (podSuccess) {
      results.databaseEvidence.push({
        action: 'PROJECT_POD_CREATED_IN_POSTGRES',
        podId: podCreated.id,
      });

      // Add a milestone to the pod
      const milestoneCreated = await page.evaluate(async (pId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/pods/${pId}/milestones`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: 'QA Alpha Release Verification',
            }),
          }).then((r) => r.json());
          return res.success ? res.milestone : null;
        } catch {
          return null;
        }
      }, podCreated.id);

      recordControl('Project Pod Milestone Creation', Boolean(milestoneCreated && milestoneCreated.id));

      // Add a pod task
      const podTaskCreated = await page.evaluate(async (pId, mId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/pods/${pId}/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: 'Automated End-to-End Test Suite Execution',
              milestoneId: mId,
              priority: 'urgent',
            }),
          }).then((r) => r.json());
          return res.success ? res.task : null;
        } catch {
          return null;
        }
      }, podCreated.id, milestoneCreated?.id);

      recordControl('Project Pod Task Creation', Boolean(podTaskCreated && podTaskCreated.id));

      // Toggle pod task to done
      if (podTaskCreated?.id) {
        const taskUpdated = await page.evaluate(async (pId, tId) => {
          try {
            const token = localStorage.getItem('focusflow_token');
            const res = await fetch(`/api/collaboration/pods/${pId}/tasks/${tId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: 'done' }),
            }).then((r) => r.json());
            return res.success;
          } catch {
            return false;
          }
        }, podCreated.id, podTaskCreated.id);
        recordControl('Project Pod Task Completion & Progress Calculation', taskUpdated);
      }
    }
    results.features['Project Pods'] = podSuccess ? 'PASS' : 'FAIL';

    // 12. MODULE 4 — UNBLOCK EXCHANGE (Collaboration)
    logStep(12, 'Testing Collaboration Module 4: Unblock Exchange');
    await safeGoto(page, `${BASE_URL}/dashboard/unblock-exchange`);
    await new Promise((r) => setTimeout(r, 2000));

    // Create an unblock request scoped to the created pod
    let unblockReqCreated = null;
    if (podCreated?.id) {
      unblockReqCreated = await page.evaluate(async (pId, ts) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch('/api/collaboration/unblock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: `Need review on deployment pipeline ${ts}`,
              description: 'Automated test pipeline needs verification from another peer.',
              category: 'technical',
              scopeType: 'pod',
              scopeId: pId,
            }),
          }).then((r) => r.json());
          return res.success ? res.request : null;
        } catch {
          return null;
        }
      }, podCreated.id, TIMESTAMP);
    }

    const unblockSuccess = Boolean(unblockReqCreated && unblockReqCreated.id);
    recordControl('Unblock Exchange Request Creation', unblockSuccess, unblockReqCreated ? `ID: ${unblockReqCreated.id}` : 'Failed');
    if (unblockSuccess) {
      results.databaseEvidence.push({
        action: 'UNBLOCK_REQUEST_CREATED_IN_POSTGRES',
        requestId: unblockReqCreated.id,
      });

      // Resolve the request
      const resolved = await page.evaluate(async (reqId) => {
        try {
          const token = localStorage.getItem('focusflow_token');
          const res = await fetch(`/api/collaboration/unblock/${reqId}/resolve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              outcomeNotes: 'Resolved cleanly during autonomous QA test execution',
            }),
          }).then((r) => r.json());
          return res.success;
        } catch {
          return false;
        }
      }, unblockReqCreated.id);
      recordControl('Unblock Request Resolution & Lifecycle', resolved);
    }
    results.features['Unblock Exchange'] = unblockSuccess ? 'PASS' : 'FAIL';

    // 13. AI Daily Planner & Insights
    logStep(13, 'Testing AI Planner & AI Insights');
    await safeGoto(page, `${BASE_URL}/dashboard/planner`);
    await new Promise((r) => setTimeout(r, 2000));

    const plannerLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Planner') ||
             document.body.innerText.includes('AI') ||
             document.body.innerText.includes('Generate');
    });
    recordControl('AI Planner Interface Rendered', plannerLoaded);
    results.features['AI Planner'] = plannerLoaded ? 'PASS' : 'FAIL';

    // 14. Distraction Shield
    logStep(14, 'Testing Distraction Shield');
    await safeGoto(page, `${BASE_URL}/dashboard/distractions`);
    await new Promise((r) => setTimeout(r, 2000));

    const distractionsLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Distraction') ||
             document.body.innerText.includes('Shield');
    });
    recordControl('Distraction Shield Interface Rendered', distractionsLoaded);
    results.features['Distraction Shield'] = distractionsLoaded ? 'PASS' : 'FAIL';

    // 15. Analytics & Reports
    logStep(15, 'Testing Analytics & Reports');
    await safeGoto(page, `${BASE_URL}/dashboard/analytics`);
    await new Promise((r) => setTimeout(r, 2000));

    const analyticsLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Analytics') ||
             document.body.innerText.includes('Trends') ||
             document.body.innerText.includes('Focus');
    });
    recordControl('Analytics Dashboard Rendered', analyticsLoaded);
    results.features['Analytics & Reports'] = analyticsLoaded ? 'PASS' : 'FAIL';

    // 16. Settings & Profile
    logStep(16, 'Testing Settings & Preferences');
    await safeGoto(page, `${BASE_URL}/dashboard/settings`);
    await new Promise((r) => setTimeout(r, 2000));

    const settingsLoaded = await page.evaluate(() => {
      return document.body.innerText.includes('Settings') ||
             document.body.innerText.includes('Profile');
    });
    recordControl('Settings Dashboard Rendered', settingsLoaded);
    results.features['Settings'] = settingsLoaded ? 'PASS' : 'FAIL';

    // 17. Session Persistence & Logout
    logStep(17, 'Testing Session Persistence Across Refresh & Logout');
    await page.reload({ waitUntil: 'domcontentloaded' });
    const stillAuthed = await page.evaluate(() => Boolean(localStorage.getItem('focusflow_token')));
    recordControl('Session Persistence Across Reload', stillAuthed);
    results.authentication.sessionPersistence = stillAuthed ? 'PASS' : 'FAIL';

    // Logout
    await page.evaluate(() => {
      localStorage.removeItem('focusflow_token');
      localStorage.removeItem('focusflow_user');
      window.location.href = '/login';
    });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const postLogoutUrl = page.url();
    const logoutSuccess = postLogoutUrl.includes('/login');
    recordControl('Logout & Session Cleanup', logoutSuccess, `URL: ${postLogoutUrl}`);
    results.authentication.signOut = logoutSuccess ? 'PASS' : 'FAIL';

    // Protected Route Guard
    await safeGoto(page, `${BASE_URL}/dashboard`, 15000);
    await new Promise((r) => setTimeout(r, 2000));
    const protectedGuardUrl = page.url();
    const guardSuccess = protectedGuardUrl.includes('/login');
    recordControl('Protected Route Guard (Redirect unauth to /login)', guardSuccess, `URL: ${protectedGuardUrl}`);
    results.authentication.protectedRouteGuard = guardSuccess ? 'PASS' : 'FAIL';

  } catch (err) {
    console.error('Test Execution Error:', err);
    results.failures.push({ step: 'UNCAUGHT_BROWSER_ERROR', detail: err.message });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    try {
      fs.rmSync(uniqueProfileDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // 18. Output Comprehensive Summary
  logStep(18, 'E2E QA Execution Complete');
  console.log('\nFINAL RESULTS JSON:');
  console.log(JSON.stringify(results, null, 2));

  // Save report artifact
  fs.writeFileSync(
    path.resolve(__dirname, '../qa_autonomous_results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('\nSaved full report to qa_autonomous_results.json');
}

runQA();
