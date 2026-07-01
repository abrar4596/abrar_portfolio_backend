const mongoose = require('mongoose');
const { syncFallbackLeads } = require('../services/syncService');

// Cache the database connection for serverless environments
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully.');
  // Automatically sync any offline leads back to MongoDB
  syncFallbackLeads().catch((err) => {
    console.error('Failed to sync fallback leads on connection:', err.message);
  });
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Disconnected from database.');
});

// Graceful shutdown handler (for local development)
const gracefulShutdown = async (signal) => {
  try {
    await mongoose.connection.close();
    console.log(`Mongoose connection closed gracefully due to app termination (${signal}).`);
    process.exit(0);
  } catch (error) {
    console.error(`Error closing Mongoose connection during shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Listen for termination signals (only for local dev, not serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

/**
 * Connects to MongoDB Atlas using Mongoose with serverless-friendly caching.
 * @param {Object} customOptions - Optional custom Mongoose connection options.
 */
const connectDB = async (customOptions = {}) => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error('Error: MONGO_URI environment variable is not defined.');
    return false;
  }

  // Return cached connection if available
  if (cached.conn) {
    return true;
  }

  if (!cached.promise) {
    // Production-grade connection options
    const defaultOptions = {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: 10,
      bufferCommands: false, // Disable buffering for serverless
    };

    const options = { ...defaultOptions, ...customOptions };

    cached.promise = mongoose.connect(mongoURI, options).then((mongoose) => {
      console.log('Successfully connected to MongoDB.');
      return mongoose;
    }).catch((error) => {
      console.warn('Primary MongoDB connection failed:', error.message);
      // Try fallback to local MongoDB if primary fails (only for local dev)
      const localURI = 'mongodb://127.0.0.1:27017/portfolio';
      if (mongoURI !== localURI && !process.env.VERCEL) {
        try {
          console.log('Attempting fallback connection to local MongoDB...');
          return mongoose.connect(localURI, options);
        } catch (localError) {
          console.error('Fallback to local MongoDB also failed:', localError.message);
          throw localError;
        }
      } else {
        throw error;
      }
    });
  }

  try {
    cached.conn = await cached.promise;
    return true;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
};

module.exports = connectDB;
