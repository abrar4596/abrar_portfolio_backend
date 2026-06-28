const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
]);

configuredOrigins.forEach((origin) => allowedOrigins.add(origin));

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  return /https:\/\/.*\.(vercel\.app|vercel\.dev)$/i.test(origin)
    || /https:\/\/.*\.app\.github\.dev$/i.test(origin)
    || /https?:\/\/localhost(:\d+)?$/i.test(origin)
    || /https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);
};

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json()); // Essential to parse JSON payloads in req.body

// Routes
app.use('/api/leads', require('./routes/leadRoutes'));

// Root Endpoint/Health Check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Developer Portfolio CRM API is running...' });
});

// Database Connection and Server Bootstrapping
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Database connection unavailable. The API will continue running with degraded functionality.', error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

module.exports = app;
