/**
 * FocusFlow AI — Billing Regression Test Suite
 *
 * Verifies:
 * 1. Abandoned QR Checkout: Initiated checkout with issued order but no payment ID leaves user strictly Free.
 * 2. Order Issued Alone: An issued Razorpay order without payment capture never activates Pro.
 * 3. Cancelled Subscriptions: Subscriptions cancelled in Razorpay (e.g. 0 payments) immediately revoke/deny Pro.
 * 4. Failed Payments: Uncaptured, failed, or invalid payment attempts reject activation and leave user Free.
 * 5. Successful Test Mode Payments: Genuine captured payment (39900 paise, captured status) + active subscription activates Pro.
 * 6. Cross-User Isolation: User B cannot verify, view, sync, or cancel User A's subscription, and User B remains Free.
 * 7. Authentic User Association: createSubscription strictly binds to genuine PostgreSQL user ID and account email without synthetic fallback.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:5432/test";
process.env.JWT_SECRET ||= "test_jwt_secret_key_12345";
process.env.RAZORPAY_KEY_ID = "rzp_test_regression_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_regression_secret";
process.env.RAZORPAY_PRO_PLAN_ID = "plan_regression_pro";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret_test";

const billingController = require("./src/controllers/billingController");
const { getUserPlan, checkFeatureEntitlement, getEntitlementsSnapshot } = require("./src/utils/entitlements");
const { pool } = require("./src/config/db");

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
}

// ---------------------------------------------------------------------------
// TEST 1: Abandoned QR Checkout (Issued Order without Payment ID) Leaves User Free
// ---------------------------------------------------------------------------
test("Regression: Abandoned QR checkout (issued order without payment ID) leaves user strictly on Free plan", async () => {
  const previousQuery = pool.query;

  // DB contains subscription in 'created' status (QR checkout opened, order issued, payment not made)
  pool.query = async (query, params) => {
    if (query.includes("FROM user_subscriptions")) {
      const allowedStatuses = params?.[1];
      // When querying active subscriptions (params[1] = ['active', 'cancel_pending']), 'created' does not match
      if (Array.isArray(allowedStatuses) && !allowedStatuses.includes("created")) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [
          {
            id: "sub-record-abandoned-1",
            user_id: "user-qr-abandoned",
            plan_key: "pro",
            razorpay_subscription_id: "sub_abandoned_qr_123",
            razorpay_payment_id: null, // No payment captured!
            status: "created",
            current_start: null,
            current_end: null,
            created_at: new Date(),
          },
        ],
      };
    }
    if (query.includes("FROM user_feature_usage")) {
      return { rows: [{ usage_count: 0 }] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    // 1. Entitlement check must report Free tier
    const userPlan = await getUserPlan("user-qr-abandoned");
    assert.equal(userPlan.isPro, false, "User must NOT have Pro entitlement");
    assert.equal(userPlan.plan, "free", "Plan tier must be 'free'");

    // 2. Pro features must be locked
    const replanCheck = await checkFeatureEntitlement("user-qr-abandoned", "adaptive_replan");
    assert.equal(replanCheck.allowed, false, "Pro-only feature must be locked");
    assert.equal(replanCheck.code, "UPGRADE_REQUIRED");

    // 3. Free usage limits must apply (5 daily AI plans)
    const snapshot = await getEntitlementsSnapshot("user-qr-abandoned");
    assert.equal(snapshot.isPro, false);
    assert.equal(snapshot.limits.aiPlanGenerations.limit, 5, "Daily AI Plan limit must be 5 for Free users");
  } finally {
    pool.query = previousQuery;
  }
});

// ---------------------------------------------------------------------------
// TEST 2: Cancelled Subscriptions (Zero Payments or Expired) Deny/Revoke Pro Access
// ---------------------------------------------------------------------------
test("Regression: Cancelled subscriptions immediately deny Pro access and revert to Free", async () => {
  const previousQuery = pool.query;

  // DB contains subscription in 'cancelled' status (cancelled in Razorpay with 0 payments)
  pool.query = async (query, params) => {
    if (query.includes("FROM user_subscriptions")) {
      const allowedStatuses = params?.[1];
      if (Array.isArray(allowedStatuses) && !allowedStatuses.includes("cancelled")) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [
          {
            id: "sub-record-cancelled-1",
            user_id: "user-cancelled",
            plan_key: "pro",
            razorpay_subscription_id: "sub_cancelled_0pay_456",
            razorpay_payment_id: null,
            status: "cancelled",
            current_start: null,
            current_end: null,
            created_at: new Date(Date.now() - 3600000),
          },
        ],
      };
    }
    if (query.includes("FROM user_feature_usage")) {
      return { rows: [{ usage_count: 0 }] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const userPlan = await getUserPlan("user-cancelled");
    assert.equal(userPlan.isPro, false, "Cancelled subscription must not grant Pro");
    assert.equal(userPlan.plan, "free");

    const snapshot = await getEntitlementsSnapshot("user-cancelled");
    assert.equal(snapshot.isPro, false);
    assert.equal(snapshot.features.advancedAnalytics, false);
    assert.equal(snapshot.features.adaptiveReplanning, false);
  } finally {
    pool.query = previousQuery;
  }
});

// ---------------------------------------------------------------------------
// TEST 3: Failed Payment Attempt Rejects Verification and Preserves Free Plan
// ---------------------------------------------------------------------------
test("Regression: Failed payment attempt rejects verification and preserves Free plan", async () => {
  const previousQuery = pool.query;
  const previousFetch = global.fetch;

  const mockSubId = "sub_live_attempt_789";
  const mockPaymentId = "pay_failed_xyz_001";
  const validSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${mockPaymentId}|${mockSubId}`)
    .digest("hex");

  let dbUpdatedStatus = null;
  let dbUserIsPro = null;

  pool.query = async (query, params) => {
    if (query.includes("razorpay_subscription_id = $2")) {
      return {
        rows: [
          {
            id: "uuid-sub-789",
            razorpay_subscription_id: mockSubId,
            status: "created",
          },
        ],
      };
    }
    if (query.includes("UPDATE user_subscriptions")) {
      dbUpdatedStatus = params[0];
      return { rowCount: 1 };
    }
    if (query.includes("UPDATE users SET plan = $1, is_pro = $2 WHERE id = $3")) {
      dbUserIsPro = params[1];
      return { rowCount: 1 };
    }
    return { rows: [] };
  };

  global.fetch = async (url) => {
    if (url.includes(`/subscriptions/${mockSubId}`)) {
      return {
        ok: true,
        json: async () => ({
          id: mockSubId,
          status: "pending",
          paid_count: 0,
        }),
      };
    }
    if (url.includes(`/payments/${mockPaymentId}`)) {
      return {
        ok: true,
        json: async () => ({
          id: mockPaymentId,
          status: "failed", // Payment FAILED!
          amount: 39900,
          currency: "INR",
          error_code: "BAD_REQUEST_ERROR",
          error_description: "Payment failed at bank",
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  };

  try {
    const res = makeResponse();
    await billingController.verifyCheckout(
      {
        user: { id: "user-failed-pay" },
        body: {
          razorpay_subscription_id: mockSubId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: validSignature,
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isPro, false, "Failed payment must NOT grant Pro");
    assert.equal(res.body.verified, false, "Failed payment must not be verified as active");
    assert.equal(res.body.status, "failed", "Status must transition to failed");
    assert.equal(dbUserIsPro, false, "Database users.is_pro must remain false");
    assert.equal(dbUpdatedStatus, "failed", "Subscription status in DB must be updated to failed");
  } finally {
    pool.query = previousQuery;
    global.fetch = previousFetch;
  }
});

// ---------------------------------------------------------------------------
// TEST 4: Successful Test Mode Payment (Captured ₹399) Activates Pro
// ---------------------------------------------------------------------------
test("Regression: Successful captured payment with active subscription grants Pro", async () => {
  const previousQuery = pool.query;
  const previousFetch = global.fetch;

  const mockSubId = "sub_genuine_pro_321";
  const mockPaymentId = "pay_captured_399_001";
  const validSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${mockPaymentId}|${mockSubId}`)
    .digest("hex");

  let dbUpdatedStatus = null;
  let dbUserIsPro = null;

  pool.query = async (query, params) => {
    if (query.includes("razorpay_subscription_id = $2")) {
      return {
        rows: [
          {
            id: "uuid-sub-321",
            razorpay_subscription_id: mockSubId,
            status: "created",
          },
        ],
      };
    }
    if (query.includes("UPDATE user_subscriptions")) {
      dbUpdatedStatus = params[0];
      return { rowCount: 1 };
    }
    if (query.includes("UPDATE users SET plan = $1, is_pro = $2 WHERE id = $3")) {
      dbUserIsPro = params[1];
      return { rowCount: 1 };
    }
    return { rows: [] };
  };

  global.fetch = async (url) => {
    if (url.includes(`/subscriptions/${mockSubId}`)) {
      return {
        ok: true,
        json: async () => ({
          id: mockSubId,
          status: "active",
          paid_count: 1,
          current_start: Math.floor(Date.now() / 1000),
          current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }),
      };
    }
    if (url.includes(`/payments/${mockPaymentId}`)) {
      return {
        ok: true,
        json: async () => ({
          id: mockPaymentId,
          status: "captured", // Successfully captured!
          amount: 39900,
          currency: "INR",
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  };

  try {
    const res = makeResponse();
    await billingController.verifyCheckout(
      {
        user: { id: "user-success-pay" },
        body: {
          razorpay_subscription_id: mockSubId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: validSignature,
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isPro, true, "Captured payment must activate Pro");
    assert.equal(res.body.verified, true);
    assert.equal(res.body.status, "active");
    assert.equal(dbUserIsPro, true, "Database users.is_pro must be set to true");
    assert.equal(dbUpdatedStatus, "active", "Subscription record status must be set to active");
  } finally {
    pool.query = previousQuery;
    global.fetch = previousFetch;
  }
});

// ---------------------------------------------------------------------------
// TEST 5: Cross-User Isolation (User B Cannot Verify, View, or Cancel User A's Sub)
// ---------------------------------------------------------------------------
test("Regression: Cross-user isolation prevents User B from accessing or verifying User A's subscription", async () => {
  const previousQuery = pool.query;

  const userASubId = "sub_owner_user_a";
  const userBId = "uuid-user-b";

  pool.query = async (query, params) => {
    // Subscription belongs strictly to User A, not User B!
    if (query.includes("razorpay_subscription_id = $2")) {
      // params[0] is req.user.id
      if (params[0] === userBId) {
        return { rows: [] }; // Not found for User B!
      }
      return { rows: [{ id: "sub-a-row", razorpay_subscription_id: userASubId, status: "created" }] };
    }
    if (query.includes("FROM user_subscriptions WHERE user_id = $1")) {
      if (params[0] === userBId) {
        return { rows: [] };
      }
      return { rows: [{ id: "sub-a-row", razorpay_subscription_id: userASubId, status: "active" }] };
    }
    return { rows: [] };
  };

  try {
    // 1. User B tries to verify User A's subscription -> 404
    const fakeSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`pay_test|${userASubId}`).digest("hex");
    const verifyRes = makeResponse();
    await billingController.verifyCheckout(
      {
        user: { id: userBId },
        body: {
          razorpay_subscription_id: userASubId,
          razorpay_payment_id: "pay_test",
          razorpay_signature: fakeSig,
        },
      },
      verifyRes
    );
    assert.equal(verifyRes.statusCode, 404, "User B verifying User A's sub must return 404 Not Found");

    // 2. User B queries subscription status -> null
    const getRes = makeResponse();
    await billingController.getSubscription({ user: { id: userBId } }, getRes);
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.body.subscription, null, "User B must see null subscription");

    // 3. User B tries to cancel User A's subscription -> 404
    const cancelRes = makeResponse();
    await billingController.cancelSubscription({ user: { id: userBId }, body: {} }, cancelRes);
    assert.equal(cancelRes.statusCode, 404, "User B cannot cancel User A's subscription");
  } finally {
    pool.query = previousQuery;
  }
});

// ---------------------------------------------------------------------------
// TEST 6: Authentic User Mapping (Rejects Synthetic Fallbacks & Binds Genuine Email)
// ---------------------------------------------------------------------------
test("Regression: createSubscription strictly resolves authenticated user from DB and rejects non-existent users", async () => {
  const previousQuery = pool.query;
  const previousFetch = global.fetch;

  let capturedNotes = null;

  global.fetch = async (url, opts) => {
    if (url.endsWith("/plans/plan_regression_pro")) {
      return {
        ok: true,
        json: async () => ({
          item: { amount: 39900, currency: "INR" },
          period: "monthly",
          interval: 1,
        }),
      };
    }
    if (url.endsWith("/subscriptions")) {
      const parsedBody = JSON.parse(opts.body);
      capturedNotes = parsedBody.notes;
      return {
        ok: true,
        json: async () => ({
          id: "sub_test_genuine_mapping",
          status: "created",
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  pool.query = async (query, params) => {
    if (query.includes("SELECT id, email, name FROM users WHERE id = $1")) {
      if (params[0] === "genuine-user-uuid") {
        return {
          rows: [
            {
              id: "genuine-user-uuid",
              email: "real.student@focusflow.ai",
              name: "Real Student",
            },
          ],
        };
      }
      return { rows: [] }; // Non-existent user
    }
    if (query.includes("SELECT id, plan_key")) {
      return { rows: [] };
    }
    if (query.includes("INSERT INTO user_subscriptions")) {
      return { rowCount: 1 };
    }
    return { rows: [] };
  };

  try {
    // 1. Non-existent user ID must be rejected (cannot create subscription for unmapped or ghost user)
    const ghostRes = makeResponse();
    await billingController.createSubscription(
      { user: { id: "ghost-user-uuid" }, body: { planKey: "pro" } },
      ghostRes
    );
    assert.equal(ghostRes.statusCode, 401, "Ghost/non-existent user must be rejected with 401");

    // 2. Genuine user creates subscription -> notes must contain DB user ID and real email
    const genuineRes = makeResponse();
    await billingController.createSubscription(
      { user: { id: "genuine-user-uuid" }, body: { planKey: "pro" } },
      genuineRes
    );
    assert.equal(genuineRes.statusCode, 201);
    assert.ok(capturedNotes, "Notes must be passed to Razorpay");
    assert.equal(capturedNotes.user_id, "genuine-user-uuid", "Notes must have genuine DB user ID");
    assert.equal(capturedNotes.user_email, "real.student@focusflow.ai", "Notes must have genuine account email");
    assert.equal(capturedNotes.plan_key, "pro");
  } finally {
    pool.query = previousQuery;
    global.fetch = previousFetch;
  }
});
