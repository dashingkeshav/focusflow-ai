/**
 * FocusFlow AI — End-to-End Razorpay Subscription Integration Test Suite
 *
 * Validates:
 * 1. Razorpay plan validation against official Razorpay API (₹399 INR monthly).
 * 2. Multi-user setup (User A and User B).
 * 3. Subscription creation via Express API (/api/billing/subscriptions) -> genuine Razorpay Test Mode subscription.
 * 4. DB persistence in Supabase PostgreSQL (user_subscriptions table).
 * 5. Signature verification (/api/billing/verify) with timing-safe HMAC check and invalid signature rejection.
 * 6. Multi-user security: User B cannot access, verify, or cancel User A's subscription.
 * 7. Webhook endpoint (/api/billing/razorpay/webhook):
 *    - Signature validation (HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET).
 *    - Invalid signature rejection.
 *    - Idempotent processing (duplicate event does not re-apply).
 *    - Lifecycle status reconciliation (subscription.charged, subscription.cancelled).
 * 8. Entitlement isolation: User A gets Pro, User B stays Free.
 * 9. Cancellation flow (/api/billing/subscription/cancel).
 * 10. Clean-up of test records.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { pool } = require("./src/config/db");

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_environment";
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PLAN_ID = process.env.RAZORPAY_PRO_PLAN_ID;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    results.push({ name: testName, pass: true, details });
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    results.push({ name: testName, pass: false, details });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    // not json
  }
  return { status: response.status, headers: response.headers, text, json };
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 FOCUSFLOW AI — RAZORPAY TEST MODE INTEGRATION SUITE");
  console.log("========================================================\n");

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;
  let subA = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Config & Plan Validation via Razorpay API
    // ----------------------------------------------------
    console.log("📋 Test 1: Validating Razorpay API Credentials & Plan ID...");
    assert(Boolean(KEY_ID && KEY_SECRET && PLAN_ID && WEBHOOK_SECRET), "Environment variables configured", `Key: ${KEY_ID?.slice(0, 8)}...`);

    const authHeader = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`;
    const planRes = await fetch(`https://api.razorpay.com/v1/plans/${PLAN_ID}`, {
      headers: { Authorization: authHeader },
    });
    const planData = await planRes.json();

    assert(planRes.status === 200, "Razorpay API responds with plan details", `HTTP ${planRes.status}`);
    assert(planData.id === PLAN_ID, "Plan ID matches configured ID", planData.id);
    assert(planData.item?.amount === 39900, "Plan amount is exactly ₹399 INR (39900 paise)", `Amount: ${planData.item?.amount}`);
    assert(planData.item?.currency === "INR", "Plan currency is INR", planData.item?.currency);
    assert(planData.period === "monthly", "Plan billing period is monthly", planData.period);

    // ----------------------------------------------------
    // TEST 2: Seed Test Users (User A & User B) in Database
    // ----------------------------------------------------
    console.log("\n👥 Test 2: Setting up test users in PostgreSQL...");
    const testAEmail = `test_user_a_${Date.now()}@focusflow.test`;
    const testBEmail = `test_user_b_${Date.now()}@focusflow.test`;

    const resA = await pool.query(
      `INSERT INTO users (name, email, password, plan, is_pro, created_at, updated_at)
       VALUES ($1, $2, $3, 'free', false, NOW(), NOW())
       RETURNING id, name, email`,
      ["Test User A", testAEmail, "hash_user_a"]
    );
    userA = resA.rows[0];

    const resB = await pool.query(
      `INSERT INTO users (name, email, password, plan, is_pro, created_at, updated_at)
       VALUES ($1, $2, $3, 'free', false, NOW(), NOW())
       RETURNING id, name, email`,
      ["Test User B", testBEmail, "hash_user_b"]
    );
    userB = resB.rows[0];

    tokenA = jwt.sign({ id: userA.id, email: userA.email }, JWT_SECRET, { expiresIn: "1h" });
    tokenB = jwt.sign({ id: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: "1h" });

    assert(Boolean(userA?.id && userB?.id), "Users created in database", `A: ${userA.id}, B: ${userB.id}`);

    // Verify initial entitlements for both users
    const entAInit = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entAInit.status === 200 && entAInit.json?.entitlements?.isPro === false, "User A begins with Free plan entitlements", `isPro: ${entAInit.json?.entitlements?.isPro}`);
    assert(entAInit.json?.entitlements?.limits?.aiPlanGenerations?.limit === 5, "User A has Free limit of 5 AI plans/day", `limit: ${entAInit.json?.entitlements?.limits?.aiPlanGenerations?.limit}`);

    // ----------------------------------------------------
    // TEST 3: Create Real Razorpay Test Subscription for User A
    // ----------------------------------------------------
    console.log("\n💳 Test 3: Creating Razorpay Test Subscription for User A via API...");
    const createSubRes = await request("/api/billing/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planKey: "pro" }),
    });

    assert(createSubRes.status === 200 || createSubRes.status === 201, "Create subscription endpoint returns 200 or 201 OK", `HTTP ${createSubRes.status}`);
    assert(createSubRes.json?.success === true, "Create subscription response success = true");
    assert(createSubRes.json?.keyId === KEY_ID, "Returned keyId matches public key", createSubRes.json?.keyId);
    assert(Boolean(createSubRes.json?.subscription?.id?.startsWith("sub_")), "Returned genuine Razorpay subscription ID (starts with sub_)", createSubRes.json?.subscription?.id);

    subA = createSubRes.json?.subscription;

    // Verify record in PostgreSQL user_subscriptions
    const dbSub = await pool.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND razorpay_subscription_id = $2`,
      [userA.id, subA.id]
    );
    assert(dbSub.rows.length === 1, "Subscription saved to PostgreSQL user_subscriptions table", `Found ${dbSub.rows.length} row`);
    assert(dbSub.rows[0].razorpay_plan_id === PLAN_ID, "Subscription record contains correct Plan ID", dbSub.rows[0].razorpay_plan_id);
    assert(dbSub.rows[0].status === "created" || dbSub.rows[0].status === "pending", "Initial DB status is created or pending", dbSub.rows[0].status);

    // ----------------------------------------------------
    // TEST 4: Prevent Duplicate Subscriptions
    // ----------------------------------------------------
    console.log("\n🛡️ Test 4: Testing idempotent retry and duplicate subscription prevention...");
    const retryRes = await request("/api/billing/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planKey: "pro" }),
    });
    assert(retryRes.status === 200, "Repeated create subscription returns existing pending subscription safely", retryRes.json?.subscription?.id);
    assert(retryRes.json?.subscription?.id === subA.id, "Reuses identical subscription ID instead of spamming new ones", retryRes.json?.subscription?.id);

    // ----------------------------------------------------
    // TEST 5: Security Boundary & Multi-User Isolation
    // ----------------------------------------------------
    console.log("\n🔒 Test 5: Testing multi-user isolation (User B cannot touch User A)...");
    const userBSubStatus = await request("/api/billing/subscription", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(userBSubStatus.status === 200, "User B gets their own subscription status", `HTTP ${userBSubStatus.status}`);
    assert(userBSubStatus.json?.subscription === null, "User B has NO subscription (User A's sub is not visible to User B)");

    // User B tries to cancel User A's subscription
    const userBCancel = await request("/api/billing/subscription/cancel", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenB}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscriptionId: subA.id }),
    });
    assert(userBCancel.status === 404, "User B cannot cancel User A's subscription (returns 404)", `HTTP ${userBCancel.status}`);

    // User B tries to verify checkout with User A's subscription ID
    const fakePaymentId = `pay_test_${Date.now()}`;
    const fakeSignaturePayload = `${fakePaymentId}|${subA.id}`;
    const fakeSignature = crypto.createHmac("sha256", KEY_SECRET).update(fakeSignaturePayload).digest("hex");

    const userBVerify = await request("/api/billing/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenB}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: fakePaymentId,
        razorpay_subscription_id: subA.id,
        razorpay_signature: fakeSignature,
      }),
    });
    assert(userBVerify.status === 404, "User B cannot verify User A's subscription (returns 404)", `HTTP ${userBVerify.status}`);

    // ----------------------------------------------------
    // TEST 6: Checkout Signature Verification & False-Success Prevention
    // ----------------------------------------------------
    console.log("\n🔏 Test 6: Testing Checkout Verification & False-Success Prevention...");
    
    // 6a: Test missing payment verification parameters (missing payment ID or signature)
    const missingParamsRes = await request("/api/billing/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_subscription_id: subA.id,
        // omitted razorpay_payment_id and razorpay_signature
      }),
    });
    assert(missingParamsRes.status === 400, "Missing payment verification parameters rejected (HTTP 400)", missingParamsRes.json?.message);

    // 6b: Test invalid signature rejection
    const invalidVerifyRes = await request("/api/billing/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: fakePaymentId,
        razorpay_subscription_id: subA.id,
        razorpay_signature: "invalid_fabricated_hex_signature_abcdef123456",
      }),
    });
    assert(invalidVerifyRes.status === 400, "Fabricated checkout signature is rejected (HTTP 400)", `HTTP ${invalidVerifyRes.status}`);

    // 6c: Test Checkout open & close without payment (Checkout dismissed)
    // Subscription was created in Test 3, but user opened UPI QR code and closed/cancelled without paying.
    const entBeforePay = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entBeforePay.status === 200 && entBeforePay.json?.entitlements?.isPro === false, "Closing Checkout without payment leaves user strictly Free (isPro = false)", `isPro: ${entBeforePay.json?.entitlements?.isPro}`);

    // 6d: Test authentic HMAC calculation against authoritative server-stored subscription
    // When payment is uncaptured / remote status is 'created' or 'pending', verify endpoint must NEVER grant Pro.
    const validSignaturePayload = `${fakePaymentId}|${subA.id}`;
    const validSignature = crypto.createHmac("sha256", KEY_SECRET).update(validSignaturePayload).digest("hex");

    const validVerifyRes = await request("/api/billing/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: fakePaymentId,
        razorpay_subscription_id: subA.id,
        razorpay_signature: validSignature,
      }),
    });
    assert(validVerifyRes.status === 200, "Valid signature passes HMAC cryptographic verification", `HTTP ${validVerifyRes.status}`);
    assert(validVerifyRes.json?.success === true, "Verification endpoint returns success");
    assert(validVerifyRes.json?.isPro === false, "Uncaptured subscription does NOT grant Pro (isPro = false)", `isPro: ${validVerifyRes.json?.isPro}`);
    assert(validVerifyRes.json?.status === "pending", "Uncaptured subscription marked pending instead of active", `status: ${validVerifyRes.json?.status}`);

    // Re-verify entitlements still Free after uncaptured verify call
    const entAfterUnpaidVerify = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entAfterUnpaidVerify.json?.entitlements?.isPro === false, "Entitlements remain Free after uncaptured verify (Zero False Success)", `isPro: ${entAfterUnpaidVerify.json?.entitlements?.isPro}`);


    // ----------------------------------------------------
    // TEST 7: Webhook Endpoint Signature Validation & Lifecycle
    // ----------------------------------------------------
    console.log("\n🪝 Test 7: Testing Webhook Endpoint (/api/billing/razorpay/webhook)...");

    // 7a: Missing/invalid webhook signature
    const badWebhookRes = await request("/api/billing/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": "invalid_webhook_signature",
      },
      body: JSON.stringify({ event: "subscription.activated" }),
    });
    assert(badWebhookRes.status === 400, "Webhook rejects invalid X-Razorpay-Signature (HTTP 400)", `HTTP ${badWebhookRes.status}`);

    // 7b: subscription.authenticated (Mandate authorization registered, but charge not yet captured)
    // CRITICAL: Mandate authorization must NOT activate Pro entitlement!
    const authEventId = `evt_auth_${Date.now()}`;
    const authPayloadObj = {
      id: authEventId,
      event_id: authEventId,
      entity: "event",
      account_id: "acc_test",
      event: "subscription.authenticated",
      contains: ["subscription"],
      payload: {
        subscription: {
          entity: {
            id: subA.id,
            plan_id: PLAN_ID,
            status: "authenticated",
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
            notes: { userId: userA.id },
            auth_attempts: 1,
            paid_count: 0, // Not yet charged!
            remaining_count: 12,
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };
    const authBody = JSON.stringify(authPayloadObj);
    const authSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(authBody).digest("hex");

    const authWebhookRes = await request("/api/billing/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": authSig,
        "X-Razorpay-Event-Id": authEventId,
      },
      body: authBody,
    });
    assert(authWebhookRes.status === 200, "Webhook processes subscription.authenticated event (HTTP 200)", `HTTP ${authWebhookRes.status}`);

    // Verify entitlements remain Free under "authenticated" status
    const entAfterAuth = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entAfterAuth.json?.entitlements?.isPro === false, "Mandate authorization (subscription.authenticated) does NOT grant Pro (isPro = false)", `isPro: ${entAfterAuth.json?.entitlements?.isPro}`);

    // 7c: subscription.activated event (Actual charge captured & cycle active)
    const eventId = `evt_test_${Date.now()}`;
    const webhookPayloadObj = {
      id: eventId,
      event_id: eventId,
      entity: "event",
      account_id: "acc_test",
      event: "subscription.activated",
      contains: ["subscription"],
      payload: {
        subscription: {
          entity: {
            id: subA.id,
            plan_id: PLAN_ID,
            status: "active",
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
            ended_at: null,
            quantity: 1,
            notes: { userId: userA.id },
            charge_at: Math.floor(Date.now() / 1000) + 30 * 86400,
            start_at: Math.floor(Date.now() / 1000),
            end_at: Math.floor(Date.now() / 1000) + 365 * 86400,
            auth_attempts: 1,
            total_count: 12,
            paid_count: 1,
            remaining_count: 11,
            customer_notify: 1,
            created_at: Math.floor(Date.now() / 1000),
            expire_by: null,
            short_url: null,
            has_scheduled_changes: false,
            change_scheduled_at: null,
            source: "api",
            payment_method: "card",
            offer_id: null,
          },
        },
        payment: {
          entity: {
            id: `pay_${Date.now()}`,
            amount: 39900,
            currency: "INR",
            status: "captured",
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };


    const webhookBody = JSON.stringify(webhookPayloadObj);
    const validWebhookSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(webhookBody).digest("hex");

    const webhookRes = await request("/api/billing/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": validWebhookSig,
        "X-Razorpay-Event-Id": eventId,
      },
      body: webhookBody,
    });
    assert(webhookRes.status === 200, "Webhook accepts authenticated event (HTTP 200)", `HTTP ${webhookRes.status}`);
    assert(webhookRes.json?.received === true, "Webhook returns received: true");

    // 7c: Verify idempotency - replay the same webhook payload
    const duplicateRes = await request("/api/billing/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": validWebhookSig,
        "X-Razorpay-Event-Id": eventId,
      },
      body: webhookBody,
    });
    assert(duplicateRes.status === 200, "Replayed duplicate webhook returns HTTP 200 idempotently", `HTTP ${duplicateRes.status}`);
    assert(duplicateRes.json?.duplicate === true, "Duplicate detected and flagged without re-execution", `duplicate: ${duplicateRes.json?.duplicate}`);

    // Verify billing_webhook_events table recorded the event
    const eventAudit = await pool.query(
      `SELECT * FROM billing_webhook_events WHERE subscription_id = $1`,
      [subA.id]
    );
    assert(eventAudit.rows.length >= 1, "Webhook event recorded in billing_webhook_events table", `Count: ${eventAudit.rows.length}`);

    // ----------------------------------------------------
    // TEST 8: Verified Entitlements Check
    // ----------------------------------------------------
    console.log("\n⭐ Test 8: Verifying User A Entitlements (Pro) vs User B (Free)...");

    const entAPost = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entAPost.status === 200, "User A entitlements query succeeds", `HTTP ${entAPost.status}`);
    assert(entAPost.json?.entitlements?.isPro === true, "User A entitlements: isPro is TRUE", `isPro: ${entAPost.json?.entitlements?.isPro}`);
    assert(entAPost.json?.entitlements?.tier === "pro", "User A tier is 'pro'", entAPost.json?.entitlements?.tier);
    assert(entAPost.json?.entitlements?.limits?.aiPlanGenerations?.limit === 200, "User A daily AI plan generation limit upgraded to 200", `limit: ${entAPost.json?.entitlements?.limits?.aiPlanGenerations?.limit}`);
    assert(entAPost.json?.entitlements?.features?.fullDistractionIntelligence === true, "User A has Pro distraction intelligence", `feature: true`);
    assert(entAPost.json?.entitlements?.features?.advancedReportsPdf === true, "User A has Pro PDF report export", `feature: true`);

    const entBPost = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(entBPost.json?.entitlements?.isPro === false, "User B entitlements: isPro remains FALSE (No leak across users)", `isPro: ${entBPost.json?.entitlements?.isPro}`);
    assert(entBPost.json?.entitlements?.limits?.aiPlanGenerations?.limit === 5, "User B AI plan generation limit remains Free (5)", `limit: ${entBPost.json?.entitlements?.limits?.aiPlanGenerations?.limit}`);

    // Check users table in PostgreSQL
    const userADb = await pool.query(`SELECT plan, is_pro FROM users WHERE id = $1`, [userA.id]);
    assert(userADb.rows[0].is_pro === true && userADb.rows[0].plan === "pro", "User A in PostgreSQL users table has is_pro = true, plan = 'pro'");

    const userBDb = await pool.query(`SELECT plan, is_pro FROM users WHERE id = $1`, [userB.id]);
    assert(userBDb.rows[0].is_pro === false && userBDb.rows[0].plan === "free", "User B in PostgreSQL users table remains is_pro = false, plan = 'free'");

    // ----------------------------------------------------
    // TEST 9: Subscription Cancellation Workflow
    // ----------------------------------------------------
    console.log("\n🛑 Test 9: Testing Subscription Cancellation Workflow...");

    const cancelRes = await request("/api/billing/subscription/cancel", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_cycle_end: true }),
    });

    assert(cancelRes.status === 200, "Cancel subscription endpoint returns 200 OK", `HTTP ${cancelRes.status}`);
    assert(cancelRes.json?.success === true, "Cancel subscription success = true");

    // Check subscription status in DB
    const subCheck = await pool.query(
      `SELECT status, cancel_at_period_end FROM user_subscriptions WHERE user_id = $1`,
      [userA.id]
    );
    assert(
      subCheck.rows[0].status === "cancel_pending" || subCheck.rows[0].status === "cancelled",
      "Subscription recorded as cancel_pending or cancelled",
      `status: ${subCheck.rows[0].status}, cancel_at_period_end: ${subCheck.rows[0].cancel_at_period_end}`
    );

    if (subCheck.rows[0].status === "cancel_pending") {
      // Because cancellation is scheduled at cycle end, user maintains Pro access until period end
      const entACancelPending = await request("/api/billing/entitlements", {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(entACancelPending.json?.entitlements?.isPro === true, "User retains Pro access while cancel_pending until period end", `isPro: ${entACancelPending.json?.entitlements?.isPro}`);
    } else {
      console.log("  ℹ️ Subscription was cancelled immediately (no active cycle had elapsed).");
    }

    // Now simulate subscription.cancelled event from Razorpay (immediate / expired)
    const cancelWebhookPayloadObj = {
      entity: "event",
      account_id: "acc_test",
      event: "subscription.cancelled",
      contains: ["subscription"],
      payload: {
        subscription: {
          entity: {
            id: subA.id,
            plan_id: PLAN_ID,
            status: "cancelled",
            current_start: Math.floor(Date.now() / 1000) - 30 * 86400,
            current_end: Math.floor(Date.now() / 1000) - 1, // expired
            ended_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000) + 1,
    };
    const cancelBody = JSON.stringify(cancelWebhookPayloadObj);
    const cancelSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(cancelBody).digest("hex");

    const cancelWebhookRes = await request("/api/billing/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": cancelSig,
      },
      body: cancelBody,
    });
    assert(cancelWebhookRes.status === 200, "Webhook processes subscription.cancelled event", `HTTP ${cancelWebhookRes.status}`);

    // Entitlement should now revert to Free
    const entAFinal = await request("/api/billing/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(entAFinal.json?.entitlements?.isPro === false, "User A Pro access revoked after subscription is fully cancelled & expired", `isPro: ${entAFinal.json?.entitlements?.isPro}`);

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    assert(false, "Test execution crashed", err.message);
  } finally {
    // ----------------------------------------------------
    // CLEANUP: Remove Test Users and Data
    // ----------------------------------------------------
    console.log("\n🧹 Cleaning up test data from PostgreSQL...");
    try {
      if (subA?.id) {
        await pool.query(`DELETE FROM billing_webhook_events WHERE subscription_id = $1`, [subA.id]);
        await pool.query(`DELETE FROM user_subscriptions WHERE razorpay_subscription_id = $1`, [subA.id]);
      }
      if (userA?.id) {
        await pool.query(`DELETE FROM user_subscriptions WHERE user_id = $1`, [userA.id]);
        await pool.query(`DELETE FROM users WHERE id = $1`, [userA.id]);
      }
      if (userB?.id) {
        await pool.query(`DELETE FROM user_subscriptions WHERE user_id = $1`, [userB.id]);
        await pool.query(`DELETE FROM users WHERE id = $1`, [userB.id]);
      }
      console.log("✅ Cleanup complete.");
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n========================================================");
  console.log("📊 TEST EXECUTION SUMMARY");
  console.log("========================================================");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ALL RAZORPAY SUBSCRIPTION INTEGRATION TESTS PASSED!");
  } else {
    console.error("⚠️ SOME TESTS FAILED. Inspect details above.");
  }
  console.log("========================================================\n");

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
