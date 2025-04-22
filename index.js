const express = require('express');
const cors = require('cors');
const path = require('path');

// Add global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Detailed error wrapper for API routes
const safeHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(`API Error: ${error.message}`, error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
};

// API Routes with error handling
app.post('/api/generate-incremental', safeHandler(require('./api/generate-incremental')));
app.post('/api/export-tests', safeHandler(require('./api/export-test')));
app.post('/api/create-checkout-session', safeHandler(require('./api/create-checkout-session')));

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
