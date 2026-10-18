/**
 * FocusFlow AI — Analytics & Reports Regression Test Suite
 *
 * Verifies:
 * 1. getDateRangeReport computes sessionCount and mapped sessions without ReferenceError.
 * 2. getDateRangeReport handles empty session sets correctly.
 * 3. getDateRangeReport aggregates weeklyData and totals properly.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:5432/test";
process.env.JWT_SECRET ||= "test_jwt_secret_key_12345";

const analyticsController = require("./src/controllers/analyticsController");
const { pool } = require("./src/config/db");

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

test("Analytics Regression: getDateRangeReport correctly processes sessions and computes sessionCount", async () => {
  const originalQuery = pool.query;

  const mockSessions = [
    {
      id: "sess-1",
      title: "Deep Focus 1",
      start_time: new Date("2026-10-15T10:00:00Z"),
      duration_seconds: 1500,
      avg_focus_score: 92,
      tab_switches: 1,
      idle_time_seconds: 30,
      camera_distractions: 0,
      warning_count: 0,
      blocked_attempts: 0,
      status: "completed",
    },
    {
      id: "sess-2",
      title: "Deep Focus 2",
      start_time: new Date("2026-10-16T14:00:00Z"),
      duration_seconds: 3000,
      avg_focus_score: 88,
      tab_switches: 3,
      idle_time_seconds: 120,
      camera_distractions: 1,
      warning_count: 1,
      blocked_attempts: 0,
      status: "completed",
    },
  ];

  try {
    pool.query = async (query) => {
      if (query.includes("FROM sessions")) {
        return { rows: mockSessions };
      }
      return { rows: [] };
    };

    const req = {
      user: { id: "user-123", isPro: false },
      query: { start: "2026-10-10", end: "2026-10-17" },
    };
    const res = makeResponse();

    await analyticsController.getDateRangeReport(req, res);

    assert.equal(res.statusCode, null); // 200 via res.json()
    assert.equal(res.body.success, true);
    assert.equal(res.body.stats.dateRange.sessionCount, 2);
    assert.equal(res.body.stats.sessions.length, 2);
    assert.equal(res.body.stats.totalStudySeconds, 4500);
    assert.equal(res.body.stats.totalTabSwitches, 4);
    assert.equal(res.body.stats.avgFocusScore, 90);
  } finally {
    pool.query = originalQuery;
  }
});

test("Analytics Regression: getDateRangeReport handles empty sessions safely", async () => {
  const originalQuery = pool.query;

  try {
    pool.query = async (query) => {
      if (query.includes("FROM sessions")) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const req = {
      user: { id: "user-123", isPro: false },
      query: { start: "2026-10-10", end: "2026-10-17" },
    };
    const res = makeResponse();

    await analyticsController.getDateRangeReport(req, res);

    assert.equal(res.body.success, true);
    assert.equal(res.body.stats.dateRange.sessionCount, 0);
    assert.equal(res.body.stats.sessions.length, 0);
    assert.equal(res.body.stats.totalStudySeconds, 0);
    assert.equal(res.body.stats.avgFocusScore, null);
  } finally {
    pool.query = originalQuery;
  }
});
