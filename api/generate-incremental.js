// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');
const { generateTestCases } = require('../testGen');

// In-memory storage for page analysis results (Note: this will reset when serverless function cold starts)
// This can be removed if you want to use the pageCache from testGen.js
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
    
    // Use testGen.js to handle test generation
    let result;
    
    if (mode === 'first') {
      // For first call, use testGen.generateTestCases
      result = await generateTestCases(url, {
        mode: 'first',
        userPlan: userPlan
      });
    } else {
      // For subsequent calls, use testGen.generateTestCases
      result = await generateTestCases(url, {
        mode: 'next',
        sessionId: sessionId,
        elementType: elementType,
        elementIndex: elementIndex,
        userPlan: userPlan
      });
    }
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    
    // Provide more user-friendly error messages based on error type
    if (error.code === 'ENOTFOUND') {
      return res.status(400).json({ 
        success: false, 
        error: `Could not resolve domain name. Please check that the URL is correct and publicly accessible.`
      });
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return res.status(400).json({ 
        success: false, 
        error: `Connection timed out. The site might be slow or unreachable.`
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(400).json({ 
        success: false, 
        error: `Connection was refused. The site might be blocking our access.`
      });
    } else if (error.response && error.response.status) {
      return res.status(400).json({ 
        success: false, 
        error: `Server responded with status ${error.response.status}.`
      });
    }
    
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};

// Export pageCache for other modules if needed
module.exports.pageCache = pageCache;
