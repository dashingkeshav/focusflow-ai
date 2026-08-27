/**
 * In-Memory Store
 * Fallback when MongoDB is unavailable (for local development/testing)
 * Supports multiple models: users, sessions, activityEvents, etc.
 */

const collections = {
  users: [],
  sessions: [],
  activityEvents: []
};

// Helper to add save method to an object
const addSaveMethod = (obj, collectionName) => {
  obj.save = async function() {
    return await memoryStore.save(collectionName, this);
  };
  return obj;
};

const memoryStore = {
  // Generic find one
  findOne: async (collectionName, filter) => {
    const collection = collections[collectionName] || [];
    
    // Backward compatibility for User model
    if (!collectionName && filter.email) {
      return memoryStore.findOne('users', filter);
    }
    
    for (const item of collection) {
      let match = true;
      for (const key in filter) {
        if (item[key] !== filter[key]) {
          match = false;
          break;
        }
      }
      if (match) return addSaveMethod(item, collectionName);
    }
    return null;
  },

  // Generic find
  find: async (collectionName, filter = {}) => {
    const collection = collections[collectionName] || [];
    
    let results = collection.filter(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) return false;
      }
      return true;
    }).map(item => addSaveMethod(item, collectionName));
    
    // Create a chainable query object
    const query = {
      results: results,
      
      sort: function(sortOptions) {
        if (typeof sortOptions === 'string') {
          // Handle simple sort like '-createdAt'
          const isDesc = sortOptions.startsWith('-');
          const field = isDesc ? sortOptions.substring(1) : sortOptions;
          this.results = this.results.sort((a, b) => {
            const aVal = a[field] ? new Date(a[field]).getTime() : 0;
            const bVal = b[field] ? new Date(b[field]).getTime() : 0;
            return isDesc ? bVal - aVal : aVal - bVal;
          });
        } else if (typeof sortOptions === 'object') {
          // Handle object sort like { createdAt: -1 }
          for (const field in sortOptions) {
            const direction = sortOptions[field];
            const isDesc = direction === -1;
            this.results = this.results.sort((a, b) => {
              const aVal = a[field] ? new Date(a[field]).getTime() : 0;
              const bVal = b[field] ? new Date(b[field]).getTime() : 0;
              return isDesc ? bVal - aVal : aVal - bVal;
            });
          }
        }
        return this;
      },
      
      limit: function(num) {
        this.results = this.results.slice(0, num);
        return this;
      },
      
      lean: function() {
        this.results = this.results.map(item => {
          const { save, ...rest } = item;
          return rest;
        });
        return this;
      },
      
      // Return the results when used in async context
      then: function(resolve) {
        resolve(this.results);
      }
    };
    
    return query;
  },

  // Find by ID
  findById: async (collectionName, id) => {
    // Backward compatibility for User model
    if (!collectionName) {
      return memoryStore.findById('users', id);
    }
    
    const collection = collections[collectionName] || [];
    const item = collection.find(item => item._id === id);
    return item ? addSaveMethod(item, collectionName) : null;
  },

  // Create new item
  create: async (collectionName, data) => {
    // Backward compatibility for User model
    if (!collectionName) {
      return memoryStore.create('users', data);
    }
    
    const item = {
      _id: `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!collections[collectionName]) {
      collections[collectionName] = [];
    }
    
    collections[collectionName].push(item);
    console.log(`[Memory Store] ${collectionName} created: ${item._id}`);
    return addSaveMethod(item, collectionName);
  },

  // Save/Update item
  save: async (collectionName, item) => {
    // Backward compatibility for User model
    if (!collectionName) {
      return memoryStore.save('users', item);
    }
    
    const collection = collections[collectionName] || [];
    const index = collection.findIndex(i => i._id === item._id);
    
    if (index >= 0) {
      const updated = { ...collection[index], ...item, updatedAt: new Date() };
      collection[index] = updated;
      console.log(`[Memory Store] ${collectionName} updated: ${item._id}`);
      return addSaveMethod(updated, collectionName);
    } else {
      const saved = { ...item, updatedAt: new Date() };
      collection.push(saved);
      console.log(`[Memory Store] ${collectionName} saved: ${item._id}`);
      return addSaveMethod(saved, collectionName);
    }
  },

  // Update many
  updateMany: async (collectionName, filter, update) => {
    const collection = collections[collectionName] || [];
    let count = 0;
    
    for (let i = 0; i < collection.length; i++) {
      let match = true;
      for (const key in filter) {
        if (collection[i][key] !== filter[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        collection[i] = { ...collection[i], ...update, updatedAt: new Date() };
        count++;
      }
    }
    
    console.log(`[Memory Store] ${collectionName} updateMany: ${count} documents updated`);
    return { modifiedCount: count };
  },

  // Find one and update
  findOneAndUpdate: async (collectionName, filter, update, options = {}) => {
    const collection = collections[collectionName] || [];
    const index = collection.findIndex(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) return false;
      }
      return true;
    });
    
    if (index >= 0) {
      const updated = { ...collection[index], ...update, updatedAt: new Date() };
      collection[index] = updated;
      console.log(`[Memory Store] ${collectionName} findOneAndUpdate: ${updated._id}`);
      return addSaveMethod(updated, collectionName);
    }
    
    return null;
  },

  // Clear collection
  clear: (collectionName) => {
    if (collectionName) {
      collections[collectionName] = [];
      console.log(`[Memory Store] ${collectionName} cleared`);
    } else {
      Object.keys(collections).forEach(key => {
        collections[key] = [];
      });
      console.log('[Memory Store] All collections cleared');
    }
  },

  // Get all items in collection (for debugging)
  getAll: (collectionName) => {
    return collections[collectionName] || [];
  }
};

module.exports = memoryStore;
