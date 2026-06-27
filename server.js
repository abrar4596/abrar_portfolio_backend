const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

module.exports = app;
