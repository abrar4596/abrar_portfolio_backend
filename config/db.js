const mongoose = require('mongoose');

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Disconnected from database.');
});

// Graceful shutdown handler
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

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Connects to MongoDB Atlas using Mongoose.
 * @param {Object} customOptions - Optional custom Mongoose connection options.
 */
const connectDB = async (customOptions = {}) => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error('Error: MONGO_URI environment variable is not defined.');
    return false;
  }

  // Production-grade connection options
  const defaultOptions = {
    // autoIndex is true in development but optional/configurable via options, and default to false in production
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: 10, // Maintain up to 10 socket connections
  };

  const options = { ...defaultOptions, ...customOptions };

  try {
    await mongoose.connect(mongoURI, options);
    return true;
  } catch (error) {
    // Note: The error listener will also trigger and log the connection error,
    // but we log and rethrow here so the server can start and return a graceful error response.
    console.error('Initial MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
