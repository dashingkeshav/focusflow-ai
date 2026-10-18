/**
 * FocusFlow AI — Final Advanced Features Verification Test
 * Tests:
 * 1. Adaptive Focus Intelligence (POST /api/planner/adaptive-check)
 * 2. Reality Learning Engine (GET /api/tasks/estimate - transparent vs learned)
 * 3. Intelligent Distraction Recovery (POST /api/focus/event with recoveryDurationSeconds)
 * 4. Workload Reality Check (calculatePlanHealth with overloaded days & alternatives)
 * 5. Smart Next Action (GET /api/tasks/next-action)
 * 6. End-of-Session Review (POST /api/focus/end with taskOutcome & notes)
 * 7. Personal Weekly Focus Review (GET /api/analytics/weekly-review - honest empty vs populated)
 * 8. Strict Data Isolation between multiple accounts
 */

require("dotenv").config();
const { pool } = require("./src/config/db");
const taskController = require("./src/controllers/taskController");
const focusController = require("./src/controllers/focusController");
const plannerController = require("./src/controllers/plannerController");
const analyticsController = require("./src/controllers/analyticsController");

function assert(cond, msg) {
  if (!cond) {
    console.error("❌ ASSERTION FAILED:", msg);
    throw new Error(msg);
  }
  console.log("  ✓", msg);
}

function mockRes() {
  let statusCode = 200;
  let data = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (d) => {
      data = d;
      return d;
    },
    _get: () => ({ statusCode, data }),
  };
  return res;
}

async function run() {
  console.log("\n=======================================================");
  console.log("🧪 TESTING FOCUSFLOW AI FINAL ADVANCED CAPABILITIES");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  // Create User A
  const uA = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
      ["Adv Tester A", `adv_a_${timestamp}@test.flow`, "hash"]
    )
  ).rows[0];

  // Create User B (for isolation test)
  const uB = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
      ["Adv Tester B", `adv_b_${timestamp}@test.flow`, "hash"]
    )
  ).rows[0];

  console.log(`👤 User A: ${uA.id}`);
  console.log(`👤 User B: ${uB.id}\n`);

  try {
    // -------------------------------------------------------------
    // 1. SMART NEXT ACTION — Empty State
    // -------------------------------------------------------------
    console.log("▶ 1. Testing Smart Next Action (Empty state)...");
    let res = mockRes();
    await taskController.getNextAction({ user: { id: uA.id } }, res);
    assert(res._get().statusCode === 200, "Returns 200 on empty tasks");
    assert(res._get().data.hasTask === false, "hasTask is false when user has no tasks");
    assert(res._get().data.task === null, "task is null when empty");
    assert(res._get().data.alternativeTasks.length === 0, "No alternatives when empty");
    assert(
      res._get().data.reason.includes("No active tasks"),
      "Honest explanation for empty tasks state"
    );

    // -------------------------------------------------------------
    // 2. REALITY LEARNING ENGINE — Transparent Initial Estimate (< 2 samples)
    // -------------------------------------------------------------
    console.log("\n▶ 2. Testing Reality Learning Engine (Insufficient history baseline)...");
    res = mockRes();
    await taskController.getTaskEstimate(
      { user: { id: uA.id }, query: { title: "Draft Quarterly Report", estimated_duration: "45" } },
      res
    );
    assert(res._get().statusCode === 200, "Returns 200 for estimate check");
    assert(res._get().data.hasComparableHistory === false, "Explicitly indicates no comparable history");
    assert(res._get().data.sampleCount === 0, "Sample count is 0");
    assert(
      res._get().data.explanation.includes("Initial estimate"),
      "Explanation uses honest initial baseline without claiming learned pattern"
    );

    // -------------------------------------------------------------
    // 3. CREATE GOAL & TASKS FOR REALITY LEARNING & NEXT ACTION
    // -------------------------------------------------------------
    console.log("\n▶ 3. Creating Goal and Tasks for User A...");
    const goalRes = await pool.query(
      `INSERT INTO goals (user_id, name, target_date, status, progress)
       VALUES ($1, $2, NOW() + INTERVAL '14 days', 'in_progress', 0)
       RETURNING id`,
      [uA.id, "Launch FocusFlow v3"]
    );
    const goalId = goalRes.rows[0].id;
    assert(goalId != null, "Created test goal");

    // Task 1: High priority, due today (should become top recommendation)
    const taskUrgent = (
      await pool.query(
        `INSERT INTO tasks (user_id, goal_id, title, priority, estimated_duration, due_date, status)
         VALUES ($1, $2, $3, 'high', 45, NOW() + INTERVAL '2 hours', 'todo')
         RETURNING id`,
        [uA.id, goalId, "Complete Architecture Review"]
      )
    ).rows[0];

    // Task 2: Medium priority, due next week
    const taskMedium = (
      await pool.query(
        `INSERT INTO tasks (user_id, goal_id, title, priority, estimated_duration, due_date, status)
         VALUES ($1, $2, $3, 'medium', 30, NOW() + INTERVAL '5 days', 'todo')
         RETURNING id`,
        [uA.id, goalId, "Update API Documentation"]
      )
    ).rows[0];

    // Task 3 & 4: Completed tasks with actual durations to train Reality Learning Engine
    // Task 3: estimated 45 mins, actual 60 mins
    await pool.query(
      `INSERT INTO tasks (user_id, goal_id, title, priority, estimated_duration, actual_duration, status, completed_at)
       VALUES ($1, $2, $3, 'high', 45, 60, 'completed', NOW() - INTERVAL '2 days')`,
      [uA.id, goalId, "Architecture Review Draft"]
    );
    // Task 4: estimated 50 mins, actual 55 mins
    await pool.query(
      `INSERT INTO tasks (user_id, goal_id, title, priority, estimated_duration, actual_duration, status, completed_at)
       VALUES ($1, $2, $3, 'high', 50, 55, 'completed', NOW() - INTERVAL '1 day')`,
      [uA.id, goalId, "Architecture Review Final Pass"]
    );

    // -------------------------------------------------------------
    // 4. SMART NEXT ACTION — Recommendation with Real Context
    // -------------------------------------------------------------
    console.log("\n▶ 4. Testing Smart Next Action with active tasks...");
    res = mockRes();
    await taskController.getNextAction({ user: { id: uA.id } }, res);
    const nextActionData = res._get().data;
    assert(nextActionData.hasTask === true, "Found recommended next action");
    assert(nextActionData.task.id === taskUrgent.id, "Recommended the urgent high-priority task");
    assert(nextActionData.task.title === "Complete Architecture Review", "Correct task title recommended");
    assert(nextActionData.alternativeTasks.length >= 1, "Provides alternative tasks for user choice");
    assert(nextActionData.reason != null, "Provides structured rationale");
    console.log(`  ✓ Rationale: "${nextActionData.reason}"`);

    // -------------------------------------------------------------
    // 5. REALITY LEARNING ENGINE — Learned Estimate with History
    // -------------------------------------------------------------
    console.log("\n▶ 5. Testing Reality Learning Engine with comparable history...");
    res = mockRes();
    await taskController.getTaskEstimate(
      { user: { id: uA.id }, query: { title: "Architecture Review Deployment", goal_id: goalId, estimated_duration: "45" } },
      res
    );
    const estData = res._get().data;
    assert(estData.hasComparableHistory === true, "Identified comparable completed tasks");
    assert(estData.sampleCount === 2, "Found exact sample count of 2");
    assert(estData.minDuration === 55, "Calculated min duration range = 55 mins");
    assert(estData.maxDuration === 60, "Calculated max duration range = 60 mins");
    assert(estData.estimatedDuration === 58, "Calculated rounded average suggested duration");
    assert(
      estData.explanation.includes("Similar completed tasks took approximately 55–60 minutes"),
      "Shows transparent user-facing historical duration explanation"
    );
    console.log(`  ✓ Explanation: "${estData.explanation}"`);

    // -------------------------------------------------------------
    // 6. INTELLIGENT DISTRACTION RECOVERY & FOCUS SESSION
    // -------------------------------------------------------------
    console.log("\n▶ 6. Testing Focus Session and Distraction Recovery Event...");
    res = mockRes();
    await focusController.startFocusSession(
      {
        user: { id: uA.id },
        body: {
          title: "Architecture Review Session",
          durationSeconds: 1500, // 25 mins
          taskId: taskUrgent.id,
          goalId: goalId,
        },
      },
      res
    );
    const session = res._get().data.session;
    assert(session != null && session.id != null, "Started real focus session linked to task");

    // Record a distraction event with real recovery duration
    res = mockRes();
    await focusController.recordFocusEvent(
      {
        user: { id: uA.id },
        body: {
          sessionId: session.id,
          eventType: "distraction_recovered",
          metricValue: 1,
          details: {
            blockedDomain: "youtube.com",
            source: "chrome_extension",
          },
          recoveryDurationSeconds: 42,
        },
      },
      res
    );
    assert(res._get().statusCode === 201, "Recorded recovery event successfully");

    // Verify recovery_duration_seconds was persisted in activity_events
    const eventRow = (
      await pool.query(
        `SELECT event_type, recovery_duration_seconds, details
         FROM activity_events
         WHERE session_id = $1 AND event_type = 'distraction_recovered'`,
        [session.id]
      )
    ).rows[0];
    assert(eventRow != null, "Found persisted activity_event record");
    assert(eventRow.recovery_duration_seconds === 42, "recovery_duration_seconds exactly matches 42");

    // -------------------------------------------------------------
    // 7. END-OF-SESSION REVIEW
    // -------------------------------------------------------------
    console.log("\n▶ 7. Testing End-of-Session Review with task outcome and notes...");
    res = mockRes();
    await focusController.endFocusSession(
      {
        user: { id: uA.id },
        body: {
          sessionId: session.id,
          focusScore: 88,
          tabSwitches: 1,
          idleTimeSeconds: 0,
          warningCount: 1,
          blockedAttempts: 1,
          taskOutcome: "completed",
          notes: "Completed the core architectural validation and resolved edge cases.",
        },
      },
      res
    );
    assert(res._get().statusCode === 200, "Session ended successfully");

    // Verify session updated with notes & task_outcome
    const updatedSession = (
      await pool.query(
        `SELECT status, avg_focus_score, notes, task_outcome FROM sessions WHERE id = $1`,
        [session.id]
      )
    ).rows[0];
    assert(updatedSession.status === "completed", "Session status is completed");
    console.log("  ℹ updatedSession.avg_focus_score is:", updatedSession.avg_focus_score);
    assert(updatedSession.avg_focus_score != null, "Focus score is recorded from real telemetry");
    assert(updatedSession.task_outcome === "completed", "task_outcome is completed");
    assert(updatedSession.notes.includes("Completed the core architectural validation"), "Session notes persisted");

    // Verify task updated as completed and linked goal progress recalculated
    const updatedTask = (
      await pool.query(`SELECT status, completed_at, actual_duration FROM tasks WHERE id = $1`, [taskUrgent.id])
    ).rows[0];
    assert(updatedTask.status === "completed", "Task status updated to completed");
    assert(updatedTask.completed_at != null, "Task completed_at is recorded");

    const updatedGoal = (
      await pool.query(`SELECT progress FROM goals WHERE id = $1`, [goalId])
    ).rows[0];
    console.log(`  ✓ Linked goal progress recalculated: ${updatedGoal.progress}%`);
    assert(Number(updatedGoal.progress) > 0, "Goal progress automatically updated from completed task");

    // -------------------------------------------------------------
    // 8. ADAPTIVE FOCUS INTELLIGENCE (Continuous Feedback Loop)
    // -------------------------------------------------------------
    console.log("\n▶ 8. Testing Adaptive Replanning Check...");
    // Create an active plan for User A to check against
    await pool.query(
      `INSERT INTO user_plans (user_id, plan_type, prompt, items, plan_health, current_horizon)
       VALUES ($1, 'daily', 'Sprint Alpha', $2, 'HEALTHY', 'today')`,
      [
        uA.id,
        JSON.stringify([
          { id: "p1", title: "Write Specs", type: "focus_block", time: "08:00 - 09:00", durationMinutes: 60, status: "planned", priority: "High" },
          { id: "p2", title: "Review Pull Request", type: "focus_block", time: "09:30 - 10:15", durationMinutes: 45, status: "planned", priority: "Medium" },
        ]),
      ]
    );

    res = mockRes();
    await plannerController.adaptiveCheck(
      {
        user: { id: uA.id },
        body: {},
      },
      res
    );
    assert(res._get().statusCode === 200, "Adaptive check succeeded");
    const adaptData = res._get().data;
    assert(adaptData.hasPlan === true, "Recognizes active plan");
    assert(adaptData.driftDetected === true, "Detected schedule/workload drift");
    assert(adaptData.explanation.whatChanged != null, "Provides whatChanged explanation");
    assert(adaptData.explanation.why != null, "Provides why explanation");
    assert(adaptData.proposedItems.length > 0, "Proposes non-destructive adapted items");
    console.log(`  ✓ Adaptive Replanning Explanation: "${adaptData.explanation.whatChanged}"`);

    // -------------------------------------------------------------
    // 9. WORKLOAD REALITY CHECK
    // -------------------------------------------------------------
    console.log("\n▶ 9. Testing Workload Reality Check Feasibility Analysis...");
    const health = plannerController.calculatePlanHealth({
      totalPlannedMinutes: 600,
      availableMinutes: 360,
      tasksCount: 3,
      highPriorityCount: 1,
      conflictsCount: 0,
      urgentGoalsCount: 0,
    });
    assert(health.workloadFeasibility != null, "workloadFeasibility object is present");
    assert(health.workloadFeasibility.status === "OVERLOADED", "Identifies overloaded plan");
    assert(health.workloadFeasibility.totalPlannedHours === 10, "Calculates exact 10 planned hours");
    assert(health.workloadFeasibility.availableHours === 6, "Compares with 6 available hours");
    assert(health.workloadFeasibility.alternatives.length >= 2, "Proposes practical alternatives");
    console.log(`  ✓ Feasibility reason: "${health.workloadFeasibility.explanation}"`);

    // -------------------------------------------------------------
    // 10. PERSONAL WEEKLY FOCUS REVIEW
    // -------------------------------------------------------------
    console.log("\n▶ 10. Testing Personal Weekly Focus Review (Honest data & Empty state)...");
    // Test User B (empty account)
    res = mockRes();
    await analyticsController.getWeeklyReview({ user: { id: uB.id } }, res);
    const reviewB = res._get().data;
    assert(reviewB.hasData === false, "User B with no data returns honest hasData: false");
    assert(reviewB.message != null, "Empty state message provided");

    // Test User A (populated with authentic session & task records)
    await pool.query(
      `UPDATE sessions SET duration_seconds = 1500 WHERE id = $1`,
      [session.id]
    );

    res = mockRes();
    await analyticsController.getWeeklyReview({ user: { id: uA.id } }, res);
    assert(res._get().data.hasData === true, "User A with authentic data returns hasData: true");
    const reviewA = res._get().data.review;
    assert(reviewA.completedTasks >= 1, "Calculates completed tasks from database");
    assert(reviewA.totalFocusMinutes >= 25, "Calculates real focus minutes from sessions");
    assert(reviewA.durationVariancePercent != null, "Calculates planned vs actual duration variance");
    assert(reviewA.distractions != null, "Summarizes genuine distraction sources");
    assert(reviewA.recommendations.length > 0, "Provides evidence-grounded recommendations");
    console.log(`  ✓ Weekly Review Focus Time: ${reviewA.totalFocusMinutes} mins across ${reviewA.totalSessions} sessions`);
    console.log(`  ✓ Recommendations based on evidence: ${JSON.stringify(reviewA.recommendations)}`);

    // -------------------------------------------------------------
    // 11. STRICT CROSS-USER DATA ISOLATION
    // -------------------------------------------------------------
    console.log("\n▶ 11. Testing Strict Cross-User Data Isolation...");
    // User B tries to get next action — should NOT see User A's tasks
    res = mockRes();
    await taskController.getNextAction({ user: { id: uB.id } }, res);
    assert(res._get().data.hasTask === false, "User B cannot see User A's tasks in next action");

    // User B calls getWeeklyReview — should NOT include User A's focus minutes
    res = mockRes();
    await analyticsController.getWeeklyReview({ user: { id: uB.id } }, res);
    assert(res._get().data.hasData === false, "User B cannot see User A's focus session metrics");

    console.log("\n=======================================================");
    console.log("🎉 ALL ADVANCED CAPABILITY TESTS PASSED WITH 100% SUCCESS!");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test users and cascade
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [uA.id, uB.id]);
    console.log("🧹 Cleaned up temporary test data.");
    await pool.end();
  }
}

run().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
