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
app.post('/api/export-tests', require('./api/export-tests'));
app.post('/api/create-checkout-session', require('./api/create-checkout-session'));

// Regular cleanup of old sessions (every hour)
setInterval(() => {
  console.log('Cleaning up old sessions...');
  cleanupSessions(3600000); // 1 hour
}, 3600000);

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Success page (for payment success)
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
