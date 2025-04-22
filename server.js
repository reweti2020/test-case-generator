/**
 * Express server for Test Case Generator
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const { cleanupSessions } = require('./testGen');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.post('/api/generate-incremental', require('./api/generate-incremental'));
app.post('/api/export-tests', require('./api/export-test'));
app.post('/api/create-checkout-session', require('./api/create-checkout-session'));
app.post('/api/test', require('./api/test')); // Simple test endpoint

// Regular cleanup of old sessions (every hour)
setInterval(() => {
  console.log('Cleaning up old sessions...');
  cleanupSessions(3600000); // 1 hour
}, 3600000);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Success page (for payment success)
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
