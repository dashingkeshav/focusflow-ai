const bcrypt = require("bcryptjs");

const { pool } = require("../config/db");

const User = require("../models/User");

const {
  validateEmail,
  sanitizeEmail,
  getPasswordErrors,
} = require("../utils/validation");


// =====================================================
// DASHBOARD STATS
// GET /api/analytics/dashboard
// =====================================================

exports.getDashboardStats = async (req, res) => {
  try {

    const userId = req.user.id;

    const sessionsResult =
      await pool.query(
        `
        SELECT
          id,
          title,
          start_time,
          end_time,
          duration_seconds,
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


    const avgFocusScore =
      sessions.length
        ? Math.round(
            sessions.reduce(
              (sum, session) =>
                sum +
                Number(
                  session.avg_focus_score || 0
                ),
              0
            ) / sessions.length
          )
        : 0;


    const bestFocusScore =
      sessions.length
        ? Math.max(
            ...sessions.map(
              (session) =>
                Number(
                  session.avg_focus_score || 0
                )
            )
          )
        : 0;


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
        );


      const dayScore =
        daySessions.length
          ? Math.round(
              daySessions.reduce(
                (sum, session) =>
                  sum +
                  Number(
                    session.avg_focus_score || 0
                  ),
                0
              ) /
              daySessions.length
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

          score:
            Number(
              session.avg_focus_score || 0
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


    return res.json({

      success: true,

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

        createdAt:
          user.createdAt,
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