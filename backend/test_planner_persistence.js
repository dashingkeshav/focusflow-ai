const { test } = require("node:test");
const assert = require("node:assert/strict");

// This test suite replaces every database operation; the URL is a local
// placeholder only and no connection is opened.
process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1/focusflow_test";

const { pool } = require("./src/config/db");
const Session = require("./src/models/Session");
const sessionController = require("./src/controllers/sessionController");
const focusController = require("./src/controllers/focusController");
const calendarController = require("./src/controllers/calendarController");
const focusStateStore = require("./src/utils/focusStateStore");

const TASK_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_TASK_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function planItem(overrides = {}) {
  return {
    id: "plan-focus",
    title: "Study algebra",
    type: "focus_block",
    time: "09:00 - 09:30",
    durationMinutes: 30,
    ...overrides,
  };
}

function installCalendarDb({ conflicts = [], taskRow = null } = {}) {
  let nextId = 0;
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.trim().replace(/\s+/g, " ");
      calls.push({ sql: normalized, params });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes("pg_advisory_xact_lock")) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes("FROM calendar_events") && normalized.includes("FOR UPDATE")) {
        return { rows: conflicts, rowCount: conflicts.length };
      }
      if (normalized.includes("FROM tasks t")) {
        return { rows: taskRow ? [{ ...taskRow, id: params[0], user_id: params[1] }] : [], rowCount: taskRow ? 1 : 0 };
      }
      if (normalized.includes("INSERT INTO tasks")) {
        nextId += 1;
        return {
          rows: [{
            id: `created-task-${nextId}`,
            user_id: params[0],
            goal_id: params[1],
            title: params[2],
            description: params[3],
            priority: params[4],
            status: "todo",
            due_date: params[5],
            estimated_duration: params[6],
          }],
          rowCount: 1,
        };
      }
      if (normalized.includes("INSERT INTO calendar_events")) {
        nextId += 1;
        return {
          rows: [{
            id: `created-event-${nextId}`,
            title: params[1],
            startTime: params[2],
            endTime: params[3],
            eventType: params[4],
            linkedGoal: params[5],
            linkedTaskId: params[6],
            description: params[7],
          }],
          rowCount: 1,
        };
      }
      throw new Error(`Unexpected calendar SQL: ${normalized}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  return {
    calls,
    restore() {
      pool.connect = originalConnect;
    },
  };
}

async function applyPlan(items, planDate = futureDate()) {
  const res = makeResponse();
  await calendarController.applyPlanToCalendar(
    { user: { id: "user-1" }, body: { items, planDate } },
    res
  );
  return res;
}

test("apply-plan creates tasks and linked events atomically while retaining break events", async () => {
  const db = installCalendarDb();
  try {
    const res = await applyPlan([
      planItem({ id: "focus-id" }),
      planItem({ id: "review-id", title: "Review notes", type: "review", time: "10:00 - 10:20", durationMinutes: 20 }),
      planItem({ id: "habit-id", title: "Daily reading", type: "habit", time: "11:00 - 11:15", durationMinutes: 15 }),
      planItem({ id: "break-id", title: "Break", type: "break", time: "11:15 - 11:25", durationMinutes: 10 }),
    ]);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.tasks.length, 3);
    assert.equal(res.body.events.length, 4);
    assert.equal(res.body.events[3].eventType, "break");
    assert.equal(res.body.events[3].linkedTaskId, null);
    assert.equal(res.body.taskLinks.length, 3);
    assert.deepEqual(res.body.taskLinks[0], {
      planItemId: "focus-id",
      taskId: "created-task-1",
      eventId: "created-event-2",
    });
    assert.ok(db.calls.some((call) => call.sql === "COMMIT"));
    assert.equal(db.calls.filter((call) => call.sql === "ROLLBACK").length, 0);
  } finally {
    db.restore();
  }
});

test("apply-plan reuses an owned pending task and rejects cross-user task IDs atomically", async () => {
  const ownedTask = {
    goal_id: null,
    title: "Existing task",
    description: "Authoritative task",
    priority: "High",
    status: "todo",
    estimated_duration: 30,
  };
  const db = installCalendarDb({ taskRow: ownedTask });
  try {
    const res = await applyPlan([
      planItem({ id: "reuse", taskId: TASK_ID, title: "Untrusted plan title" }),
    ]);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.tasks.length, 1);
    assert.equal(res.body.tasks[0].id, TASK_ID);
    assert.equal(res.body.tasks[0].title, "Existing task");
    assert.equal(res.body.events[0].linkedTaskId, TASK_ID);
    assert.deepEqual(res.body.taskLinks, [{
      planItemId: "reuse",
      taskId: TASK_ID,
      eventId: "created-event-1",
    }]);
    assert.equal(db.calls.filter((call) => call.sql.includes("INSERT INTO tasks")).length, 0);
  } finally {
    db.restore();
  }

  const crossUserDb = installCalendarDb();
  try {
    const res = await applyPlan([
      planItem({ id: "foreign", taskId: OTHER_TASK_ID }),
    ]);
    assert.equal(res.statusCode, 404);
    assert.equal(crossUserDb.calls.filter((call) => call.sql.includes("INSERT INTO tasks")).length, 0);
    assert.equal(crossUserDb.calls.filter((call) => call.sql.includes("INSERT INTO calendar_events")).length, 0);
    assert.ok(crossUserDb.calls.some((call) => call.sql === "ROLLBACK"));
  } finally {
    crossUserDb.restore();
  }
});

test("apply-plan rolls back on persisted and intra-plan calendar overlaps before inserts", async () => {
  const date = futureDate();
  const start = new Date(`${date}T09:10:00`);
  const end = new Date(`${date}T09:40:00`);
  const db = installCalendarDb({
    conflicts: [{ id: "existing-event", title: "Class", start_time: start, end_time: end }],
  });
  try {
    const res = await applyPlan([planItem()]);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.conflicts[0].eventId, "existing-event");
    assert.equal(db.calls.filter((call) => call.sql.includes("INSERT INTO tasks")).length, 0);
    assert.equal(db.calls.filter((call) => call.sql.includes("INSERT INTO calendar_events")).length, 0);
    assert.ok(db.calls.some((call) => call.sql === "ROLLBACK"));
  } finally {
    db.restore();
  }

  const intraPlanDb = installCalendarDb();
  try {
    const res = await applyPlan([
      planItem({ id: "first" }),
      planItem({ id: "second", time: "09:20 - 09:50" }),
    ]);
    assert.equal(res.statusCode, 409);
    assert.equal(intraPlanDb.calls.filter((call) => call.sql.includes("INSERT INTO tasks")).length, 0);
    assert.ok(intraPlanDb.calls.some((call) => call.sql === "ROLLBACK"));
  } finally {
    intraPlanDb.restore();
  }
});

test("apply-plan skips completed and skipped items, accepts planned/rescheduled, rejects unknown statuses", async () => {
  const db = installCalendarDb();
  try {
    const res = await applyPlan([
      planItem({ id: "completed", status: "completed", time: "not a valid time" }),
      planItem({ id: "skipped", status: "skipped", type: "unsupported" }),
      planItem({ id: "planned", status: "planned" }),
      planItem({ id: "rescheduled", status: "rescheduled", time: "10:00 - 10:30" }),
    ]);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body.skippedPlanItems, ["completed", "skipped"]);
    assert.equal(res.body.tasks.length, 2);
    assert.equal(res.body.events.length, 2);
    assert.equal(db.calls.filter((call) => call.sql.includes("INSERT INTO tasks")).length, 2);
    assert.ok(db.calls.some((call) => call.sql === "COMMIT"));
  } finally {
    db.restore();
  }

  const unsupportedDb = installCalendarDb();
  try {
    const res = await applyPlan([planItem({ id: "unknown", status: "archived" })]);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /unsupported status/i);
    assert.equal(unsupportedDb.calls.length, 0);
  } finally {
    unsupportedDb.restore();
  }
});

test("session start locks and validates its task, inserts the new session, then cancels prior sessions", async () => {
  const originalPoolQuery = pool.query;
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.trim().replace(/\s+/g, " ");
      calls.push({ sql: normalized, params });
      if (normalized === "BEGIN" || normalized === "COMMIT") return { rows: [] };
      if (normalized.includes("pg_advisory_xact_lock")) return { rows: [] };
      if (normalized.includes("SELECT id FROM tasks") && normalized.includes("FOR UPDATE")) {
        return { rows: [{ id: params[0] }] };
      }
      if (normalized.includes("INSERT INTO sessions")) {
        return {
          rows: [{
            id: "new-session",
            user_id: params[0],
            task_id: params[1],
            title: params[2],
            start_time: params[3],
            status: params[14],
            planned_duration_seconds: params[18],
          }],
        };
      }
      if (normalized.includes("UPDATE sessions")) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected session SQL: ${normalized}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  pool.query = async (sql, params = []) => {
    if (sql.includes("SELECT id, title, estimated_duration")) {
      return { rows: [{ id: params[0], title: "Owned task", estimated_duration: 30 }] };
    }
    throw new Error(`Unexpected pool SQL: ${sql}`);
  };

  try {
    const res = makeResponse();
    await sessionController.startSession(
      {
        user: { id: "user-1" },
        body: { taskId: TASK_ID, plannedDurationSeconds: 1800 },
      },
      res
    );

    assert.equal(res.statusCode, 201);
    const taskLockIndex = calls.findIndex((call) => call.sql.includes("SELECT id FROM tasks"));
    const insertIndex = calls.findIndex((call) => call.sql.includes("INSERT INTO sessions"));
    const cancelIndex = calls.findIndex((call) => call.sql.includes("UPDATE sessions"));
    assert.ok(taskLockIndex >= 0 && taskLockIndex < insertIndex);
    assert.ok(insertIndex < cancelIndex);
    assert.equal(calls[insertIndex].params[1], TASK_ID);
    assert.equal(calls[insertIndex].params[18], 1800);
    const lockCall = calls.find((call) => call.sql.includes("pg_advisory_xact_lock"));
    assert.deepEqual(lockCall.params, ["focus-session:user-1"]);
    assert.ok(calls.indexOf(lockCall) < insertIndex);
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
  } finally {
    pool.query = originalPoolQuery;
    pool.connect = originalConnect;
  }
});

test("smart focus start keeps task ownership, transaction ordering, state and socket behavior", async () => {
  const originalPoolQuery = pool.query;
  const originalConnect = pool.connect;
  const calls = [];
  let emittedState = null;
  const client = {
    async query(sql, params = []) {
      const normalized = sql.trim().replace(/\s+/g, " ");
      calls.push({ sql: normalized, params });
      if (normalized === "BEGIN" || normalized === "COMMIT") return { rows: [] };
      if (normalized.includes("pg_advisory_xact_lock")) return { rows: [] };
      if (normalized.includes("SELECT id FROM tasks") && normalized.includes("FOR UPDATE")) {
        return { rows: [{ id: params[0] }] };
      }
      if (normalized.includes("INSERT INTO sessions")) {
        return {
          rows: [{
            id: "smart-session",
            user_id: params[0],
            task_id: params[1],
            title: params[2],
            start_time: params[3],
            status: params[14],
            strictness: params[16],
            planned_duration_seconds: params[18],
          }],
        };
      }
      if (normalized.includes("UPDATE sessions")) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected smart-focus SQL: ${normalized}`);
    },
    release() {},
  };

  pool.connect = async () => client;
  pool.query = async (sql, params = []) => {
    if (sql.includes("SELECT id, title, estimated_duration")) {
      return { rows: [{ id: params[0], title: "Owned smart task", estimated_duration: 30 }] };
    }
    throw new Error(`Unexpected smart-focus pool SQL: ${sql}`);
  };

  try {
    const res = makeResponse();
    await focusController.startFocusSession(
      {
        user: { id: "smart-user" },
        body: {
          taskId: TASK_ID,
          plannedDurationSeconds: 1800,
          browserProtection: true,
          allowedSites: ["example.com"],
        },
        app: {
          get(key) {
            assert.equal(key, "io");
            return {
              to(room) {
                assert.equal(room, "user:smart-user");
                return {
                  emit(event, payload) {
                    assert.equal(event, "focus_state_changed");
                    emittedState = payload.state;
                  },
                };
              },
            };
          },
        },
      },
      res
    );

    assert.equal(res.statusCode, 201);
    const taskLockIndex = calls.findIndex((call) => call.sql.includes("SELECT id FROM tasks"));
    const insertIndex = calls.findIndex((call) => call.sql.includes("INSERT INTO sessions"));
    const cancelIndex = calls.findIndex((call) => call.sql.includes("UPDATE sessions"));
    assert.ok(taskLockIndex >= 0 && taskLockIndex < insertIndex);
    assert.ok(insertIndex < cancelIndex);
    assert.equal(calls[insertIndex].params[1], TASK_ID);
    assert.equal(calls[insertIndex].params[18], 1800);
    const lockCall = calls.find((call) => call.sql.includes("pg_advisory_xact_lock"));
    assert.deepEqual(lockCall.params, ["focus-session:smart-user"]);
    assert.ok(calls.indexOf(lockCall) < insertIndex);
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
    assert.equal(res.body.session.taskId, TASK_ID);
    assert.equal(res.body.session.plannedDurationSeconds, 1800);
    assert.equal(emittedState.taskId, TASK_ID);
    assert.equal(focusStateStore.activeState("smart-user").taskId, TASK_ID);
  } finally {
    focusStateStore.clearState("smart-user");
    pool.query = originalPoolQuery;
    pool.connect = originalConnect;
  }
});
