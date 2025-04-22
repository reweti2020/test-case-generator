// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');

// In-memory storage for page analysis results
const pageCache = {};

/**
 * API handler for test case generation
 */
module.exports = async (req, res) => {
  console.log('[API] Test generation request received');
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Extract request body
    const { url, mode, sessionId, elementType, elementIndex, format } = req.body || {};
    
    // Log request for debugging
    console.log(`Request params: ${JSON.stringify({ url, mode, sessionId, elementType, elementIndex, format })}`);
    
    // Check if all required fields are present
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    if (mode === 'next' && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required for subsequent test generation'
      });
    }

    // Force pro access for testing
    const userPlan = 'pro';
    
    // Process the request based on mode
    let result;
    
    if (mode === 'first') {
      result = await generateFirstTest(url, userPlan);
    } else {
      result = generateNextTest(sessionId, elementType, elementIndex, userPlan);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};

/**
 * Generate the first test case by analyzing the website
 */
async function generateFirstTest(url, userPlan = 'pro') {
  try {
    console.log(`Fetching URL: ${url}`);
    
    // Fetch the HTML content with a timeout
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Check response status
    if (response.status !== 200) {
      return {
        success: false,
        error: `Failed to fetch URL (Status ${response.status})`
      };
    }
    
    console.log('URL fetched successfully, parsing HTML...');
    
    // Load HTML into
