/**
 * In-Memory User Store
 * Fallback when MongoDB is unavailable (for local development/testing)
 */

let users = [];

// Helper to add save method to a user object
const addSaveMethod = (user) => {
  user.save = async function() {
    return await memoryStore.save(this);
  };
  return user;
};

const memoryStore = {
  // Find user by email
  findOne: async (filter) => {
    if (filter.email) {
      const user = users.find(u => u.email.toLowerCase() === filter.email.toLowerCase());
      return user ? addSaveMethod(user) : null;
    }
    return null;
  },

  // Find by ID
  findById: async (id) => {
    const user = users.find(u => u._id === id);
    return user ? addSaveMethod(user) : null;
  },

  // Create new user
  create: async (userData) => {
    const user = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.push(user);
    console.log(`[Memory Store] User created: ${user.email}`);
    return addSaveMethod(user);
  },

  // Save/Update user
  save: async (user) => {
    const index = users.findIndex(u => u._id === user._id);
    if (index >= 0) {
      const updated = { ...users[index], ...user, updatedAt: new Date() };
      users[index] = updated;
      console.log(`[Memory Store] User updated: ${user.email}`);
      return addSaveMethod(updated);
    } else {
      const saved = { ...user, updatedAt: new Date() };
      users.push(saved);
      console.log(`[Memory Store] User saved: ${user.email}`);
      return addSaveMethod(saved);
    }
  },

  // Clear all (for testing)
  clear: () => {
    users = [];
    console.log('[Memory Store] All users cleared');
  },

  // Get all users (for debugging)
  getAll: () => users
};

module.exports = memoryStore;
