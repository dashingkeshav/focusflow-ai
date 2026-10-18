/**
 * FocusFlow AI — Comprehensive End-to-End Acceptance Test
 * Verifies Free & Pro tiers, entitlement enforcement, AI planner, and real data integration.
 */

require("dotenv").config();
const { pool } = require("./src/config/db");
const { runMigrations } = require("./src/config/migrate");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "focusflow_ai_phase2_secret_key_2026";
const API_BASE = "http://localhost:5001/api";

function assert(cond, msg) {
  if (!cond) {
    console.error("❌ ASSERTION FAILED:", msg);
    throw new Error(msg);
  }
  console.log("  ✓", msg);
}

async function api(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log("\n=======================================================");
  console.log("🧪 FOCUSFLOW AI — FULL ACCEPTANCE & ENTITLEMENT VERIFICATION");
  console.log("=======================================================\n");

  const ts = Date.now();
  // Create User A (Free)
  const uA = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name`,
      ["Free Student", `free_user_${ts}@flow.test`, "hashed_pw"]
    )
  ).rows[0];
  const tokenA = jwt.sign({ id: uA.id, email: uA.email }, JWT_SECRET);

  // Create User B (Pro)
  const uB = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email, name`,
      ["Pro Engineer", `pro_user_${ts}@flow.test`, "hashed_pw"]
    )
  ).rows[0];
  const tokenB = jwt.sign({ id: uB.id, email: uB.email }, JWT_SECRET);

  // Activate Pro subscription for User B in DB
  await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_key, status, current_start, current_end, razorpay_subscription_id)
     VALUES ($1, 'pro', 'active', now(), now() + interval '30 days', $2)`,
    [uB.id, `sub_test_${ts}`]
  );

  try {
    // -----------------------------------------------------------------
    // SECTION 1: USER A — FREE TIER VERIFICATION
    // -----------------------------------------------------------------
    console.log("▶ [USER A - FREE] Check Entitlement Snapshot");
    const entA = await api("/billing/entitlements", "GET", null, tokenA);
    assert(entA.status === 200, "Entitlements API responded 200 OK");
    assert(entA.data.entitlements.plan === "free", "Plan is correctly 'free'");
    assert(entA.data.entitlements.isPro === false, "isPro is false");
    assert(entA.data.entitlements.limits.aiPlanGenerations.limit === 5, "Daily AI Plan limit is 5");
    assert(entA.data.entitlements.limits.analyticsDaysHistory === 7, "Analytics limited to 7 days");
    assert(entA.data.entitlements.features.adaptiveReplanning === false, "Adaptive replanning locked");
    assert(entA.data.entitlements.features.whatIfScenarios === false, "What-if scenarios locked");
    assert(entA.data.entitlements.features.taskDecomposition === false, "Task decomposition locked");
    assert(entA.data.entitlements.features.planHistory === false, "Plan history locked");
    assert(entA.data.entitlements.features.multimodalPlanning === false, "Multimodal planning locked");

    console.log("\n▶ [USER A - FREE] Core Product CRUD & Lifecycle");
    // 1. Create Goal
    const gRes = await api("/goals", "POST", {
      name: "Master Distributed Systems",
      category: "Learning",
      priority: "High",
      target: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    }, tokenA);
    assert(gRes.status === 201 || gRes.status === 200, "Created real Goal in DB");
    const goalId = gRes.data.goal.id;

    // 2. Create Task linked to Goal
    const tRes = await api("/tasks", "POST", {
      title: "Read Raft Consensus Paper",
      goalId: goalId,
      priority: "High",
      estimatedDuration: 45,
    }, tokenA);
    assert(tRes.status === 201 || tRes.status === 200, "Created real Task linked to Goal");
    const taskId = tRes.data.task.id;

    // 3. Start Focus Session
    const sessStart = await api("/sessions/start", "POST", {
      title: "Read Raft Consensus Paper",
      taskId: taskId,
      plannedDurationSeconds: 1500,
    }, tokenA);
    assert(sessStart.status === 201 || sessStart.status === 200, "Started Focus Session in DB");
    const sessionId = sessStart.data.session.id;

    // 4. End Focus Session & Complete Task
    const sessEnd = await api("/sessions/end", "POST", {
      sessionId: sessionId,
      status: "completed",
    }, tokenA);
    assert(sessEnd.status === 200, "Ended Focus Session");

    const taskDone = await api(`/tasks/${taskId}/status`, "PATCH", {
      status: "completed",
    }, tokenA);
    assert(taskDone.status === 200, "Task marked completed");

    // 5. Verify Goal progress recalculated
    const gCheck = await api(`/goals`, "GET", null, tokenA);
    const updatedGoal = gCheck.data.goals.find(g => g.id === goalId);
    assert(updatedGoal && updatedGoal.progress === 100, "Goal progress auto-calculated to 100%");

    // 6. Basic Analytics (Focus Intelligence is locked/null for Free)
    console.log("\n▶ [USER A - FREE] Analytics Verification");
    const analyticsA = await api("/analytics/dashboard", "GET", null, tokenA);
    assert(analyticsA.status === 200, "Analytics dashboard returned 200");
    assert(analyticsA.data.stats.focusIntelligence === null, "Focus Intelligence correctly null on Free");
    assert(analyticsA.data.stats.totalSessions >= 1, "Session count reflects genuine telemetry");

    // 7. Verify Server-Side Pro Gating for User A (Direct API Rejection)
    console.log("\n▶ [USER A - FREE] Direct API Server-Side Gate Protection");
    const whatIfBlock = await api("/planner/what-if", "POST", { changes: {} }, tokenA);
    assert(whatIfBlock.status === 403, "POST /planner/what-if rejected with 403 UPGRADE_REQUIRED");
    assert(whatIfBlock.data.code === "UPGRADE_REQUIRED", "Error code is UPGRADE_REQUIRED");

    const replanBlock = await api("/planner/replan", "POST", { commit: true }, tokenA);
    assert(replanBlock.status === 403, "POST /planner/replan with commit:true rejected with 403");

    const decompBlock = await api("/planner/decompose", "POST", { goalTitle: "Big Goal" }, tokenA);
    assert(decompBlock.status === 403, "POST /planner/decompose rejected with 403");

    const histBlock = await api("/planner/history", "GET", null, tokenA);
    assert(histBlock.status === 403, "GET /planner/history rejected with 403");

    // -----------------------------------------------------------------
    // SECTION 2: USER B — PRO TIER VERIFICATION
    // -----------------------------------------------------------------
    console.log("\n▶ [USER B - PRO] Check Entitlement Snapshot");
    const entB = await api("/billing/entitlements", "GET", null, tokenB);
    assert(entB.status === 200, "Entitlements API responded 200 OK");
    assert(entB.data.entitlements.plan === "pro", "Plan is correctly 'pro'");
    assert(entB.data.entitlements.isPro === true, "isPro is true");
    assert(entB.data.entitlements.limits.aiPlanGenerations.limit === 200, "Daily AI Plan limit is 200");
    assert(entB.data.entitlements.features.adaptiveReplanning === true, "Adaptive replanning unlocked");
    assert(entB.data.entitlements.features.whatIfScenarios === true, "What-if scenarios unlocked");
    assert(entB.data.entitlements.features.taskDecomposition === true, "Task decomposition unlocked");
    assert(entB.data.entitlements.features.planHistory === true, "Plan history unlocked");
    assert(entB.data.entitlements.features.multimodalPlanning === true, "Multimodal planning unlocked");
    assert(entB.data.entitlements.features.focusIntelligence === true, "Focus intelligence unlocked");

    console.log("\n▶ [USER B - PRO] Pro Capabilities Execution");
    // 1. Pro What-If Simulation
    const whatIfRes = await api("/planner/what-if", "POST", {
      dailyHours: 6,
      skipWeekends: true,
      currentPlan: { items: [{ title: "Deep Work Block", durationMinutes: 60 }] },
    }, tokenB);
    assert(whatIfRes.status === 200 && whatIfRes.data.success, "What-If simulation generated scenarios");

    // 2. Pro Adaptive Replanning (Proposal vs Approval)
    // Non-destructive proposal test (commit: false)
    const proposeReplan = await api("/planner/replan", "POST", {
      trigger: "finished_late",
      deltaMinutes: 30,
      taskTitle: "Deep Work Block",
      currentItems: [{ title: "Deep Work Block", durationMinutes: 60, time: "09:00 - 10:00" }],
      commit: false,
    }, tokenB);
    assert(proposeReplan.status === 200 && proposeReplan.data.success, "Adaptive replan returned proposal");
    assert(proposeReplan.data.proposed === true, "Proposal did NOT overwrite saved plan");

    // 3. Pro Task Decomposition
    const decompRes = await api("/planner/decompose", "POST", {
      goalTitle: "Publish Microservices Architecture Paper",
      targetDays: 14,
    }, tokenB);
    assert(decompRes.status === 200 && decompRes.data.success, "Task decomposition broke goal into milestones");

    // 4. Pro Plan History
    const histRes = await api("/planner/history", "GET", null, tokenB);
    assert(histRes.status === 200 && histRes.data.success, "Plan history accessible for Pro");

    // -----------------------------------------------------------------
    // SECTION 3: DAILY USAGE LIMIT ENFORCEMENT
    // -----------------------------------------------------------------
    console.log("\n▶ [LIMIT ENFORCEMENT] Exhaust Free Daily AI Limit (5 Requests)");
    // Record 5 requests for User A
    const { recordFeatureUsage } = require("./src/utils/entitlements");
    await recordFeatureUsage(uA.id, "ai_plan_generate", 5);

    // Check usage snapshot
    const entAExhausted = await api("/billing/entitlements", "GET", null, tokenA);
    assert(entAExhausted.data.entitlements.limits.aiPlanGenerations.used === 5, "Usage counter shows 5/5 used");
    assert(entAExhausted.data.entitlements.limits.aiPlanGenerations.remaining === 0, "Remaining is 0");

    // 6th plan request must return 429 USAGE_LIMIT_EXCEEDED
    const limitedRes = await api("/planner/generate", "POST", {
      objective: "Should fail due to daily limit",
    }, tokenA);
    assert(limitedRes.status === 429, "6th AI plan request rejected with 429 DAILY_LIMIT_REACHED");
    assert(limitedRes.data.code === "USAGE_LIMIT_EXCEEDED", "Error code is USAGE_LIMIT_EXCEEDED");

    // User B still has plenty of quota left
    const entBCheck = await api("/billing/entitlements", "GET", null, tokenB);
    assert(entBCheck.data.entitlements.limits.aiPlanGenerations.remaining > 190, "User B still has ~200 remaining");

    // -----------------------------------------------------------------
    // SECTION 4: STRICT MULTI-USER ISOLATION
    // -----------------------------------------------------------------
    console.log("\n▶ [SECURITY & ISOLATION] Verify Complete Data Isolation");
    const uBGoals = await api("/goals", "GET", null, tokenB);
    assert(uBGoals.data.goals.length === 0, "User B cannot see User A's goals");

    const uBTasks = await api("/tasks", "GET", null, tokenB);
    assert(uBTasks.data.tasks.length === 0, "User B cannot see User A's tasks");

    console.log("\n=======================================================");
    console.log("🎉 ALL FREE & PRO ACCEPTANCE TESTS PASSED 100%! ✅");
    console.log("=======================================================\n");
  } finally {
    // Clean up test data
    await pool.query("DELETE FROM user_feature_usage WHERE user_id IN ($1, $2)", [uA.id, uB.id]);
    await pool.query("DELETE FROM user_subscriptions WHERE user_id IN ($1, $2)", [uA.id, uB.id]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [uA.id, uB.id]);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
