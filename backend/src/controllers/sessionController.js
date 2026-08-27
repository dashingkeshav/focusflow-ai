const Session = require("../models/Session");
const ActivityEvent = require("../models/ActivityEvent");


// =====================================================
// START SESSION
// POST /api/sessions/start
// =====================================================

exports.startSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const title =
      typeof req.body.title === "string" &&
      req.body.title.trim()
        ? req.body.title.trim()
        : "Study Focus Session";


    // Cancel previous active sessions for this user
    await Session.updateMany(
      {
        userId,
        status: "active",
      },
      {
        $set: {
          status: "cancelled",
          endTime: new Date(),
        },
      }
    );


    const session =
      await Session.create({
        userId,
        title,
        startTime: new Date(),
        status: "active",
      });


    return res.status(201).json({
      success: true,
      message: "Focus session started",
      session,
    });

  } catch (error) {

    console.error(
      "startSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to start focus session.",
    });
  }
};


// =====================================================
// END SESSION
// POST /api/sessions/end
// =====================================================

exports.endSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      sessionId,
      durationSeconds,
      avgFocusScore,
      finalFocusScore,
      tabSwitches,
      idleTimeSeconds,
      cameraDistractions,
      warningCount,
      blockedAttempts,
      distractionEvents,
      status,
    } = req.body;


    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }


    const session =
      await Session.findOneAndUpdate(
        {
          id: sessionId,
          userId,
        },
        {
          $set: {
            endTime: new Date(),

            durationSeconds:
              Number(durationSeconds) || 0,

            avgFocusScore:
              avgFocusScore != null
                ? Number(avgFocusScore)
                : 0,

            finalFocusScore:
              finalFocusScore != null
                ? Number(finalFocusScore)
                : Number(avgFocusScore) || 0,

            tabSwitches:
              Number(tabSwitches) || 0,

            idleTimeSeconds:
              Number(idleTimeSeconds) || 0,

            cameraDistractions:
              Number(cameraDistractions) || 0,

            warningCount:
              Number(warningCount) || 0,

            blockedAttempts:
              Number(blockedAttempts) || 0,

            distractionEvents:
              Number(distractionEvents) || 0,

            status:
              status || "completed",
          },
        },
        {
          new: true,
        }
      );


    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found or does not belong to you.",
      });
    }


    return res.json({
      success: true,
      message:
        "Session completed successfully",
      session,
    });

  } catch (error) {

    console.error(
      "endSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to end focus session.",
    });
  }
};


// =====================================================
// HISTORY
// GET /api/sessions/history
// =====================================================

exports.getSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const requestedLimit =
      Number.parseInt(
        req.query.limit,
        10
      );

    const limit =
      Math.min(
        Number.isFinite(requestedLimit)
          ? requestedLimit
          : 20,
        100
      );


    const sessions =
      await Session.find({
        userId,
      });


    return res.json({
      success: true,
      count: sessions.length,
      sessions:
        sessions.slice(0, limit),
    });

  } catch (error) {

    console.error(
      "getSessionHistory error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch session history.",
    });
  }
};


// =====================================================
// RECORD ACTIVITY EVENT
// POST /api/sessions/event
// =====================================================

exports.recordEvent = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      sessionId,
      eventType,
      details,
      domain,
      warningNumber,
    } = req.body;


    if (!sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message:
          "sessionId and eventType are required",
      });
    }


    // Verify session belongs to current user
    const session =
      await Session.findOne({
        id: sessionId,
        userId,
      });


    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Session not found or access denied",
      });
    }


    const event =
      await ActivityEvent.create({
        userId,
        sessionId,
        eventType,
        details,
        domain:
          domain || null,
        warningNumber:
          warningNumber ?? null,
        timestamp:
          new Date(),
      });


    return res.status(201).json({
      success: true,
      event,
    });

  } catch (error) {

    console.error(
      "recordEvent error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to record activity event.",
    });
  }
};


// =====================================================
// ACTIVE SESSION
// GET /api/sessions/active
// =====================================================

exports.getActiveSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session =
      await Session.findOne({
        userId,
        status: "active",
      });


    return res.json({
      success: true,
      session:
        session || null,
    });

  } catch (error) {

    console.error(
      "getActiveSession error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch active session.",
    });
  }
};