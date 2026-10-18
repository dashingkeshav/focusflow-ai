/**
 * FocusFlow AI — Razorpay Subscription Service & Billing Controller
 * Handles recurring ₹399/mo subscriptions, Checkout verification, webhooks, and lifecycle.
 */

const crypto = require("node:crypto");
const { pool } = require("../config/db");

const PLANS = {
  pro: {
    envKeys: ["RAZORPAY_PRO_PLAN_ID", "RAZORPAY_PLAN_PRO", "RAZORPAY_PLAN_STUDENT_PRO"],
    storageKey: "pro",
    amount: 39900, // ₹399.00 INR in paise
    currency: "INR",
    period: "monthly",
    interval: 1,
    title: "FocusFlow Pro",
  },
};

const PLAN_ALIASES = {
  student_pro: "pro",
  pro: "pro",
};

const ACTIVE_STATUSES = ["created", "authenticated", "active", "cancel_pending"];

let planCache = {
  validatedAt: 0,
  plan: null,
};

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const mode = (process.env.RAZORPAY_MODE || "test").toLowerCase();

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret, webhookSecret, mode };
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignature(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function callRazorpay(path, { method = "GET", body, credentials }) {
  const authorization = Buffer.from(
    `${credentials.keyId}:${credentials.keySecret}`
  ).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${authorization}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error?.description || "Razorpay API request failed."
    );
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.razorpayError = data?.error;
    throw error;
  }

  return data;
}

/**
 * Validates configured Razorpay Plan against official requirements:
 * Must be ₹399 INR monthly subscription.
 */
async function getConfiguredPlan(planKey = "pro", credentials) {
  const canonicalKey = PLAN_ALIASES[planKey] || "pro";
  const planConfig = PLANS[canonicalKey];
  if (!planConfig) {
    const error = new Error("Invalid subscription plan selected.");
    error.status = 400;
    throw error;
  }

  let planId = null;
  for (const envKey of planConfig.envKeys) {
    if (process.env[envKey]?.trim()) {
      planId = process.env[envKey].trim();
      break;
    }
  }

  if (!planId) {
    const error = new Error(
      "FocusFlow Pro billing is not configured yet. The server is missing RAZORPAY_PRO_PLAN_ID."
    );
    error.status = 503;
    throw error;
  }

  // Cache verified plan for 10 minutes to avoid redundant remote API requests
  const now = Date.now();
  if (planCache.plan && planCache.plan.planId === planId && now - planCache.validatedAt < 600000) {
    return planCache.plan;
  }

  const remotePlan = await callRazorpay(`/plans/${encodeURIComponent(planId)}`, {
    credentials,
  });

  if (
    remotePlan?.item?.amount !== planConfig.amount ||
    remotePlan?.item?.currency !== planConfig.currency ||
    remotePlan?.period !== planConfig.period ||
    remotePlan?.interval !== planConfig.interval
  ) {
    console.error(
      `Razorpay plan ${planId} does not match FocusFlow Pro specification: amount=${remotePlan?.item?.amount}, currency=${remotePlan?.item?.currency}, period=${remotePlan?.period}`
    );
    const error = new Error(
      `Configured Razorpay plan does not match advertised FocusFlow Pro terms (₹399 INR/month).`
    );
    error.status = 503;
    throw error;
  }

  const validated = {
    ...planConfig,
    planId,
    planKey: canonicalKey,
    remoteItem: remotePlan.item,
  };

  planCache = {
    validatedAt: now,
    plan: validated,
  };

  return validated;
}

/**
 * POST /api/billing/subscriptions
 * Creates a recurring monthly subscription for authenticated user.
 */
async function createSubscription(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const credentials = getCredentials();
    if (!credentials) {
      return res.status(503).json({
        success: false,
        message:
          "Razorpay subscription system is not configured. Server administrator must supply RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    // SECURITY: Authoritatively resolve the authenticated user from PostgreSQL.
    // Never allow synthetic fallback or untrusted user metadata from requests.
    const userRes = await pool.query(
      `SELECT id, email, name FROM users WHERE id = $1`,
      [userId]
    );
    const dbUser = userRes.rows[0];
    if (!dbUser || !dbUser.email) {
      return res.status(401).json({
        success: false,
        message: "Authenticated account record could not be found.",
      });
    }

    const plan = await getConfiguredPlan(req.body?.planKey || "pro", credentials);

    // Check existing active or pending subscriptions for this user
    const existing = await pool.query(
      `SELECT id, plan_key, razorpay_subscription_id, status, current_end
       FROM user_subscriptions
       WHERE user_id = $1 AND status = ANY($2::text[])
       ORDER BY created_at DESC
       LIMIT 1`,
      [dbUser.id, ACTIVE_STATUSES]
    );

    const prior = existing.rows[0];
    if (prior) {
      if (
        prior.status === "active" ||
        prior.status === "authenticated" ||
        (prior.status === "cancel_pending" && (!prior.current_end || new Date(prior.current_end) > new Date()))
      ) {
        return res.status(200).json({
          success: true,
          code: "SUBSCRIPTION_EXISTS",
          message: "You already have an active FocusFlow Pro subscription.",
          subscription: {
            id: prior.razorpay_subscription_id,
            status: prior.status,
            planKey: prior.plan_key,
          },
        });
      }

      // Reuse recent unauthenticated "created" subscription if less than 24h old
      if (prior.status === "created") {
        return res.status(200).json({
          success: true,
          keyId: credentials.keyId,
          subscription: {
            id: prior.razorpay_subscription_id,
            status: prior.status,
            planKey: "pro",
            title: plan.title,
            amount: plan.amount,
            currency: plan.currency,
          },
        });
      }
    }

    // Call official Razorpay Subscriptions API
    // Strict user mapping: binds to authenticated dbUser.id and dbUser.email
    const remoteSubscription = await callRazorpay("/subscriptions", {
      method: "POST",
      credentials,
      body: {
        plan_id: plan.planId,
        total_count: 120, // 10 years monthly max
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: String(dbUser.id),
          user_email: String(dbUser.email).trim().toLowerCase(),
          plan_key: "pro",
          app: "FocusFlow AI",
        },
      },
    });

    if (!remoteSubscription?.id) {
      throw new Error("Razorpay did not return a valid subscription ID.");
    }

    // Save subscription record in PostgreSQL
    await pool.query(
      `INSERT INTO user_subscriptions
         (user_id, plan_key, razorpay_subscription_id, razorpay_plan_id, status, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        dbUser.id,
        "pro",
        remoteSubscription.id,
        plan.planId,
        remoteSubscription.status || "created",
        plan.amount,
        plan.currency,
      ]
    );

    return res.status(201).json({
      success: true,
      keyId: credentials.keyId,
      subscription: {
        id: remoteSubscription.id,
        status: remoteSubscription.status,
        planKey: "pro",
        title: plan.title,
        amount: plan.amount,
        currency: plan.currency,
      },
    });
  } catch (error) {
    if (!error.status || error.status >= 500) {
      console.error("Subscription creation failed:", error.message);
    }
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Unable to initiate subscription checkout.",
    });
  }
}

/**
 * POST /api/billing/verify
 * Verifies Razorpay Checkout signature using official HMAC-SHA256:
 * signature = HMAC_SHA256(razorpay_payment_id + "|" + stored_razorpay_subscription_id, secret)
 */
async function verifyCheckout(req, res) {
  const {
    razorpay_payment_id: paymentId,
    razorpay_subscription_id: subscriptionId,
    razorpay_signature: signature,
  } = req.body || {};

  const userId = req.user?.id;
  const credentials = getCredentials();

  if (!credentials) {
    return res.status(503).json({ success: false, message: "Billing service is not configured." });
  }

  if (!paymentId || !subscriptionId || !signature) {
    return res.status(400).json({
      success: false,
      message: "Missing payment verification parameters (payment ID, subscription ID, or signature).",
    });
  }

  try {
    // SECURITY: Look up subscription associated with the authenticated user
    const result = await pool.query(
      `SELECT id, razorpay_subscription_id, status
       FROM user_subscriptions
       WHERE user_id = $1 AND razorpay_subscription_id = $2
       LIMIT 1`,
      [userId, subscriptionId]
    );

    const record = result.rows[0];
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No matching pending subscription found for your authenticated account.",
      });
    }

    // Verify cryptographic signature against authoritative stored subscription ID
    const expected = createSignature(
      credentials.keySecret,
      `${paymentId}|${record.razorpay_subscription_id}`
    );

    if (!secureEqual(expected, signature)) {
      return res.status(400).json({
        success: false,
        message: "Checkout signature verification failed. Untrusted response.",
      });
    }

    // Query Razorpay API to verify live subscription status
    const remote = await callRazorpay(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      credentials,
    });

    // Query Razorpay API to verify live payment status
    let remotePayment = null;
    try {
      remotePayment = await callRazorpay(`/payments/${encodeURIComponent(paymentId)}`, {
        credentials,
      });
    } catch (payErr) {
      console.warn(`[verifyCheckout] Payment lookup failed for ${paymentId}:`, payErr.message);
    }

    // Payment must be genuinely captured, not just authorized, pending, or failed.
    // Also verify currency and amount (₹399 INR = 39900 paise).
    const isPaymentCaptured = Boolean(
      remotePayment &&
      remotePayment.status === "captured" &&
      remotePayment.amount === 39900 &&
      remotePayment.currency === "INR"
    );

    const isSubscriptionActive = remote.status === "active";

    // Pro is STRICTLY granted only when BOTH:
    // 1. Razorpay subscription status is "active"
    // 2. Razorpay payment is verified "captured"
    // An issued order alone or mandate authorization alone NEVER grants Pro.
    let nextStatus = "pending";
    let isPro = false;

    if (isSubscriptionActive && isPaymentCaptured) {
      nextStatus = "active";
      isPro = true;
    } else if (remote.status === "authenticated") {
      nextStatus = "authenticated";
      isPro = false;
    } else if (remote.status === "cancelled" || remotePayment?.status === "failed") {
      nextStatus = remote.status === "cancelled" ? "cancelled" : "failed";
      isPro = false;
    } else {
      nextStatus = "pending";
      isPro = false;
    }

    const currentStart = remote.current_start
      ? new Date(remote.current_start * 1000)
      : (isPro ? new Date() : null);
    const currentEnd = remote.current_end
      ? new Date(remote.current_end * 1000)
      : (isPro ? new Date(Date.now() + 30 * 86400000) : null);

    // Update subscription in database
    await pool.query(
      `UPDATE user_subscriptions
       SET status = $1,
           razorpay_payment_id = $2,
           current_start = COALESCE($3, current_start),
           current_end = COALESCE($4, current_end),
           updated_at = now()
       WHERE id = $5`,
      [
        nextStatus,
        paymentId,
        currentStart,
        currentEnd,
        record.id,
      ]
    );

    // Sync user record: STRICT isolation ensuring user remains Free unless genuinely active
    await pool.query(
      `UPDATE users SET plan = $1, is_pro = $2 WHERE id = $3`,
      [isPro ? "pro" : "free", isPro, userId]
    );

    return res.status(200).json({
      success: true,
      verified: isPro,
      status: nextStatus,
      isPro,
      message: isPro
        ? "FocusFlow Pro subscription activated successfully! Enjoy full access."
        : remote.status === "authenticated"
        ? "Recurring mandate authorized. The ₹399 monthly charge has not been captured yet. Pro will activate once payment is confirmed."
        : nextStatus === "failed" || nextStatus === "cancelled"
        ? "Payment was not captured or subscription is cancelled. Your account remains on the Free plan."
        : `Payment authorization pending (status: ${remote.status}). Awaiting bank webhook confirmation.`,
    });
  } catch (error) {
    console.error("verifyCheckout error:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Failed to verify subscription checkout.",
    });
  }
}

/**
 * GET /api/billing/subscription
 * Retrieves authenticated user's current subscription details.
 */
async function getSubscription(req, res) {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT id, plan_key, razorpay_subscription_id, status, amount, currency,
              current_start, current_end, cancel_at_period_end, cancelled_at, created_at
       FROM user_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const sub = result.rows[0] || null;
    return res.status(200).json({
      success: true,
      subscription: sub,
    });
  } catch (error) {
    console.error("getSubscription error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to retrieve billing status." });
  }
}

/**
 * POST /api/billing/subscription/cancel
 * Schedules subscription cancellation at end of current cycle or immediately.
 */
async function cancelSubscription(req, res) {
  const userId = req.user?.id;
  const credentials = getCredentials();

  if (!credentials) {
    return res.status(503).json({ success: false, message: "Billing service is not configured." });
  }

  try {
    const result = await pool.query(
      `SELECT id, razorpay_subscription_id, status, current_end
       FROM user_subscriptions
       WHERE user_id = $1 AND status IN ('active', 'authenticated')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const subscription = result.rows[0];
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active FocusFlow Pro subscription found to cancel.",
      });
    }

    let cancelAtCycleEnd = req.body?.immediate !== true;

    // Call Razorpay API
    try {
      await callRazorpay(
        `/subscriptions/${encodeURIComponent(subscription.razorpay_subscription_id)}/cancel`,
        {
          method: "POST",
          credentials,
          body: { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 },
        }
      );
    } catch (cancelErr) {
      // Fallback to immediate cancel if Razorpay reports no ongoing billing cycle exists
      if (cancelAtCycleEnd && cancelErr.message && cancelErr.message.includes("no billing cycle")) {
        cancelAtCycleEnd = false;
        await callRazorpay(
          `/subscriptions/${encodeURIComponent(subscription.razorpay_subscription_id)}/cancel`,
          {
            method: "POST",
            credentials,
            body: { cancel_at_cycle_end: 0 },
          }
        );
      } else {
        throw cancelErr;
      }
    }

    const nextStatus = cancelAtCycleEnd ? "cancel_pending" : "cancelled";

    await pool.query(
      `UPDATE user_subscriptions
       SET status = $1,
           cancel_at_period_end = $2,
           cancelled_at = now(),
           updated_at = now()
       WHERE id = $3`,
      [nextStatus, cancelAtCycleEnd, subscription.id]
    );

    if (!cancelAtCycleEnd) {
      await pool.query(`UPDATE users SET plan = 'free', is_pro = false WHERE id = $1`, [userId]);
    }

    return res.status(200).json({
      success: true,
      status: nextStatus,
      message: cancelAtCycleEnd
        ? "Cancellation scheduled. You will retain Pro access until the end of your current billing cycle."
        : "Subscription cancelled immediately.",
    });
  } catch (error) {
    console.error("cancelSubscription error:", error.message);
    return res.status(error.status || 502).json({
      success: false,
      message: error.status ? error.message : "Unable to cancel subscription right now.",
    });
  }
}

/**
 * POST /api/billing/subscription/sync
 * Reconciles user's database subscription status against Razorpay API.
 */
async function syncSubscription(req, res) {
  const userId = req.user?.id;
  const credentials = getCredentials();

  if (!credentials) {
    return res.status(503).json({ success: false, message: "Billing service is not configured." });
  }

  try {
    const result = await pool.query(
      `SELECT id, razorpay_subscription_id, status
       FROM user_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const record = result.rows[0];
    if (!record) {
      return res.status(404).json({ success: false, message: "No subscription record found." });
    }

    const remote = await callRazorpay(`/subscriptions/${encodeURIComponent(record.razorpay_subscription_id)}`, {
      credentials,
    });

    const currentStart = remote.current_start ? new Date(remote.current_start * 1000) : null;
    const currentEnd = remote.current_end ? new Date(remote.current_end * 1000) : null;

    await pool.query(
      `UPDATE user_subscriptions
       SET status = $1,
           current_start = COALESCE($2, current_start),
           current_end = COALESCE($3, current_end),
           updated_at = now()
       WHERE id = $4`,
      [remote.status, currentStart, currentEnd, record.id]
    );

    const isPro = ["active", "cancel_pending"].includes(remote.status) &&
      (!currentEnd || currentEnd > new Date());

    await pool.query(
      `UPDATE users SET plan = $1, is_pro = $2 WHERE id = $3`,
      [isPro ? "pro" : "free", isPro, userId]
    );

    return res.status(200).json({
      success: true,
      status: remote.status,
      isPro,
      message: "Subscription status reconciled successfully.",
    });
  } catch (error) {
    console.error("syncSubscription error:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Failed to synchronize billing status.",
    });
  }
}

/**
 * POST /api/billing/razorpay/webhook
 * Handles incoming Razorpay subscription webhooks with idempotency and signature validation.
 */
async function handleWebhook(req, res) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const signature = req.headers["x-razorpay-signature"];

  // Handle both raw buffer (from express.raw) and pre-captured req.rawBody
  let rawBody = req.rawBody || req.body;
  if (typeof rawBody === "string") {
    rawBody = Buffer.from(rawBody, "utf8");
  } else if (!Buffer.isBuffer(rawBody)) {
    rawBody = Buffer.from(JSON.stringify(rawBody || {}), "utf8");
  }

  if (!webhookSecret) {
    console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on server.");
    return res.status(503).json({ error: "Webhook secret is not configured." });
  }

  if (!signature) {
    return res.status(400).json({ error: "Missing X-Razorpay-Signature header." });
  }

  const expected = createSignature(webhookSecret, rawBody);
  if (!secureEqual(expected, signature)) {
    console.warn("[Razorpay Webhook] Invalid webhook signature rejected.");
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid webhook JSON payload." });
  }

  const eventId =
    req.headers["x-razorpay-event-id"] ||
    payload.event_id ||
    payload.id ||
    `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const eventName = payload.event;
  const subEntity = payload.payload?.subscription?.entity;
  const paymentEntity = payload.payload?.payment?.entity;
  const subscriptionId = subEntity?.id || paymentEntity?.invoice_id || null;

  if (!subscriptionId && !subEntity?.id) {
    return res.status(200).json({ received: true, message: "Event acknowledged (no subscription entity)." });
  }

  const targetSubId = subEntity?.id || subscriptionId;

  // Idempotency check via billing_webhook_events
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO billing_webhook_events (event_id, event_type, subscription_id, payload, processed)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, eventName, targetSubId, JSON.stringify(payload)]
    );

    if (inserted.rowCount === 0) {
      await client.query("COMMIT");
      return res.status(200).json({ received: true, duplicate: true, message: "Duplicate webhook event acknowledged." });
    }

    const subRes = await client.query(
      `SELECT id, user_id, status FROM user_subscriptions
       WHERE razorpay_subscription_id = $1
       FOR UPDATE`,
      [targetSubId]
    );

    if (!subRes.rows[0]) {
      // Record not created yet or webhook arrived early
      await client.query("COMMIT");
      return res.status(200).send("Subscription not found locally; acknowledged.");
    }

    const currentRecord = subRes.rows[0];

    const eventStatusMap = {
      "subscription.authenticated": "authenticated",
      "subscription.activated": "active",
      "subscription.charged": "active",
      "subscription.pending": "pending",
      "subscription.halted": "halted",
      "subscription.cancelled": "cancelled",
      "subscription.paused": "paused",
      "subscription.resumed": "active",
      "subscription.completed": "completed",
      "payment.failed": "failed",
    };

    let nextStatus = eventStatusMap[eventName] || subEntity?.status || currentRecord.status;

    // Out-of-order protection: do not downgrade active/cancel_pending to authenticated
    if (
      eventName === "subscription.authenticated" &&
      (currentRecord.status === "active" || currentRecord.status === "cancel_pending")
    ) {
      nextStatus = currentRecord.status;
    }

    // If cancellation was scheduled (cancel_pending) and subscription.charged arrives, keep cancel_pending
    if (eventName === "subscription.charged" && currentRecord.status === "cancel_pending") {
      nextStatus = "cancel_pending";
    }

    const currentStart = subEntity?.current_start
      ? new Date(subEntity.current_start * 1000)
      : null;
    const currentEnd = subEntity?.current_end
      ? new Date(subEntity.current_end * 1000)
      : null;
    const paymentId = paymentEntity?.id || subEntity?.payment_id || null;

    await client.query(
      `UPDATE user_subscriptions
       SET status = $1,
           razorpay_payment_id = COALESCE($2, razorpay_payment_id),
           current_start = COALESCE($3, current_start),
           current_end = COALESCE($4, current_end),
           updated_at = now()
       WHERE id = $5`,
      [nextStatus, paymentId, currentStart, currentEnd, currentRecord.id]
    );

    const isPro = ["active", "cancel_pending"].includes(nextStatus) &&
      (!currentEnd || currentEnd > new Date());

    await client.query(
      `UPDATE users SET plan = $1, is_pro = $2 WHERE id = $3`,
      [isPro ? "pro" : "free", isPro, currentRecord.user_id]
    );

    await client.query("COMMIT");
    return res.status(200).json({
      received: true,
      duplicate: false,
      event: eventName,
      status: nextStatus,
      message: "Webhook processed successfully.",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("[Razorpay Webhook Error]:", error.message);
    return res.status(500).json({ error: "Webhook processing failed." });
  } finally {
    if (client) client.release();
  }
}

/**
 * GET /api/billing/entitlements
 * Returns live entitlement snapshot for authenticated user.
 */
async function getEntitlements(req, res) {
  try {
    const { getEntitlementsSnapshot } = require("../utils/entitlements");
    const data = await getEntitlementsSnapshot(req.user.id);
    return res.json({ success: true, entitlements: data });
  } catch (error) {
    console.error("getEntitlements error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to retrieve entitlements." });
  }
}

module.exports = {
  createSubscription,
  verifyCheckout,
  getSubscription,
  cancelSubscription,
  syncSubscription,
  handleWebhook,
  getEntitlements,
  getConfiguredPlan,
  getCredentials,
  createSignature,
  secureEqual,
};
