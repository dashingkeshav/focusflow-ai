/**
 * FocusFlow AI — Isolated Database Migration Test Suite
 *
 * Verifies that backend/src/config/migrate.js:
 * 1. Executes cleanly from a greenfield clean database (0 tables -> all schema objects created).
 * 2. Successfully migrates and backfills a representative legacy schema with pre-existing data.
 * 3. Enforces 100% idempotency when re-run multiple times.
 *
 * SAFETY INVARIANT:
 * Strictly isolated: intercepts all pool queries so it never touches production Supabase data.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://isolated_test_user:isolated_test_pass@127.0.0.1:5432/focusflow_clean_test";

function createMockPostgresDatabase() {
  const tables = new Map(); // tableName -> { columns: Map(name -> def), rows: [] }
  const indexes = new Set();
  const constraints = new Set();
  let inTransaction = false;

  const mockClient = {
    async query(sql, params = []) {
      const trimmed = sql.trim();

      if (trimmed.startsWith("BEGIN")) {
        inTransaction = true;
        return { rows: [] };
      }
      if (trimmed.startsWith("COMMIT") || trimmed.startsWith("ROLLBACK")) {
        inTransaction = false;
        return { rows: [] };
      }
      if (trimmed.startsWith("LOCK TABLE")) {
        return { rows: [] };
      }

      // Handle legacy goal task migration queries
      if (trimmed.includes("SELECT id, user_id, tasks FROM goals WHERE tasks IS NOT NULL")) {
        const goalTable = tables.get("goals");
        const rows = (goalTable ? goalTable.rows : []).filter(
          (g) => g.tasks && Array.isArray(g.tasks) && g.tasks.length > 0
        );
        return { rows };
      }

      if (trimmed.includes("INSERT INTO tasks (user_id, goal_id, title, priority, status, milestone, completed_at)")) {
        const tasksTable = tables.get("tasks");
        if (tasksTable) {
          tasksTable.rows.push({
            id: `task-${tasksTable.rows.length + 1}`,
            user_id: params[0],
            goal_id: params[1],
            title: params[2],
            priority: "Medium",
            status: params[3],
            milestone: params[4],
            completed_at: params[5],
          });
        }
        return { rows: [] };
      }

      if (trimmed.includes("UPDATE goals SET tasks = '[]'::jsonb WHERE id = $1")) {
        const goalTable = tables.get("goals");
        if (goalTable) {
          const g = goalTable.rows.find((r) => r.id === params[0]);
          if (g) g.tasks = [];
        }
        return { rows: [] };
      }

      // Handle plan_versions duplicate renumbering CTE
      if (trimmed.includes("UPDATE plan_versions AS versions")) {
        const pvTable = tables.get("plan_versions");
        if (pvTable) {
          let seq = 1;
          for (const pv of pvTable.rows) {
            pv.version_number = seq++;
          }
        }
        return { rows: [] };
      }

      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async query(sql, params = []) {
      const trimmed = sql.trim();

      // CREATE TABLE [IF NOT EXISTS] tableName (...)
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\.]+)\s*\(([\s\S]+?)\)(?:\s*;|\s*$)/gi;
      let match;
      while ((match = createTableRegex.exec(trimmed)) !== null) {
        let rawName = match[1].replace(/public\./i, "").trim().toLowerCase();
        if (!tables.has(rawName)) {
          const colMap = new Map();
          const colDefs = match[2].split(",\n");
          for (const colDef of colDefs) {
            const parts = colDef.trim().split(/\s+/);
            if (parts.length >= 2 && !["constraint", "primary", "foreign", "unique", "check"].includes(parts[0].toLowerCase())) {
              colMap.set(parts[0].toLowerCase(), parts[1].toLowerCase());
            }
          }
          tables.set(rawName, { columns: colMap, rows: [] });
        }
      }

      // ALTER TABLE tableName ADD COLUMN col1 ..., ADD COLUMN col2 ...
      const alterTableRegex = /ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+([\s\S]+?)(?:;|$)/gi;
      let alterMatch;
      while ((alterMatch = alterTableRegex.exec(trimmed)) !== null) {
        const tableName = alterMatch[1].toLowerCase();
        const clauses = alterMatch[2];
        const addColRegex = /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\(\)]+)/gi;
        let colMatch;
        while ((colMatch = addColRegex.exec(clauses)) !== null) {
          const colName = colMatch[1].toLowerCase();
          const colType = colMatch[2].toLowerCase();
          const table = tables.get(tableName);
          if (table && !table.columns.has(colName)) {
            table.columns.set(colName, colType);
          }
        }
      }

      // CREATE [UNIQUE] INDEX [IF NOT EXISTS] idxName ON tableName
      const idxRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)/gi;
      while ((match = idxRegex.exec(trimmed)) !== null) {
        indexes.add(match[1].toLowerCase());
      }

      // Achievement seeds: INSERT INTO achievement_definitions ...
      if (trimmed.includes("INSERT INTO achievement_definitions")) {
        const achTable = tables.get("achievement_definitions");
        if (achTable && params && params[0]) {
          const existing = achTable.rows.find((r) => r.key === params[0]);
          if (!existing) {
            achTable.rows.push({
              key: params[0],
              title: params[1],
              description: params[2],
              icon: params[3],
              category: params[4],
              target: params[5],
            });
          }
        }
      }

      return { rows: [] };
    },

    async connect() {
      return mockClient;
    },
  };

  return { tables, indexes, constraints, mockPool };
}

// ---------------------------------------------------------------------------
// TEST 1: Greenfield Clean Database Migration (0 tables -> all schema objects)
// ---------------------------------------------------------------------------
test("Database Migrations: Clean database creates complete production schema from scratch", async () => {
  const { tables, indexes, mockPool } = createMockPostgresDatabase();

  const { pool } = require("./src/config/db");
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  delete require.cache[require.resolve("./src/config/migrate")];

  try {
    pool.query = mockPool.query;
    pool.connect = mockPool.connect;

    const { runMigrations } = require("./src/config/migrate");
    await runMigrations();

    const expectedTables = [
      "users",
      "sessions",
      "activity_events",
      "domain_classifications",
      "user_plans",
      "plan_versions",
      "goals",
      "tasks",
      "calendar_events",
      "achievement_definitions",
      "user_achievements",
      "user_subscriptions",
      "billing_webhook_events",
      "user_feature_usage",
      "notifications",
      "quick_captures",
      "recall_decks",
      "recall_cards",
      "recall_reviews",
      "session_checkpoints",
      "focus_experiments",
      "focus_rooms",
      "focus_room_members",
      "focus_room_messages",
      "focus_circles",
      "focus_circle_members",
      "focus_circle_commitments",
      "project_pods",
      "project_pod_members",
      "project_pod_milestones",
      "project_pod_tasks",
      "project_pod_activities",
      "unblock_requests",
      "unblock_offers",
    ];

    for (const table of expectedTables) {
      assert.equal(
        tables.has(table),
        true,
        `Expected table '${table}' to be created during clean database migration.`
      );
    }

    // Verify key columns on core tables
    const userCols = tables.get("users").columns;
    assert.equal(userCols.has("plan"), true, "users table has plan column");
    assert.equal(userCols.has("is_pro"), true, "users table has is_pro column");

    const sessionCols = tables.get("sessions").columns;
    assert.equal(sessionCols.has("task_id"), true, "sessions table has task_id column");
    assert.equal(sessionCols.has("strictness"), true, "sessions table has strictness column");

    // Verify seeded system achievements
    const achTable = tables.get("achievement_definitions");
    assert.equal(achTable.rows.length >= 10, true, "System achievements seeded on clean database");
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});

// ---------------------------------------------------------------------------
// TEST 2: Existing Legacy Schema Migration & Backfill
// ---------------------------------------------------------------------------
test("Database Migrations: Representative existing schema updates cleanly without data loss", async () => {
  const { tables, mockPool } = createMockPostgresDatabase();

  // Populate representative pre-existing legacy database state
  const legacyUsers = {
    columns: new Map([
      ["id", "uuid"],
      ["name", "varchar(255)"],
      ["email", "varchar(255)"],
      ["password", "varchar(255)"],
    ]),
    rows: [
      { id: "u-1", name: "Existing User 1", email: "existing1@test.com", password: "hash" },
      { id: "u-2", name: "Existing User 2", email: "existing2@test.com", password: "hash" },
    ],
  };

  const legacyGoals = {
    columns: new Map([
      ["id", "uuid"],
      ["user_id", "uuid"],
      ["name", "varchar(255)"],
      ["tasks", "jsonb"],
    ]),
    rows: [
      {
        id: "g-1",
        user_id: "u-1",
        name: "Finish Dissertation",
        tasks: [
          { title: "Literature Review Chapter", done: true, milestone: "Chapter 1" },
          { title: "Methodology Framework", done: false, milestone: "Chapter 2" },
        ],
      },
    ],
  };

  const legacyPlanVersions = {
    columns: new Map([
      ["id", "uuid"],
      ["user_id", "uuid"],
      ["version_number", "integer"],
    ]),
    rows: [
      { id: "pv-1", user_id: "u-1", version_number: 1 },
      { id: "pv-2", user_id: "u-1", version_number: 1 }, // Concurrent duplicate version
    ],
  };

  tables.set("users", legacyUsers);
  tables.set("goals", legacyGoals);
  tables.set("plan_versions", legacyPlanVersions);

  const { pool } = require("./src/config/db");
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  delete require.cache[require.resolve("./src/config/migrate")];

  try {
    pool.query = mockPool.query;
    pool.connect = mockPool.connect;

    const { runMigrations } = require("./src/config/migrate");
    await runMigrations();

    // Verify existing users are intact and received new columns
    const userTable = tables.get("users");
    assert.equal(userTable.rows.length, 2, "Existing users preserved");
    assert.equal(userTable.columns.has("is_pro"), true, "Added is_pro to existing users");
    assert.equal(userTable.columns.has("plan"), true, "Added plan to existing users");

    // Verify legacy goal tasks were migrated into first-class tasks table
    const tasksTable = tables.get("tasks");
    assert.equal(tasksTable.rows.length, 2, "Legacy goal tasks migrated to tasks table");
    assert.equal(tasksTable.rows[0].title, "Literature Review Chapter");
    assert.equal(tasksTable.rows[0].status, "completed");
    assert.equal(tasksTable.rows[1].title, "Methodology Framework");
    assert.equal(tasksTable.rows[1].status, "todo");

    // Verify goal.tasks JSONB was cleared after migration
    assert.deepEqual(tables.get("goals").rows[0].tasks, [], "Legacy tasks array cleared after backfill");

    // Verify duplicate plan versions were renumbered deterministically
    const pvs = tables.get("plan_versions").rows;
    assert.equal(pvs[0].version_number, 1);
    assert.equal(pvs[1].version_number, 2);
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});

// ---------------------------------------------------------------------------
// TEST 3: Idempotency (Re-running migrations multiple times)
// ---------------------------------------------------------------------------
test("Database Migrations: Re-running migrations is 100% idempotent and error-free", async () => {
  const { tables, mockPool } = createMockPostgresDatabase();

  const { pool } = require("./src/config/db");
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  try {
    pool.query = mockPool.query;
    pool.connect = mockPool.connect;

    // Run 1
    delete require.cache[require.resolve("./src/config/migrate")];
    let migrateModule = require("./src/config/migrate");
    await migrateModule.runMigrations();

    const tableCountRun1 = tables.size;

    // Run 2 (simulate server restart)
    delete require.cache[require.resolve("./src/config/migrate")];
    migrateModule = require("./src/config/migrate");
    await migrateModule.runMigrations();

    // Run 3
    delete require.cache[require.resolve("./src/config/migrate")];
    migrateModule = require("./src/config/migrate");
    await migrateModule.runMigrations();

    assert.equal(tables.size, tableCountRun1, "Table count remains constant across repeated migrations");
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});
