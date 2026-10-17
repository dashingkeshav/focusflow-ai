/**
 * FocusFlow AI — Entitlements & Subscription Engine
 * Production-ready server-side tier verification, usage tracking, and feature gating.
 *
 * Free users:
 *   - Overview, Goals, Tasks, Focus Sessions, Achievements
 *   - Basic Analytics (7 days history)
 *   - Limited Distraction Log (recent 15 events)
 *   - Limited AI Insights (up to 3 per day)
 *   - Basic Reports & CSV export
 *   - Basic AI Planner (up to 5 daily generations)
 *   - Limited voice (up to 5 daily transcriptions) and file planning (up to 3 daily documents)
 *   - Core focus protection
 *
 * Pro users:
 *   - Everything in Free
 *   - Advanced AI Planner (unlimited reasonable planning)
 *   - Adaptive replanning, What-If simulation, AI task decomposition
 *   - Plan version history & rollback, Recovery planning
 *   - Advanced focus analytics (30d, 90d, all-time, hourly heatmaps)
 *   - Full distraction intelligence & categorization
 *   - AI Focus Intelligence & deep recommendations
 *   - Advanced reports & PDF export
 *   - Calendar intelligence & conflict shield
 */

const { pool } = require("../config/db");

// Only subscriptions with a verified successful charge ("active")
// or an unexpired paid cycle scheduled for cancellation ("cancel_pending") grant Pro access.
// Authorizations ("authenticated"), uncharged subscriptions ("created"), or pending payments NEVER grant Pro.
const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "cancel_pending"];

const PLAN_LIMITS = {
  free: {
    ai_plan_generate: 5,        // 5 real Gemini AI plans per day
    ai_voice_transcribe: 5,     // 5 speech-to-text transcriptions per day
    ai_file_upload: 3,          // 3 file extractions per day
    ai_insights_generate: 3,    // 3 AI insights runs per day
    analytics_days_history: 7,  // 7 days of historical trends
    distraction_log_limit: 15,  // Top 15 recent distraction events
  },
  pro: {
    ai_plan_generate: 200,      // Generous reasonable cap
    ai_voice_transcribe: 200,
    ai_file_upload: 100,
    ai_insights_generate: 100,
    analytics_days_history: 3650, // All-time history
    distraction_log_limit: 1000,
  },
};

const PRO_ONLY_FEATURES = {
  adaptive_replan: {
    key: "adaptive_replan",
    title: "Adaptive Replanning",
    description: "Automatically rebuild your plan when deadlines, workload, or completed work changes.",
  },
  what_if_simulation: {
    key: "what_if_simulation",
    title: "What-If Scenarios",
    description: "Simulate workload shifts, changed exam dates, and study capacity adjustments before applying them.",
  },
  task_decomposition: {
    key: "task_decomposition",
    title: "AI Task Decomposition",
    description: "Intelligently break down complex goals and large study milestones into actionable, timed focus blocks.",
  },
  plan_history: {
    key: "plan_history",
    title: "Plan Version History & Rollback",
    description: "Access and restore previous AI plan versions and inspect changes over time.",
  },
  recovery_plan: {
    key: "recovery_plan",
    title: "Recovery Planning",
    description: "Specialized algorithmic recovery plans to get back on track after missed days or fallen streaks.",
  },
  advanced_analytics: {
    key: "advanced_analytics",
    title: "Advanced Focus Analytics",
    description: "30-day, 90-day, and all-time trends, hourly focus heatmaps, and planned-vs-actual adherence tracking.",
  },
  distraction_intelligence: {
    key: "distraction_intelligence",
    title: "Full Distraction Intelligence",
    description: "Comprehensive distraction logs, domain categorization analytics, and peak distraction hour insights.",
  },
  advanced_reports_pdf: {
    key: "advanced_reports_pdf",
    title: "Advanced Reports & PDF Export",
    description: "Executive PDF summaries, custom date range filtering, and automated AI study pattern reviews.",
  },
  calendar_intelligence: {
    key: "calendar_intelligence",
    title: "Calendar Intelligence & Conflict Shield",
    description: "Smart calendar conflict shield, automated buffer insertion, and adaptive schedule synchronization.",
  },
  multimodal_planning: {
    key: "multimodal_planning",
    title: "Multimodal Planning",
    description: "Plan using speech-to-text voice notes and syllabus documents (PDF, DOCX, TXT, CSV, images).",
  },
  focus_intelligence: {
    key: "focus_intelligence",
    title: "Focus Intelligence",
    description: "Discover evidence-based patterns from your real focus history, including peak productive hours and planned vs. actual adherence.",
  },
  advanced_goals: {
    key: "advanced_goals",
    title: "Advanced Goals & Deadline Risk",
    description: "AI milestone decomposition, deadline-risk analysis, and velocity-based completion forecasts.",
  },
};

/**
 * Get current UTC start of day for daily usage bucketing.
 */
function getDailyPeriodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Determine user subscription plan from DB.
 */
async function getUserPlan(userId) {
  if (!userId) {
    return { plan: "free", isPro: false, subscription: null };
  }

  try {
    const res = await pool.query(
      `SELECT id, plan_key, status, current_start, current_end, razorpay_subscription_id
       FROM user_subscriptions
       WHERE user_id = $1
         AND status = ANY($2::text[])
         AND (current_end IS NULL OR current_end > now())
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, ACTIVE_SUBSCRIPTION_STATUSES]
    );

    if (res.rowCount > 0) {
      const sub = res.rows?.[0];
      return {
        plan: "pro",
        isPro: true,
        subscription: sub
          ? {
              id: sub.id,
              planKey: sub.plan_key,
              status: sub.status,
              currentStart: sub.current_start,
              currentEnd: sub.current_end,
            }
          : null,
      };
    }

    return { plan: "free", isPro: false, subscription: null };
  } catch (error) {
    console.error("getUserPlan lookup error:", error.message);
    return { plan: "free", isPro: false, subscription: null };
  }
}

/**
 * Get tracked usage count for a feature in current daily period.
 */
async function getFeatureUsageCount(userId, featureKey) {
  const periodStart = getDailyPeriodStart();
  try {
    const res = await pool.query(
      `SELECT usage_count
       FROM user_feature_usage
       WHERE user_id = $1 AND feature_key = $2 AND period_start = $3
       LIMIT 1`,
      [userId, featureKey, periodStart]
    );
    return res.rows[0]?.usage_count || 0;
  } catch (error) {
    console.error("getFeatureUsageCount error:", error.message);
    return 0;
  }
}

/**
 * Record and increment usage for a feature.
 */
async function recordFeatureUsage(userId, featureKey, amount = 1) {
  const periodStart = getDailyPeriodStart();
  try {
    const res = await pool.query(
      `INSERT INTO user_feature_usage (user_id, feature_key, period_start, usage_count, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, feature_key, period_start)
       DO UPDATE SET usage_count = user_feature_usage.usage_count + $4, updated_at = now()
       RETURNING usage_count`,
      [userId, featureKey, periodStart, amount]
    );
    return res.rows[0]?.usage_count || amount;
  } catch (error) {
    console.error("recordFeatureUsage error:", error.message);
    return 0;
  }
}

/**
 * Check if user is entitled to perform an action.
 */
async function checkFeatureEntitlement(userId, featureKey) {
  const { plan, isPro, subscription } = await getUserPlan(userId);

  // 1. Pro-only feature check
  if (PRO_ONLY_FEATURES[featureKey] || ((featureKey === "ai_voice_transcribe" || featureKey === "ai_file_upload") && !isPro)) {
    if (!isPro) {
      const targetKey = (featureKey === "ai_voice_transcribe" || featureKey === "ai_file_upload") ? "multimodal_planning" : featureKey;
      const meta = PRO_ONLY_FEATURES[targetKey] || {
        title: "Pro Feature",
        description: "This advanced capability requires FocusFlow Pro.",
      };
      return {
        allowed: false,
        code: "UPGRADE_REQUIRED",
        plan,
        isPro: false,
        feature: targetKey,
        title: meta.title,
        description: meta.description,
        message: `${meta.title} requires an active FocusFlow Pro subscription. View plans at /pricing.`,
        upgradeUrl: "/pricing",
      };
    }
    return {
      allowed: true,
      plan,
      isPro: true,
      feature: featureKey,
    };
  }

  // 2. Usage limited feature check
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  if (limits[featureKey] !== undefined) {
    const maxLimit = limits[featureKey];
    const used = await getFeatureUsageCount(userId, featureKey);
    const periodStart = getDailyPeriodStart();
    const tomorrow = new Date(periodStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    if (used >= maxLimit) {
      return {
        allowed: false,
        code: "USAGE_LIMIT_EXCEEDED",
        plan,
        isPro,
        feature: featureKey,
        limit: maxLimit,
        used,
        remaining: 0,
        resetAt: tomorrow.toISOString(),
        message: isPro
          ? `You have reached the reasonable safety limit for ${featureKey} today. Please wait until tomorrow.`
          : `You've reached your Free daily limit of ${maxLimit} for this feature. Upgrade to FocusFlow Pro for unlimited access.`,
        upgradeUrl: "/pricing",
      };
    }

    return {
      allowed: true,
      plan,
      isPro,
      feature: featureKey,
      limit: maxLimit,
      used,
      remaining: Math.max(0, maxLimit - used),
      resetAt: tomorrow.toISOString(),
    };
  }

  // Default allowed for core features
  return {
    allowed: true,
    plan,
    isPro,
    feature: featureKey,
  };
}

/**
 * Get comprehensive entitlement snapshot for client UI.
 */
async function getEntitlementsSnapshot(userId) {
  const { plan, isPro, subscription } = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const [planGenUsed, voiceUsed, fileUsed, insightsUsed] = await Promise.all([
    getFeatureUsageCount(userId, "ai_plan_generate"),
    getFeatureUsageCount(userId, "ai_voice_transcribe"),
    getFeatureUsageCount(userId, "ai_file_upload"),
    getFeatureUsageCount(userId, "ai_insights_generate"),
  ]);

  const periodStart = getDailyPeriodStart();
  const resetAt = new Date(periodStart);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);

  return {
    plan,
    tier: plan,
    isPro,
    subscription,
    limits: {
      aiPlanGenerations: {
        limit: limits.ai_plan_generate,
        used: planGenUsed,
        remaining: Math.max(0, limits.ai_plan_generate - planGenUsed),
        period: "daily",
      },
      voiceTranscriptions: {
        limit: limits.ai_voice_transcribe,
        used: voiceUsed,
        remaining: Math.max(0, limits.ai_voice_transcribe - voiceUsed),
        period: "daily",
      },
      fileUploads: {
        limit: limits.ai_file_upload,
        used: fileUsed,
        remaining: Math.max(0, limits.ai_file_upload - fileUsed),
        period: "daily",
      },
      aiInsights: {
        limit: limits.ai_insights_generate,
        used: insightsUsed,
        remaining: Math.max(0, limits.ai_insights_generate - insightsUsed),
        period: "daily",
      },
      analyticsDaysHistory: limits.analytics_days_history,
      distractionLogLimit: limits.distraction_log_limit,
    },
    features: {
      adaptiveReplanning: isPro,
      whatIfScenarios: isPro,
      taskDecomposition: isPro,
      planHistory: isPro,
      recoveryPlan: isPro,
      advancedAnalytics: isPro,
      fullDistractionIntelligence: isPro,
      advancedReportsPdf: isPro,
      calendarIntelligence: isPro,
      multimodalPlanning: isPro,
      focusIntelligence: isPro,
      advancedGoals: isPro,
    },
    collaboration: getCollaborationLimits(plan),
    meta: PRO_ONLY_FEATURES,
    resetAt: resetAt.toISOString(),
  };
}

/**
 * Express Middleware: Gate access by feature key.
 */
function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }

      const entitlement = await checkFeatureEntitlement(userId, featureKey);
      if (!entitlement.allowed) {
        const status = entitlement.code === "USAGE_LIMIT_EXCEEDED" ? 429 : 403;
        return res.status(status).json({
          success: false,
          code: entitlement.code,
          feature: featureKey,
          title: entitlement.title || PRO_ONLY_FEATURES[featureKey]?.title || "Pro Feature",
          description: entitlement.description || PRO_ONLY_FEATURES[featureKey]?.description,
          limit: entitlement.limit,
          used: entitlement.used,
          resetAt: entitlement.resetAt,
          message: entitlement.message,
          upgradeUrl: entitlement.upgradeUrl || "/pricing",
        });
      }

      req.entitlement = entitlement;
      return next();
    } catch (error) {
      console.error(`Entitlement check failed for ${featureKey}:`, error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to verify your account entitlement right now.",
      });
    }
  };
}

/*
=====================================================
COLLABORATION SUITE ENTITLEMENTS & LIMITS
=====================================================
*/

const COLLABORATION_LIMITS = {
  free: {
    focus_rooms_max_participants: 4,
    focus_circles_max_owned: 1,
    focus_circles_max_members: 4,
    project_pods_max_active_owned: 1,
    project_pods_max_members: 3,
    unblock_exchange_7d_limit: 3,
  },
  pro: {
    focus_rooms_max_participants: 12,
    focus_circles_max_owned: 10,
    focus_circles_max_members: 12,
    project_pods_max_active_owned: 10,
    project_pods_max_members: 10,
    unblock_exchange_7d_limit: 20,
  },
};

function getCollaborationLimits(plan) {
  const key = plan === "pro" ? "pro" : "free";
  return COLLABORATION_LIMITS[key];
}

async function checkRoomHostingLimit(userId, requestedParticipants = 4) {
  const { plan, isPro } = await getUserPlan(userId);
  const limits = getCollaborationLimits(plan);
  const maxAllowed = limits.focus_rooms_max_participants;
  const numReq = Number(requestedParticipants) || 4;

  if (numReq > maxAllowed) {
    return {
      allowed: false,
      limit: maxAllowed,
      requested: numReq,
      plan,
      isPro,
      message: isPro
        ? `Focus Rooms are limited to ${maxAllowed} participants maximum.`
        : `Free plan supports hosting rooms with up to ${maxAllowed} participants. Upgrade to Pro to host up to 12 participants.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true, limit: maxAllowed, plan, isPro };
}

async function checkCircleCreationLimit(userId) {
  const { plan, isPro } = await getUserPlan(userId);
  const limits = getCollaborationLimits(plan);

  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM focus_circles
     WHERE owner_user_id = $1 AND status = 'active'`,
    [userId]
  );
  const current = res.rows[0]?.count || 0;

  if (current >= limits.focus_circles_max_owned) {
    return {
      allowed: false,
      current,
      limit: limits.focus_circles_max_owned,
      plan,
      isPro,
      message: isPro
        ? `You have reached the maximum limit of ${limits.focus_circles_max_owned} active Focus Circles.`
        : `Free users can own 1 Focus Circle. Upgrade to Pro to create and lead up to 10 Focus Circles.`,
      upgradeUrl: "/pricing",
    };
  }

  return {
    allowed: true,
    current,
    limit: limits.focus_circles_max_owned,
    maxMembers: limits.focus_circles_max_members,
    plan,
    isPro,
  };
}

async function checkCircleMemberCapacity(circleOwnerId, currentMemberCount) {
  const { plan, isPro } = await getUserPlan(circleOwnerId);
  const limits = getCollaborationLimits(plan);

  if (currentMemberCount >= limits.focus_circles_max_members) {
    return {
      allowed: false,
      current: currentMemberCount,
      limit: limits.focus_circles_max_members,
      ownerPlan: plan,
      message: `This Focus Circle is at maximum capacity (${limits.focus_circles_max_members} members).`,
    };
  }

  return {
    allowed: true,
    current: currentMemberCount,
    limit: limits.focus_circles_max_members,
    ownerPlan: plan,
  };
}

async function checkPodCreationLimit(userId) {
  const { plan, isPro } = await getUserPlan(userId);
  const limits = getCollaborationLimits(plan);

  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM project_pods
     WHERE owner_user_id = $1 AND status = 'active'`,
    [userId]
  );
  const current = res.rows[0]?.count || 0;

  if (current >= limits.project_pods_max_active_owned) {
    return {
      allowed: false,
      current,
      limit: limits.project_pods_max_active_owned,
      plan,
      isPro,
      message: isPro
        ? `You have reached the limit of ${limits.project_pods_max_active_owned} active Project Pods.`
        : `Free users can own 1 active Project Pod. Upgrade to Pro to create up to 10 Project Pods.`,
      upgradeUrl: "/pricing",
    };
  }

  return {
    allowed: true,
    current,
    limit: limits.project_pods_max_active_owned,
    maxMembers: limits.project_pods_max_members,
    plan,
    isPro,
  };
}

async function checkPodMemberCapacity(podOwnerId, currentMemberCount) {
  const { plan, isPro } = await getUserPlan(podOwnerId);
  const limits = getCollaborationLimits(plan);

  if (currentMemberCount >= limits.project_pods_max_members) {
    return {
      allowed: false,
      current: currentMemberCount,
      limit: limits.project_pods_max_members,
      ownerPlan: plan,
      message: `This Project Pod is at maximum capacity (${limits.project_pods_max_members} members).`,
    };
  }

  return {
    allowed: true,
    current: currentMemberCount,
    limit: limits.project_pods_max_members,
    ownerPlan: plan,
  };
}

async function checkUnblockRequestLimit(userId) {
  const { plan, isPro } = await getUserPlan(userId);
  const limits = getCollaborationLimits(plan);

  const res = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM unblock_requests
     WHERE requester_user_id = $1
       AND created_at >= (now() - interval '7 days')`,
    [userId]
  );
  const current = res.rows[0]?.count || 0;

  if (current >= limits.unblock_exchange_7d_limit) {
    return {
      allowed: false,
      current,
      limit: limits.unblock_exchange_7d_limit,
      plan,
      isPro,
      message: isPro
        ? `You have reached the limit of ${limits.unblock_exchange_7d_limit} Unblock requests in a 7-day period.`
        : `Free users can post up to 3 Unblock requests per 7-day window. Upgrade to Pro for up to 20 requests.`,
      upgradeUrl: "/pricing",
    };
  }

  return {
    allowed: true,
    current,
    limit: limits.unblock_exchange_7d_limit,
    plan,
    isPro,
  };
}

module.exports = {
  PLAN_LIMITS,
  PRO_ONLY_FEATURES,
  COLLABORATION_LIMITS,
  getCollaborationLimits,
  getUserPlan,
  getFeatureUsageCount,
  recordFeatureUsage,
  checkFeatureEntitlement,
  getEntitlementsSnapshot,
  requireFeature,
  checkRoomHostingLimit,
  checkCircleCreationLimit,
  checkCircleMemberCapacity,
  checkPodCreationLimit,
  checkPodMemberCapacity,
  checkUnblockRequestLimit,
};
