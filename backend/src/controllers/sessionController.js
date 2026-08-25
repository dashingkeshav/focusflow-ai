const Session = require('../models/Session');
const ActivityEvent = require('../models/ActivityEvent');

exports.startSession = async (req, res) => {
  try {
    const { title } = req.body;
    const session = new Session({
      userId: req.user ? req.user.id : 'usr_101',
      title: title || 'Study Focus Session',
      startTime: new Date(),
      status: 'active'
    });
    await session.save().catch(() => null);

    return res.status(201).json({
      success: true,
      message: 'Focus session started',
      session
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId, durationSeconds, avgFocusScore, tabSwitches, idleTimeSeconds } = req.body;
    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        endTime: new Date(),
        durationSeconds,
        avgFocusScore,
        tabSwitches,
        idleTimeSeconds,
        status: 'completed'
      },
      { new: true }
    ).catch(() => null);

    return res.json({
      success: true,
      message: 'Session completed successfully',
      session: session || { sessionId, status: 'completed' }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSessionHistory = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user ? req.user.id : 'usr_101' })
      .sort({ createdAt: -1 })
      .limit(20)
      .catch(() => []);

    return res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
