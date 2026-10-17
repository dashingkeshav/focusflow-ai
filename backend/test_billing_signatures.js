const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:5432/test";

const billingController = require("./src/controllers/billingController");
const requireStudentPro = require("./src/middleware/requireStudentPro");
const { pool } = require("./src/config/db");

test("Razorpay signatures use HMAC-SHA256 and compare safely", () => {
  const secret = "test-webhook-secret";
  const payload = Buffer.from('{"event":"subscription.activated"}');
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  assert.equal(billingController.createSignature(secret, payload), expected);
  assert.equal(billingController.secureEqual(expected, expected), true);
  assert.equal(billingController.secureEqual(expected, `${expected}0`), false);
  assert.equal(billingController.secureEqual(expected, "invalid"), false);
});

test("checkout reports missing server configuration instead of faking payment", async () => {
  const keys = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_PLAN_PRO",
    "RAZORPAY_PLAN_STUDENT_PRO",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);

  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await billingController.createSubscription(
      { body: { planKey: "pro" }, user: { id: "test-user" } },
      response,
    );
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /not configured/i);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("FocusFlow Pro checkout accepts current and legacy plan keys", async () => {
  const keys = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_PLAN_PRO"];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  const previousFetch = global.fetch;
  const previousQuery = pool.query;
  process.env.RAZORPAY_KEY_ID = "test-key";
  process.env.RAZORPAY_KEY_SECRET = "test-secret";
  process.env.RAZORPAY_PLAN_PRO = "plan_focusflow_pro";

  let subscriptionNumber = 0;
  const insertedPlanKeys = [];
  global.fetch = async (url) => ({
    ok: true,
    json: async () => url.endsWith("/plans/plan_focusflow_pro")
      ? { item: { amount: 39900, currency: "INR" }, period: "monthly", interval: 1 }
      : { id: `sub_test_${++subscriptionNumber}`, status: "created" },
  });
  pool.query = async (query, params) => {
    if (query.includes("SELECT id, email, name FROM users")) {
      return { rows: [{ id: "test-user", email: "user@focusflow.test", name: "Test User" }] };
    }
    if (query.includes("SELECT id, plan_key")) return { rows: [] };
    if (query.includes("INSERT INTO user_subscriptions")) {
      insertedPlanKeys.push(params[1]);
      return { rowCount: 1, rows: [] };
    }
    throw new Error("Unexpected billing database query in test.");
  };

  const makeResponse = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  try {
    for (const planKey of ["pro", "student_pro"]) {
      const response = makeResponse();
      await billingController.createSubscription(
        { body: { planKey }, user: { id: "test-user" } },
        response,
      );
      assert.equal(response.statusCode, 201);
      assert.equal(response.body.subscription.planKey, "pro");
      assert.equal(response.body.subscription.title, "FocusFlow Pro");
    }
    assert.deepEqual(insertedPlanKeys, ["pro", "pro"]);
  } finally {
    global.fetch = previousFetch;
    pool.query = previousQuery;
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("FocusFlow Pro middleware denies inactive accounts and allows active subscriptions", async () => {
  const originalQuery = pool.query;
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    pool.query = async () => ({ rowCount: 0 });
    let continued = false;
    await requireStudentPro(
      { user: { id: "test-user" } },
      response,
      () => {
        continued = true;
      },
    );
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "UPGRADE_REQUIRED");
    assert.equal(continued, false);

    pool.query = async () => ({ rowCount: 1 });
    await requireStudentPro(
      { user: { id: "test-user" } },
      response,
      () => {
        continued = true;
      },
    );
    assert.equal(continued, true);
  } finally {
    pool.query = originalQuery;
  }
});
