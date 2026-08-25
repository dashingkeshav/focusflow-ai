const mongoose = require('mongoose');
const memoryStore = require('../utils/memoryStore');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    dailyGoalHours: { type: Number, default: 4 },
    streakDays: { type: Number, default: 5 },
    resetToken: { type: String, default: null },
    resetTokenExpire: { type: Date, default: null },
    resetOTP: { type: String, default: null },
    resetOTPExpire: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const UserModel = mongoose.model('User', userSchema);

/**
 * Wrapper that provides fallback to in-memory store when MongoDB is unavailable
 */
const UserWithFallback = {
  findOne: async (filter) => {
    try {
      return await UserModel.findOne(filter);
    } catch (error) {
      console.warn(`[Memory Store] MongoDB unavailable, using memory store for findOne`);
      return await memoryStore.findOne(filter);
    }
  },

  findById: async (id) => {
    try {
      return await UserModel.findById(id);
    } catch (error) {
      console.warn(`[Memory Store] MongoDB unavailable, using memory store for findById`);
      return await memoryStore.findById(id);
    }
  },

  create: async (data) => {
    try {
      return await UserModel.create(data);
    } catch (error) {
      console.warn(`[Memory Store] MongoDB unavailable, using memory store for create`);
      return await memoryStore.create(data);
    }
  }
};

// Add save wrapper for instances
UserModel.schema.methods.save = async function() {
  try {
    return await UserModel.prototype.save.call(this);
  } catch (error) {
    console.warn(`[Memory Store] MongoDB save failed, using memory store`);
    // For memory store users, just update in memory
    return await memoryStore.save(this);
  }
};

module.exports = UserWithFallback;
