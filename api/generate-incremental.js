// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');
const { generateTestCases } = require('../testGen');

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
    const body = req.body || {};
    const url = body.url;
    const mode = body.mode || 'first';
    const format = body.format || 'plain';
    const elementType = body.elementType;
    const elementIndex = body.elementIndex ? parseInt(body.elementIndex) : 0;
    // Default batchSize to 5 if not provided
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 5;
    
    // Log request for debugging
    console.log(`Request params: mode=${mode}, elementType=${elementType}, elementIndex=${elementIndex}, batchSize=${batchSize}`);
    
    // Check if all required fields are present
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    // For subsequent calls, we need pageData and processed state in the body
    if (mode === 'next' && (!body.pageData || !body.processed)) {
      return res.status(400).json({
        success: false,
        error: 'Page data and processed state are required for subsequent test generation'
      });
    }

    // Force pro access for testing
    const userPlan = 'pro';
    
    // Process the request based on mode
    let result;
    
    if (mode === 'first') {
      // For first call, generate initial test
      result = await generateTestCases(url, {
        mode: 'first',
        userPlan: userPlan
      });
    } else {
      // For subsequent calls, generate next batch of tests
      // Pass all state from the request body directly
      result = await generateTestCases(null, {
        mode: 'next',
        pageData: body.pageData,
        processed: body.processed,
        elementType: elementType,
        elementIndex: elementIndex,
        userPlan: userPlan,
        batchSize: batchSize
      });
    }
    
    // Return the result to the client
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};

// Keep all the fallback functions unchanged below this point:
// generateFirstTest, generateNextTest, generateButtonTest, etc.
// (they're already in your existing file)
