/**
 * FocusFlow AI — real telemetry + 2-account isolation test.
 * Run from repo root: node backend/test_real_telemetry.js
 */
const BASE = "http://localhost:5001";

const log = (label, value) => console.log(label, JSON.stringify(value, null, 2));

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

(async () => {
  const suffix = Date.now();
  let failures = 0;
  const check = (name, cond, detail) => {
    console.log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? " | " + detail : ""}`);
    if (!cond) failures += 1;
  };

  // ── Account A (existing demo account) ──────────────────────────────────────
  const loginA = await api("/api/auth/login", {
    method: "POST",
    body: { email: "demo.student@focusflow.dev", password: "DemoFocus2026!" },
  });
  const tokenA = loginA.data?.token;
  check("login A", Boolean(tokenA), `status ${loginA.status}`);

  // ── Account B (fresh registration) ────────────────────────────────────────
  const regB = await api("/api/auth/register", {
    method: "POST",
    body: {
      name: "Isolation Tester",
      email: `iso.tester.${suffix}@focusflow.dev`,
      password: "TestIso2026!",
      confirmPassword: "TestIso2026!",
    },
  });
  let tokenB = regB.data?.token;
  if (!tokenB) {
    const loginB = await api("/api/auth/login", {
      method: "POST",
      body: { email: `iso.tester.${suffix}@focusflow.dev`, password: "TestIso2026!" },
    });
    tokenB = loginB.data?.token;
  }
  check("register/login B", Boolean(tokenB), `status ${regB.status}`);

  // ── A starts a real focus session ─────────────────────────────────────────
  const startA = await api("/api/focus/start", {
    method: "POST",
    token: tokenA,
    body: {
      taskTitle: "Real telemetry verification",
      durationSeconds: 300,
      strictness: "balanced",
      browserProtection: true,
      allowedSites: [],
      blockedSites: [],
      warningSites: [],
    },
  });
  const sessionIdA = startA.data?.session?.id;
  check("A starts session", Boolean(sessionIdA), `status ${startA.status}`);
  check(
    "new session stores no fabricated score (null)",
    startA.data?.session?.avgFocusScore === null,
    `avgFocusScore=${JSON.stringify(startA.data?.session?.avgFocusScore)}`
  );

  // ── /api/focus/calculate now requires auth ────────────────────────────────
  const noAuth = await api("/api/focus/calculate", { method: "POST", body: {} });
  check("POST /api/focus/calculate requires auth", noAuth.status === 401, `status ${noAuth.status}`);

  // ── Extension-style metrics sync (real measured counters) ─────────────────
  const sync = await api("/api/focus/sync-metrics", {
    method: "POST",
    token: tokenA,
    body: {
      sessionId: sessionIdA,
      tabSwitches: 3,
      idleTimeSeconds: 120,
      blockedAttempts: 1,
      distractionEvents: 1,
      keyboardEvents: 250,
      mouseEvents: 800,
    },
  });
  const syncedScore = sync.data?.session?.finalFocusScore;
  // expected: 100 − 3*3 − (120/60→2)*2 − 1*8 + 3 (engaged input) = 82
  check(
    "score computed from real counters (expected 82)",
    syncedScore === 82,
    `finalFocusScore=${JSON.stringify(syncedScore)} avgFocusScore=${JSON.stringify(sync.data?.session?.avgFocusScore)} samples=${JSON.stringify(sync.data?.session?.focusScoreSamples)}`
  );

  // ── Live metrics endpoint (owner) ─────────────────────────────────────────
  const liveA = await api(`/api/focus/live?sessionId=${sessionIdA}`, { token: tokenA });
  check(
    "A sees real live metrics",
    liveA.data?.score === 82 && liveA.data?.metrics?.tabSwitches === 3,
    `score=${JSON.stringify(liveA.data?.score)} metrics=${JSON.stringify(liveA.data?.metrics && {
      tab: liveA.data.metrics.tabSwitches,
      idle: liveA.data.metrics.idleTimeSeconds,
      kb: liveA.data.metrics.keyboardEvents,
    })}`
  );

  // ── ISOLATION: B must not see A's session anywhere ────────────────────────
  const liveBForA = await api(`/api/focus/live?sessionId=${sessionIdA}`, { token: tokenB });
  check(
    "B cannot read A's session via /api/focus/live",
    liveBForA.data?.sessionId == null && liveBForA.data?.score == null,
    `status ${liveBForA.status} sessionId=${JSON.stringify(liveBForA.data?.sessionId)}`
  );

  const eventB = await api("/api/focus/event", {
    method: "POST",
    token: tokenB,
    body: { sessionId: sessionIdA, eventType: "site_blocked", domain: "evil.com" },
  });
  check("B cannot inject events into A's session", eventB.status === 404, `status ${eventB.status}`);

  const endB = await api("/api/focus/end", {
    method: "POST",
    token: tokenB,
    body: { sessionId: sessionIdA, status: "completed" },
  });
  check("B cannot end A's session", endB.status === 404, `status ${endB.status}`);

  const historyB = await api("/api/sessions/history", { token: tokenB });
  const seesA = (historyB.data?.sessions || []).some((s) => s.id === sessionIdA);
  check("B's session history does not contain A's session", historyB.status === 200 && !seesA, `count=${historyB.data?.count}`);

  const dashB = await api("/api/analytics/dashboard", { token: tokenB });
  check(
    "B's analytics contain no A data",
    dashB.data?.stats?.totalSessions === 0 && dashB.data?.stats?.avgFocusScore == null,
    `totalSessions=${dashB.data?.stats?.totalSessions} avg=${JSON.stringify(dashB.data?.stats?.avgFocusScore)}`
  );

  // ── B has no active session → live metrics are null (Not available) ───────
  const liveB = await api("/api/focus/live", { token: tokenB });
  check(
    "no session → score null (Not available)",
    liveB.data?.sessionId == null && liveB.data?.score == null,
    `score=${JSON.stringify(liveB.data?.score)}`
  );

  // ── A ends the session — server computes duration + final score ──────────
  await new Promise((r) => setTimeout(r, 2000));
  const endA = await api("/api/focus/end", {
    method: "POST",
    token: tokenA,
    body: { sessionId: sessionIdA, status: "completed" },
  });
  const endSession = endA.data?.session;
  check("A ends session", endA.status === 200 && endSession?.status === "completed", `status ${endA.status}`);
  check(
    "final score persisted from real telemetry (82, not 100)",
    Number(endSession?.finalFocusScore) === 82,
    `final=${JSON.stringify(endSession?.finalFocusScore)} avg=${JSON.stringify(endSession?.avgFocusScore)}`
  );
  check(
    "duration computed server-side (>=2s, not client-supplied)",
    Number(endSession?.durationSeconds) >= 2,
    `durationSeconds=${JSON.stringify(endSession?.durationSeconds)}`
  );

  // ── A's analytics reflect only real data ──────────────────────────────────
  const dashA = await api("/api/analytics/dashboard", { token: tokenA });
  check(
    "A's analytics show the real scored session",
    dashA.data?.stats?.avgFocusScore === 82,
    `avg=${JSON.stringify(dashA.data?.stats?.avgFocusScore)} total=${dashA.data?.stats?.totalSessions}`
  );

  console.log(failures === 0 ? "\nALL CHECKS PASSED ✅" : `\n${failures} CHECK(S) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Test crashed:", e);
  process.exit(1);
});
