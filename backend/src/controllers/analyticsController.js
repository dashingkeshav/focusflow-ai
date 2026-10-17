const bcrypt = require("bcryptjs");

const { pool } = require("../config/db");

const User = require("../models/User");

const {
  validateEmail,
  sanitizeEmail,
  getPasswordErrors,
} = require("../utils/validation");
const { getUserPlan } = require("../utils/entitlements");


// =====================================================
// DASHBOARD STATS
// GET /api/analytics/dashboard
// =====================================================

exports.getDashboardStats = async (req, res) => {
  try {

    const userId = req.user.id;
    const { isPro } = await getUserPlan(userId);

    const sessionsResult =
      await pool.query(
        `
        SELECT
          id,
          title,
          start_time,
          end_time,
          duration_seconds,
          COALESCE(planned_duration_seconds, duration_seconds) AS planned_duration_seconds,
          avg_focus_score,
          final_focus_score,
          tab_switches,
          idle_time_seconds,
          camera_distractions,
          warning_count,
          blocked_attempts,
          distraction_events,
          status
        FROM sessions
        WHERE user_id = $1
          AND status = 'completed'
        ORDER BY start_time DESC
        `,
        [userId]
      );


    const sessions =
      sessionsResult.rows;


    const now = new Date();

    const startOfToday =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );


    const totalStudySeconds =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.duration_seconds || 0
          ),
        0
      );


    const todaySessions =
      sessions.filter(
        (session) =>
          new Date(
            session.start_time
          ) >= startOfToday
      );


    const todayStudySeconds =
      todaySessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.duration_seconds || 0
          ),
        0
      );


    const totalWarnings =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.warning_count || 0
          ),
        0
      );


    const totalBlocked =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.blocked_attempts || 0
          ),
        0
      );


    const totalCameraDistractions =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.camera_distractions || 0
          ),
        0
      );


    const totalTabSwitches =
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(
            session.tab_switches || 0
          ),
        0
      );


    // Only sessions with REAL measured scores contribute to score
    // aggregates — sessions without telemetry are excluded, never treated
    // as 0 or 100.
    const scoredSessions =
      sessions.filter(
        (session) =>
          session.avg_focus_score != null
      );


    const avgFocusScore =
      scoredSessions.length
        ? Math.round(
            scoredSessions.reduce(
              (sum, session) =>
                sum +
                Number(
                  session.avg_focus_score
                ),
              0
            ) / scoredSessions.length
          )
        : null;


    const bestFocusScore =
      scoredSessions.length
        ? Math.max(
            ...scoredSessions.map(
              (session) =>
                Number(
                  session.avg_focus_score
                )
            )
          )
        : null;


    // =================================================
    // STREAK
    // =================================================

    const sessionDays =
      new Set(
        sessions.map(
          (session) =>
            new Date(
              session.start_time
            )
              .toISOString()
              .slice(0, 10)
        )
      );


    let streakDays = 0;

    const currentDay =
      new Date(startOfToday);


    while (
      sessionDays.has(
        currentDay
          .toISOString()
          .slice(0, 10)
      )
    ) {

      streakDays++;

      currentDay.setDate(
        currentDay.getDate() - 1
      );
    }


    // =================================================
    // WEEKLY DATA
    // =================================================

    const weeklyData = [];

    for (let i = 6; i >= 0; i--) {

      const dayStart =
        new Date(startOfToday);

      dayStart.setDate(
        dayStart.getDate() - i
      );

      const dayEnd =
        new Date(dayStart);

      dayEnd.setDate(
        dayEnd.getDate() + 1
      );


      const daySessions =
        sessions.filter(
          (session) => {

            const date =
              new Date(
                session.start_time
              );

            return (
              date >= dayStart &&
              date < dayEnd
            );
          }
        );


      const daySeconds =
        daySessions.reduce(
          (sum, session) =>
            sum +
            Number(
              session.duration_seconds || 0
            ),
          0
        );      const dayScored =
        daySessions.filter(
          (session) =>
            session.avg_focus_score != null
        );


      const dayScore =
          dayScored.length
          ? Math.round(
              dayScored.reduce(
                (sum, session) =>
                  sum +
                  Number(
                    session.avg_focus_score
                  ),
                0
              ) /
              dayScored.length
            )
          : 0;


      const dayCamera =
        daySessions.reduce(
          (sum, session) =>
            sum +
            Number(
              session.camera_distractions || 0
            ),
          0
        );


      const dayTabs =
        daySessions.reduce(
          (sum, session) =>
            sum +
            Number(
              session.tab_switches || 0
            ),
          0
        );


      const dayIdle =
        Math.round(
          daySessions.reduce(
            (sum, session) =>
              sum +
              Number(
                session.idle_time_seconds || 0
              ),
            0
          ) / 60
        );


      weeklyData.push({
        day:
          dayStart.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            }
          ),

        hours:
          Number(
            (daySeconds / 3600)
              .toFixed(1)
          ),

        score:
          dayScore,

        cameraEvents:
          dayCamera,

        tabViolations:
          dayTabs,

        idleTime:
          dayIdle,
      });
    }


    // =================================================
    // RECENT TIMELINE
    // =================================================

    const recentTimeline =
      sessions
        .slice(0, 10)
        .map((session) => ({
          time:
            new Date(
              session.start_time
            ).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }
            ),

          // Real per-session score — null ("Not available") when the
          // session collected no telemetry.
          score:
            session.avg_focus_score == null
              ? null
              : Number(
                  session.avg_focus_score
                ),

          camera:
            Number(
              session.camera_distractions || 0
            ),

          tabSwitch:
            Number(
              session.tab_switches || 0
            ),
        }));


    // =================================================
    // DISTRACTION BREAKDOWN
    // =================================================

    const totalDistractionEvents =
      totalCameraDistractions +
      totalTabSwitches +
      totalWarnings;


    const distractionBreakdown =
      totalDistractionEvents > 0
        ? [
            {
              name:
                "Camera Look-Away",

              value:
                Math.round(
                  (
                    totalCameraDistractions /
                    totalDistractionEvents
                  ) * 100
                ),

              color:
                "#06b6d4",
            },

            {
              name:
                "Tab Switches",

              value:
                Math.round(
                  (
                    totalTabSwitches /
                    totalDistractionEvents
                  ) * 100
                ),

              color:
                "#f43f5e",
            },

            {
              name:
                "Warnings Issued",

              value:
                Math.round(
                  (
                    totalWarnings /
                    totalDistractionEvents
                  ) * 100
                ),

              color:
                "#f59e0b",
            },
          ]
        : [];

    // Focus Intelligence computations (real database metrics only)
    const totalPlannedSeconds = sessions.reduce(
      (sum, s) => sum + Number(s.planned_duration_seconds || s.duration_seconds || 0),
      0
    );
    const adherencePercent =
      totalPlannedSeconds > 0
        ? Math.min(100, Math.round((totalStudySeconds / totalPlannedSeconds) * 100))
        : 100;

    const hourlyMap = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h}:00`,
      scoreSum: 0,
      scoreCount: 0,
      sessionCount: 0,
      studySeconds: 0,
    }));

    const durationBuckets = {
      short: { label: "Under 20m", scoreSum: 0, count: 0 },
      pomodoro: { label: "20-35m", scoreSum: 0, count: 0 },
      deep: { label: "35-50m", scoreSum: 0, count: 0 },
      extended: { label: "50m+", scoreSum: 0, count: 0 },
    };

    for (const s of sessions) {
      const start = new Date(s.start_time);
      const h = start.getHours();
      if (h >= 0 && h < 24) {
        hourlyMap[h].sessionCount += 1;
        hourlyMap[h].studySeconds += Number(s.duration_seconds || 0);
        if (s.avg_focus_score != null) {
          hourlyMap[h].scoreSum += Number(s.avg_focus_score);
          hourlyMap[h].scoreCount += 1;
        }
      }

      if (s.avg_focus_score != null) {
        const mins = Number(s.duration_seconds || 0) / 60;
        const bucket = mins < 20 ? "short" : mins < 35 ? "pomodoro" : mins < 50 ? "deep" : "extended";
        durationBuckets[bucket].scoreSum += Number(s.avg_focus_score);
        durationBuckets[bucket].count += 1;
      }
    }

    const hourlyProductivity = hourlyMap.map((h) => ({
      hour: h.hour,
      label: h.label,
      avgScore: h.scoreCount > 0 ? Math.round(h.scoreSum / h.scoreCount) : null,
      sessionCount: h.sessionCount,
      studyMinutes: Math.round(h.studySeconds / 60),
    }));

    // Find peak window
    const windowScores = {
      Morning: { scoreSum: 0, count: 0, label: "Morning (8 AM – 12 PM)" },
      Afternoon: { scoreSum: 0, count: 0, label: "Afternoon (12 PM – 5 PM)" },
      Evening: { scoreSum: 0, count: 0, label: "Evening (5 PM – 9 PM)" },
      Night: { scoreSum: 0, count: 0, label: "Night (9 PM – 8 AM)" },
    };
    for (const h of hourlyMap) {
      if (h.scoreCount > 0) {
        const win = h.hour >= 8 && h.hour < 12 ? "Morning" : h.hour >= 12 && h.hour < 17 ? "Afternoon" : h.hour >= 17 && h.hour < 21 ? "Evening" : "Night";
        windowScores[win].scoreSum += h.scoreSum;
        windowScores[win].count += h.scoreCount;
      }
    }
    const rankedWindows = Object.entries(windowScores)
      .filter(([, v]) => v.count > 0)
      .map(([k, v]) => ({ window: k, label: v.label, avgScore: Math.round(v.scoreSum / v.count), count: v.count }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const bestDuration = Object.entries(durationBuckets)
      .filter(([, v]) => v.count > 0)
      .map(([k, v]) => ({ key: k, label: v.label, avgScore: Math.round(v.scoreSum / v.count), count: v.count }))
      .sort((a, b) => b.avgScore - a.avgScore)[0];

    const hasSufficientTelemetry = scoredSessions.length >= 3;
    const focusIntelligence = isPro ? {
      hasSufficientData: hasSufficientTelemetry,
      sessionCount: sessions.length,
      scoredSessionCount: scoredSessions.length,
      plannedVsActual: {
        totalPlannedSeconds,
        totalPlannedMinutes: Math.round(totalPlannedSeconds / 60),
        totalActualSeconds: totalStudySeconds,
        totalActualMinutes: Math.round(totalStudySeconds / 60),
        adherencePercent,
      },
      hourlyProductivity,
      peakWindow: rankedWindows[0] || null,
      recommendations: hasSufficientTelemetry && bestDuration ? {
        optimalBlockDuration: bestDuration.label,
        optimalBlockAvgScore: bestDuration.avgScore,
        optimalTimeWindow: rankedWindows[0]?.label || "Morning (8 AM – 12 PM)",
        evidence: `Based on ${scoredSessions.length} sessions with verified telemetry, your highest focus scores (${bestDuration.avgScore}/100) occur during ${bestDuration.label} blocks.`,
      } : {
        optimalBlockDuration: "Not available",
        optimalBlockAvgScore: null,
        optimalTimeWindow: "Not available",
        evidence: `Requires at least 3 completed focus sessions with telemetry (currently ${scoredSessions.length}).`,
      },
    } : null;

    return res.json({

      success: true,

      stats: {
        avgFocusScore,
        bestFocusScore,
        totalStudySeconds,
        todayStudySeconds,
        totalSessions:
          sessions.length,
        totalWarnings,
        totalBlocked,
        totalCameraDistractions,
        totalTabSwitches,
        streakDays,
        weeklyData,
        recentTimeline,
        distractionBreakdown,
        focusIntelligence,
        idleTimeMinutes:
          Math.round(totalStudySeconds / 60),
        realSessions:
          sessions.map((s) => ({
            id: s.id,
            title: s.title,
            startTime: s.start_time,
            endTime: s.end_time,
            durationSeconds: s.duration_seconds,
            plannedDurationSeconds: s.planned_duration_seconds,
            avgFocusScore:
              s.avg_focus_score == null
                ? null
                : Number(s.avg_focus_score),
            status: s.status,
            tabSwitches: Number(s.tab_switches || 0),
            idleTimeSeconds: Number(s.idle_time_seconds || 0),
            cameraDistractions: Number(s.camera_distractions || 0),
            warnings: Number(s.warning_count || 0),
            blockedAttempts: Number(s.blocked_attempts || 0),
          })),
        recentSessions:
          sessions.slice(0, 5),
      },
    });


  } catch (error) {

    console.error(
      "getDashboardStats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load dashboard statistics.",
    });
  }
};


// =====================================================
// GET CURRENT USER
// GET /api/analytics/me
// =====================================================

exports.getMe = async (req, res) => {
  try {

    const user =
      await User.findById(
        req.user.id
      );


    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }


    const { getUserPlan } = require("../utils/entitlements");
    const { plan, isPro } = await getUserPlan(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.name.slice(0, 2).toUpperCase(),
        dailyGoalHours: user.dailyGoalHours,
        streakDays: user.streakDays,
        createdAt: user.createdAt,
        plan,
        isPro,
      },
    });


  } catch (error) {

    console.error(
      "getMe error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load profile.",
    });
  }
};


// =====================================================
// UPDATE CURRENT USER
// PUT /api/analytics/me
// =====================================================

exports.updateMe = async (req, res) => {
  try {

    const userId =
      req.user.id;


    const {
      name,
      email,
      currentPassword,
      newPassword,
    } = req.body;


    const user =
      await User.findById(
        userId
      );


    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }


    if (
      name &&
      name.trim().length >= 2
    ) {

      user.name =
        name.trim();
    }


    if (email) {

      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid email address",
        });
      }


      const sanitizedEmail =
        sanitizeEmail(email);


      const existing =
        await User.findOne({
          email: sanitizedEmail,
        });


      if (
        existing &&
        existing.id !== userId
      ) {

        return res.status(409).json({
          success: false,
          message:
            "Email already in use by another account",
        });
      }


      user.email =
        sanitizedEmail;
    }


    if (newPassword) {

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Current password is required to set a new password",
        });
      }


      const passwordValid =
        await bcrypt.compare(
          currentPassword,
          user.password
        );


      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect",
        });
      }


      const errors =
        getPasswordErrors(
          newPassword
        );


      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: errors[0],
        });
      }


      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );
    }


    await user.save();


    return res.json({

      success: true,

      message:
        "Profile updated successfully",

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        initials:
          user.name
            .slice(0, 2)
            .toUpperCase(),

        dailyGoalHours:
          user.dailyGoalHours,

        streakDays:
          user.streakDays,
      },
    });


  } catch (error) {

    console.error(
      "updateMe error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update profile.",
    });
  }
};

// ====================================================
// DATE-RANGE REPORT (real aggregations)
// GET /api/analytics/report?start=YYYY-MM-DD&end=YYYY-MM-DD
// ====================================================

exports.getDateRangeReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const startParam = String(req.query.start || "").slice(0, 10);
    const endParam = String(req.query.end || "").slice(0, 10);

    if (!startParam || !endParam) {
      return res.status(400).json({
        success: false,
        message:
          "start and end dates are required (YYYY-MM-DD).",
      });
    }

    const startDate = new Date(startParam + "T00:00:00.000Z");
    const endDate = new Date(endParam + "T23:59:59.999Z");

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return res.status(400).json({
        success: false,
        message:
          "start and end must be valid, non-empty dates with end >= start.",
      });
    }

    const { getUserPlan } = require("../utils/entitlements");
    const { isPro } = await getUserPlan(userId);
    const daySpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (!isPro && daySpan > 8) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        feature: "advanced_reports_pdf",
        title: "Extended Reports & Custom Date Ranges",
        description: "Reports spanning beyond 7 days and custom historical analysis require FocusFlow Pro.",
        message: "Date ranges greater than 7 days require a FocusFlow Pro subscription. Upgrade to unlock full date range reports and PDF export.",
        upgradeUrl: "/pricing",
      });
    }

    const sessions = await pool.query(
      `
      SELECT
        id,
        title,
        start_time,
        end_time,
        duration_seconds,
        avg_focus_score,
        tab_switches,
        idle_time_seconds,
        camera_distractions,
        warning_count,
        blocked_attempts,
        status
      FROM sessions
      WHERE user_id = $1
        AND start_time >= $2
        AND start_time <= $3
      ORDER BY start_time ASC
      `,
      [userId, startDate, endDate]
    );

    let totalSeconds = 0;
    let totalTabSwitches = 0;
    let totalIdleSeconds = 0;
    let totalCamera = 0;
    let totalWarnings = 0;
    let totalBlocked = 0;

    let scoredSeconds = 0;
    let scoredSum = 0;
    let scoredCount = 0;

    const byDay = {};

    for (const r of sessions.rows) {
      const seconds = Number(r.duration_seconds || 0);
      totalSeconds += seconds;
      totalTabSwitches += Number(r.tab_switches || 0);
      totalIdleSeconds += Number(r.idle_time_seconds || 0);
      totalCamera += Number(r.camera_distractions || 0);
      totalWarnings += Number(r.warning_count || 0);
      totalBlocked += Number(r.blocked_attempts || 0);

      if (r.avg_focus_score != null) {
        scoredSeconds += seconds;
        scoredSum += Number(r.avg_focus_score);
        scoredCount += 1;
      }

      const day = safeToISO10(new Date(r.start_time));
      const bucket = (byDay[day] = byDay[day] || {
        seconds: 0,
        scoredSum: 0,
        scoredCount: 0,
        tabSwitches: 0,
        idleSeconds: 0,
        camera: 0,
        warnings: 0,
        blocked: 0,
      });
      bucket.seconds += seconds;
      if (r.avg_focus_score != null) {
        bucket.scoredSum += Number(r.avg_focus_score);
        bucket.scoredCount += 1;
      }
      bucket.tabSwitches += Number(r.tab_switches || 0);
      bucket.idleSeconds += Number(r.idle_time_seconds || 0);
      bucket.camera += Number(r.camera_distractions || 0);
      bucket.warnings += Number(r.warning_count || 0);
      bucket.blocked += Number(r.blocked_attempts || 0);
    }

    const stats = {
      dateRange: {
        start: startParam,
        end: endParam,
        sessionCount: rows.length,
      },
      totalStudySeconds: totalSeconds,
      totalTabSwitches,
      totalIdleSeconds,
      totalCameraDistractions: totalCamera,
      totalWarnings,
      totalBlocked,
      avgFocusScore:
        scoredCount > 0
          ? Math.round(scoredSum / scoredCount)
          : null,
      totalEvents:
        totalTabSwitches +
        totalWarnings +
        totalCamera,
      weeklyData: Object.keys(byDay)
        .sort()
        .map((day) => {
          const b = byDay[day];
          return {
            day,
            hours: Number((b.seconds / 3600).toFixed(1)),
            score:
              b.scoredCount > 0
                ? Math.round(b.scoredSum / b.scoredCount)
                : null,
            cameraEvents: b.camera,
            tabViolations: b.tabSwitches,
            idleTime: Math.round(b.idleSeconds / 60),
          };
        }),
      sessions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        startedAt: r.start_time,
        durationSeconds: r.duration_seconds,
        avgFocusScore:
          r.avg_focus_score == null
            ? null
            : Number(r.avg_focus_score),
        status: r.status,
      })),
    };

    return res.json({ success: true, stats });
  } catch (error) {
    console.error("getDateRangeReport error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to load report.",
    });
  }
};

function safeToISO10(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// =====================================================
// PERSONAL WEEKLY FOCUS REVIEW
// GET /api/analytics/weekly-review
// =====================================================
exports.getWeeklyReview = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Current 7 days focus sessions
    const sessionsRes = await pool.query(
      `SELECT
         COUNT(*)::int as total_sessions,
         COALESCE(SUM(duration_seconds), 0)::int as total_duration_seconds,
         AVG(avg_focus_score) FILTER (WHERE avg_focus_score IS NOT NULL) as avg_score,
         COALESCE(SUM(warning_count), 0)::int as total_warnings,
         COALESCE(SUM(blocked_attempts), 0)::int as total_blocked,
         COALESCE(SUM(tab_switches), 0)::int as total_tab_switches,
         COALESCE(SUM(idle_time_seconds), 0)::int as total_idle_seconds,
         COALESCE(SUM(planned_duration_seconds), 0)::int as total_planned_seconds
       FROM sessions
       WHERE user_id = $1
         AND start_time >= NOW() - INTERVAL '7 days'
         AND status = 'completed'`,
      [userId]
    );

    // 2. Prior 7 days focus sessions (for trend comparison)
    const priorSessionsRes = await pool.query(
      `SELECT
         COUNT(*)::int as total_sessions,
         COALESCE(SUM(duration_seconds), 0)::int as total_duration_seconds,
         AVG(avg_focus_score) FILTER (WHERE avg_focus_score IS NOT NULL) as avg_score
       FROM sessions
       WHERE user_id = $1
         AND start_time >= NOW() - INTERVAL '14 days'
         AND start_time < NOW() - INTERVAL '7 days'
         AND status = 'completed'`,
      [userId]
    );

    // 3. Tasks in last 7 days
    const tasksRes = await pool.query(
      `SELECT
         COUNT(*)::int as total_created,
         COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days')::int as completed_count,
         COALESCE(SUM(estimated_duration) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days'), 0)::int as planned_minutes,
         COALESCE(SUM(actual_duration) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days'), 0)::int as actual_minutes
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    );

    // 4. Goals in last 7 days
    const goalsRes = await pool.query(
      `SELECT id, name, progress, target_date, status
       FROM goals
       WHERE user_id = $1`,
      [userId]
    );

    // 5. Distraction patterns from activity_events in last 7 days
    const distractionsRes = await pool.query(
      `SELECT domain, COUNT(*)::int as count
       FROM activity_events
       WHERE user_id = $1
         AND timestamp >= NOW() - INTERVAL '7 days'
         AND event_type IN ('site_blocked', 'site_warning', 'distraction_detected')
         AND domain IS NOT NULL
       GROUP BY domain
       ORDER BY count DESC
       LIMIT 3`,
      [userId]
    );

    const s = sessionsRes.rows[0];
    const priorS = priorSessionsRes.rows[0];
    const t = tasksRes.rows[0];
    const goals = goalsRes.rows;
    const topDistractions = distractionsRes.rows;

    const totalSessions = s.total_sessions || 0;
    const completedTasks = t.completed_count || 0;

    // Honest empty state check
    if (totalSessions === 0 && completedTasks === 0) {
      return res.status(200).json({
        success: true,
        hasData: false,
        message: "No focus sessions or completed tasks recorded in the past 7 days. Once you complete focus sessions and tasks, your personal weekly focus review will appear here.",
      });
    }

    const totalFocusMinutes = Math.round((s.total_duration_seconds || 0) / 60);
    const avgScore = s.avg_score != null ? Math.round(Number(s.avg_score)) : null;

    // Goals summary
    const progressingGoals = goals.filter((g) => (g.progress || 0) > 0 && g.status !== "Completed").length;
    const completedGoals = goals.filter((g) => g.status === "Completed" || (g.progress || 0) >= 100).length;
    const atRiskGoals = goals.filter((g) => {
      if (!g.target_date || g.status === "Completed") return false;
      const daysUntilTarget = (new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilTarget <= 3 && (g.progress || 0) < 50;
    }).length;

    // Planned vs actual duration variance on tasks
    const plannedMins = t.planned_minutes || 0;
    const actualMins = t.actual_minutes || 0;
    const durationVariancePercent = plannedMins > 0 ? Math.round(((actualMins - plannedMins) / plannedMins) * 100) : null;

    // Period comparison
    const priorSessionsCount = priorS.total_sessions || 0;
    const hasPriorPeriod = priorSessionsCount > 0;
    const priorFocusMinutes = Math.round((priorS.total_duration_seconds || 0) / 60);
    const focusTimeChangePercent = hasPriorPeriod && priorFocusMinutes > 0
      ? Math.round(((totalFocusMinutes - priorFocusMinutes) / priorFocusMinutes) * 100)
      : null;

    // Actionable recommendations based purely on authentic user metrics
    const recommendations = [];
    if (durationVariancePercent != null && durationVariancePercent > 15) {
      recommendations.push({
        type: "pacing",
        observation: `Tasks took approximately ${durationVariancePercent}% longer than originally estimated.`,
        recommendation: "Add a 15–20 minute buffer to future focus blocks to maintain realistic schedules.",
      });
    } else if (durationVariancePercent != null && durationVariancePercent < -15) {
      recommendations.push({
        type: "momentum",
        observation: `You completed tasks ${Math.abs(durationVariancePercent)}% faster than planned!`,
        recommendation: "Take advantage of high momentum by chaining shorter 25-minute Pomodoro sprints.",
      });
    }

    if (topDistractions.length > 0) {
      recommendations.push({
        type: "distraction",
        observation: `Top distraction source was "${topDistractions[0].domain}" (${topDistractions[0].count} interruption alerts).`,
        recommendation: `Add "${topDistractions[0].domain}" to your Strict blocking list during deep work sessions.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "consistency",
        observation: `Completed ${totalSessions} focus session${totalSessions === 1 ? "" : "s"} totaling ${totalFocusMinutes} minutes.`,
        recommendation: "Keep up your regular focus cadence and schedule high-priority work during your peak hours.",
      });
    }

    return res.status(200).json({
      success: true,
      hasData: true,
      review: {
        totalFocusMinutes,
        totalSessions,
        avgFocusScore: avgScore,
        completedTasks,
        totalTasksPlanned: t.total_created || 0,
        taskCompletionRate: (t.total_created || 0) > 0 ? Math.round((completedTasks / t.total_created) * 100) : 100,
        plannedMins,
        actualMins,
        durationVariancePercent,
        goals: {
          total: goals.length,
          progressing: progressingGoals,
          completed: completedGoals,
          atRisk: atRiskGoals,
        },
        distractions: {
          warnings: s.total_warnings,
          blocked: s.total_blocked,
          tabSwitches: s.total_tab_switches,
          idleMinutes: Math.round((s.total_idle_seconds || 0) / 60),
          topDomains: topDistractions,
        },
        priorPeriod: {
          hasPriorPeriod,
          priorFocusMinutes,
          priorSessions: priorSessionsCount,
          focusTimeChangePercent,
        },
        recommendations,
      },
    });
  } catch (error) {
    console.error("getWeeklyReview Error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate weekly review." });
  }
};