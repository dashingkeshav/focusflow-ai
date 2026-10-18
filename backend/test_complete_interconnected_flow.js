/**
 * FocusFlow AI — End-to-End Interconnected System Verification
 * Verifies:
 * 1. Goal creation
 * 2. Task creation linked to Goal
 * 3. Starting a Focus Session with Task context
 * 4. Ending Focus Session & marking Task complete
 * 5. Automatic Goal Progress recalculation
 * 6. Rule-based Achievement unlocking
 * 7. Applying AI Plan items to real Tasks
 * 8. Strict Data Isolation between multiple accounts
 */

require("dotenv").config();
const { pool } = require("./src/config/db");
const taskController = require("./src/controllers/taskController");
const goalController = require("./src/controllers/goalController");
const focusController = require("./src/controllers/focusController");
const plannerController = require("./src/controllers/plannerController");
const { evaluateUserAchievements } = require("./src/utils/achievementEvaluator");

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
  console.log("🧪 TESTING FULL INTERCONNECTED PRODUCTIVITY SYSTEM FLOW");
  console.log("=======================================================\n");

  // Create User A
  const uA = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
      ["User Alpha", `user_a_${Date.now()}@test.flow`, "hash"]
    )
  ).rows[0];

  // Create User B (for isolation test)
  const uB = (
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
      ["User Beta", `user_b_${Date.now()}@test.flow`, "hash"]
    )
  ).rows[0];

  try {
    // STEP 1: Create Goal for User A
    console.log("▶ Step 1: Create real Goal in PostgreSQL");
    const gRes = mockRes();
    await goalController.createGoal(
      {
        user: { id: uA.id },
        body: {
          name: "Launch Distributed Engine",
          description: "Production release with zero downtime",
          category: "Engineering",
          priority: "High",
          target: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        },
      },
      gRes
    );
    const goalA = gRes._get().data.goal;
    assert(goalA && goalA.id, "Goal created with UUID in DB");
    assert(goalA.progress === 0, "Initial goal progress is 0%");

    // STEP 2: Create 2 Tasks linked to Goal
    console.log("\n▶ Step 2: Create 2 real Tasks linked to Goal");
    const t1Res = mockRes();
    await taskController.createTask(
      {
        user: { id: uA.id },
        body: {
          title: "Implement Heartbeat Protocol",
          goalId: goalA.id,
          priority: "High",
          estimatedDuration: 30,
        },
      },
      t1Res
    );
    const task1 = t1Res._get().data.task;
    assert(task1 && task1.id, "Task 1 created in tasks table");

    const t2Res = mockRes();
    await taskController.createTask(
      {
        user: { id: uA.id },
        body: {
          title: "Setup PostgreSQL Connection Pool",
          goalId: goalA.id,
          priority: "Medium",
          estimatedDuration: 45,
        },
      },
      t2Res
    );
    const task2 = t2Res._get().data.task;
    assert(task2 && task2.id, "Task 2 created in tasks table");

    // Verify achievement 'first_task' unlocked
    const achRes = await pool.query(
      `SELECT ua.unlocked, ad.key FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1 AND ad.key = 'first_task'`,
      [uA.id]
    );
    assert(achRes.rows[0]?.unlocked === true, "'first_task' achievement auto-unlocked!");

    // STEP 3: Start Focus Session connected to Task 1
    console.log("\n▶ Step 3: Start Focus Session with real Task 1 context");
    const startRes = mockRes();
    await focusController.startFocusSession(
      {
        user: { id: uA.id },
        body: {
          taskTitle: task1.title,
          taskId: task1.id,
          durationSeconds: 1800,
        },
        app: { get: () => null },
      },
      startRes
    );
    const session = startRes._get().data.session;
    assert(session && session.id, "Focus session created in database");
    assert(session.taskId === task1.id, "Session holds foreign key to Task 1");

    // STEP 4: End Focus Session and Mark Task Complete
    console.log("\n▶ Step 4: End Focus Session -> Updates Task 1 to completed");
    const endRes = mockRes();
    await focusController.endFocusSession(
      {
        user: { id: uA.id },
        body: {
          sessionId: session.id,
          taskId: task1.id,
          markTaskCompleted: true,
          status: "completed",
        },
        app: { get: () => null },
      },
      endRes
    );

    // Verify Task 1 is completed
    const t1Check = await pool.query("SELECT status, actual_duration FROM tasks WHERE id = $1", [task1.id]);
    assert(t1Check.rows[0].status === "completed", "Task 1 status is 'completed'");
    assert(t1Check.rows[0].actual_duration > 0, "Task 1 logged actual duration from session");

    // STEP 5: Verify Goal Progress Auto-Calculated
    console.log("\n▶ Step 5: Verify Goal Progress Recalculated (1 of 2 tasks done = 50%)");
    const gCheck = await pool.query("SELECT progress, status FROM goals WHERE id = $1", [goalA.id]);
    assert(gCheck.rows[0].progress === 50, `Goal progress is 50% (got ${gCheck.rows[0].progress}%)`);

    // STEP 6: Complete Task 2 -> Goal reaches 100% and 'goal_finisher' unlocks!
    console.log("\n▶ Step 6: Complete Task 2 -> Goal reaches 100% and 'goal_finisher' unlocks");
    const statusRes = mockRes();
    await taskController.updateTaskStatus(
      {
        user: { id: uA.id },
        params: { id: task2.id },
        body: { status: "completed" },
        app: { get: () => null },
      },
      statusRes
    );

    const gFinal = await pool.query("SELECT progress, status FROM goals WHERE id = $1", [goalA.id]);
    assert(gFinal.rows[0].progress === 100, `Goal progress is 100% (got ${gFinal.rows[0].progress}%)`);
    assert(gFinal.rows[0].status === "Completed", "Goal auto-marked 'Completed'");

    // Verify 'goal_finisher' and 'first_focus' achievements
    await evaluateUserAchievements(uA.id);
    const gfAch = await pool.query(
      `SELECT ua.unlocked, ad.key FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1 AND ad.key = 'goal_finisher'`,
      [uA.id]
    );
    assert(gfAch.rows[0]?.unlocked === true, "'goal_finisher' achievement auto-unlocked!");

    const ffAch = await pool.query(
      `SELECT ua.unlocked, ad.key FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1 AND ad.key = 'first_focus'`,
      [uA.id]
    );
    assert(ffAch.rows[0]?.unlocked === true, "'first_focus' achievement auto-unlocked!");

    // STEP 7: AI Plan Confirmation -> Creates real tasks and calendar events
    console.log("\n▶ Step 7: Apply AI Plan items to real Tasks and Calendar");
    const applyRes = mockRes();
    await plannerController.applyPlan(
      {
        user: { id: uA.id },
        body: {
          items: [
            {
              title: "Deep Work: Deploy to Staging",
              durationMinutes: 45,
              priority: "High",
              linkedGoal: "Launch Distributed Engine",
              time: "14:00 - 14:45",
            },
          ],
          createTasks: true,
          createCalendarEvents: true,
        },
        app: { get: () => null },
      },
      applyRes
    );
    assert(applyRes._get().data.createdTasksCount === 1, "Real task created from AI Plan item");
    assert(applyRes._get().data.createdEventsCount === 1, "Real calendar event created from AI Plan item");

    // STEP 8: Security & Data Isolation
    console.log("\n▶ Step 8: Multi-user Data Isolation Verification");
    const userBTasksRes = mockRes();
    await taskController.getTasks({ user: { id: uB.id }, query: {} }, userBTasksRes);
    assert(userBTasksRes._get().data.tasks.length === 0, "User B cannot see any of User A's tasks");
    assert(userBTasksRes._get().data.counts.all === 0, "User B task counts strictly isolated to 0");

    const userBGoalsRes = mockRes();
    await goalController.getGoals({ user: { id: uB.id }, query: {} }, userBGoalsRes);
    assert(userBGoalsRes._get().data.goals.length === 0, "User B cannot see any of User A's goals");

    console.log("\n=======================================================");
    console.log("🎉 ALL INTERCONNECTED FLOW TESTS PASSED FLAWLESSLY! ✅");
    console.log("=======================================================\n");
  } finally {
    // Cleanup
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [uA.id, uB.id]);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
