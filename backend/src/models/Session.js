const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, default: 'Study Focus Session' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    avgFocusScore: { type: Number, default: 100 },
    tabSwitches: { type: Number, default: 0 },
    idleTimeSeconds: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
