const { pool } = require("../config/db");
const AuthEvent = require("../models/ActivityEvent");
const Session = require("../models/Session");

function classifyDistraction(event) {
  const type = event.eventType;
  if (type === "site_blocked") return { category: "Blocked", severity: "high" };
  if (type === "site_warning") return { category: "Warning", severity: "high" };
  if (type === "distraction_detected") return { category: "Distraction", severity: "medium" };
  if (type === "idle_detected") return { category: "Idle", severity: "low" };
  if (type === "camera_absent") return { category: "Look-Aside", severity: "medium" };
  if (type === "camera_multiple") return { category: "Look-Aside", severity: "medium" };
  return { category: type, severity: "low" };
}

function safeDate(value) {
  if (!value) return new Date(0);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

async function eventSessions(userId, sessionIds) {
  if (!sessionIds.length) return {};
  // Parameterized query — never interpolate raw values into SQL.
  const placeholders = sessionIds.map((_, i) => `$${i + 2}`).join(",");
  const rows = await pool.query(
    `SELECT id, title, start_time FROM sessions WHERE id = ANY(ARRAY[${placeholders}]::uuid[]) AND user_id = $1`,
    [userId, ...sessionIds]
  );
  const map = {};
  for (const r of rows.rows) map[r.id] = { title: r.title, start_time: r.start_time };
  return map;
}

exports.getDistractionLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { getUserPlan } = require("../utils/entitlements");
    const { isPro, plan } = await getUserPlan(userId);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const limit = isPro ? requestedLimit : Math.min(requestedLimit, 15);
    const offset = (page - 1) * limit;

    if (!isPro && page > 1) {
      return res.json({
        success: true,
        total: 15,
        page,
        perPage: limit,
        events: [],
        isPro: false,
        requiresUpgradeToPage: true,
      });
    }

    // Accepted filter keys map to real event types. "warning" covers the
    // site_warning / distraction_detected family, matching the UI filter tabs.
    const FILTER_MAP = {
      blocked: ["site_blocked"],
      warning: ["site_warning", "distraction_detected"],
      distraction: ["distraction_detected"],
      idle: ["idle_detected"],
      camera: ["camera_absent", "camera_multiple"],
    };
    const requestedType = req.query.type;
    const filterTypes =
      requestedType && FILTER_MAP[requestedType] ? FILTER_MAP[requestedType] : null;

    // $1 = userId, $2.. = IN list, then filter values, then limit/offset.
    const baseTypes = [
      "site_warning",
      "distraction_detected",
      "site_blocked",
      "idle_detected",
      "camera_absent",
      "camera_multiple",
    ];
    const typeList = baseTypes.map((_, i) => `$${i + 2}`).join(", ");
    const params = [userId, ...baseTypes];
    let pIdx = params.length + 1;
    let filterClause = "";
    if (filterTypes) {
      const filterPlaceholders = filterTypes.map((t) => {
        params.push(t);
        return `$${pIdx++}`;
      });
      filterClause = ` AND event_type IN (${filterPlaceholders.join(", ")})`;
    }
    const limitParam = `$${pIdx++}`;
    const offsetParam = `$${pIdx++}`;
    params.push(limit, offset);

    const totalRows = await pool.query(
      `SELECT COUNT(*)::int AS c FROM activity_events
       WHERE user_id = $1 AND event_type IN (${typeList})${filterClause}`,
      params.slice(0, params.length - 2)
    );

    const events = await pool.query(
      `SELECT id, event_type, domain, reason, classification, action_taken, from_domain, confidence, timestamp, session_id, warning_number
       FROM activity_events
       WHERE user_id = $1 AND event_type IN (${typeList})${filterClause}
       ORDER BY timestamp DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    const sessionIds = events.rows.map((e) => e.session_id).filter(Boolean);
    const sessionMap = await eventSessions(userId, sessionIds);

    const rows = events.rows.map((e) => {
      const cls = classifyDistraction(e);
      const session = sessionMap[e.session_id];
      return {
        id: e.id,
        type: e.event_type,
        category: cls.category,
        severity: cls.severity,
        domain: e.domain || null,
        reason: e.reason || null,
        classification: e.classification || null,
        action: e.action_taken || "logged",
        fromDomain: e.from_domain || null,
        confidence: e.confidence == null ? null : Number(e.confidence),
        warningNumber: e.warning_number == null ? null : Number(e.warning_number),
        timestamp: safeDate(e.timestamp).toISOString(),
        occurredAt: safeDate(e.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        session: session
          ? { id: e.session_id, title: session.title, startedAt: session.start_time }
          : null,
      };
    });

    return res.json({
      success: true,
      total: totalRows.rows[0].c,
      page,
      perPage: limit,
      events: rows,
    });
  } catch (err) {
    console.error("getDistractionLog error:", err);
    return res.status(500).json({ success: false, message: "Failed to load distraction log." });
  }
};

exports.getDistractionStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE event_type = 'site_blocked')::int AS blocked_attempts,
        COUNT(*) FILTER (WHERE event_type = 'site_warning')::int AS warnings,
        COUNT(*) FILTER (WHERE event_type = 'distraction_detected')::int AS distractions,
        COUNT(*) FILTER (WHERE event_type IN ('idle_detected'))::int AS idle_events,
        COUNT(*) FILTER (WHERE event_type IN ('camera_absent','camera_multiple'))::int AS camera_events,
        COUNT(*) FILTER (WHERE event_type = 'tab_switched')::int AS tab_switches
       FROM activity_events WHERE user_id = $1`,
      [userId]
    );
    const r = rows.rows[0];
    return res.json({
      success: true,
      stats: {
        blockedAttempts: Number(r.blocked_attempts || 0),
        warnings: Number(r.warnings || 0),
        distractions: Number(r.distractions || 0),
        idleEvents: Number(r.idle_events || 0),
        cameraEvents: Number(r.camera_events || 0),
        tabSwitches: Number(r.tab_switches || 0),
        totalEvents:
          Number(r.blocked_attempts || 0) +
          Number(r.warnings || 0) +
          Number(r.distractions || 0) +
          Number(r.idle_events || 0) +
          Number(r.camera_events || 0) +
          Number(r.tab_switches || 0),
      },
    });
  } catch (err) {
    console.error("getDistractionStats error:", err);
    return res.status(500).json({ success: false, message: "Failed to load distraction stats." });
  }
};
