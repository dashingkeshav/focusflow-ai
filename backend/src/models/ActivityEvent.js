const mongoose = require('mongoose');

const activityEventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    eventType: { type: String, enum: ['tab_switch', 'idle', 'keyboard_burst', 'mouse_burst'], required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
