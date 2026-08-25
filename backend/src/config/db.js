const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB Atlas] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Atlas] Note: Connection optional for local demo fallback. ${error.message}`);
  }
};

module.exports = connectDB;
