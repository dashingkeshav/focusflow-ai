const { getUserPlan } = require("../utils/entitlements");

async function requireStudentPro(req, res, next) {
  try {
    const { isPro } = await getUserPlan(req.user?.id);

    if (!isPro) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: "This feature requires an active FocusFlow Pro subscription. View plans at /pricing.",
        upgradeUrl: "/pricing",
      });
    }

    return next();
  } catch (error) {
    console.error("FocusFlow Pro entitlement check failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your subscription right now.",
    });
  }
}

// Entitlement that still protects the DATA (404 instead of 403): used by the
// focus session routes so that a non-subscribed user probing another user's
// session id learns nothing about its existence, while their own account
// still works for reading state. Their own start/end remain Pro-gated above
// via the normal middleware chain.
async function requireStudentProStealth(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT 1
       FROM user_subscriptions
       WHERE user_id = $1
         AND status IN ('active', 'cancel_pending')
         AND (current_end IS NULL OR current_end > now())
       LIMIT 1`,
      [req.user.id],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Session not found or does not belong to you.",
      });
    }

    return next();
  } catch (error) {
    console.error("FocusFlow Pro entitlement check failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your subscription right now.",
    });
  }
}

module.exports = requireStudentPro;
module.exports.requireStudentProStealth = requireStudentProStealth;
