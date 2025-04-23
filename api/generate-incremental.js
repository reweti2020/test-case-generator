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
    const sessionId = body.sessionId;
    const elementType = body.elementType;
    const elementIndex = body.elementIndex !== undefined ? parseInt(body.elementIndex) : 0;
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 5;
    
    // Log request for debugging
    console.log(`Request params: mode=${mode}, sessionId=${sessionId}, elementType=${elementType}, elementIndex=${elementIndex}, batchSize=${batchSize}`);
    
    // Force pro access for testing
    const userPlan = 'pro';
    
    // Check if URL is provided for first-time generation
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    // For subsequent requests, sessionId is required
    if (mode === 'next' && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required for subsequent test generation'
      });
    }
    
    // Process the request based on mode
    let result;
    
    console.log(`Processing request in ${mode} mode`);
    
    if (mode === 'first') {
      // Initial test generation
      result = await generateTestCases(url, {
        mode: 'first',
        userPlan: userPlan
      });
    } else {
      // Subsequent test generation with sessionId
      result = await generateTestCases(null, {
        mode: 'next',
        sessionId: sessionId,
        elementType: elementType,
        elementIndex: elementIndex,
        userPlan: userPlan,
        batchSize: batchSize
      });
    }
    
    // Ensure result has all required properties
    if (result && result.success) {
      console.log(`Success: Generated ${result.testCases ? result.testCases.length : 0} test cases`);
      
      // Make sure pageData is present for frontend
      if (!result.pageData && mode === 'next') {
        const session = require('../testGen').pageCache[sessionId];
        if (session && session.pageData) {
          result.pageData = session.pageData;
        }
      }
      
      // Make sure processed is present for frontend
      if (!result.processed && mode === 'next') {
        const session = require('../testGen').pageCache[sessionId];
        if (session && session.processed) {
          result.processed = session.processed;
        }
      }
    } else {
      console.log('Error: Test generation failed', result ? result.error : 'Unknown error');
    }
    
    // Return the result to the client
    return res.status(200).json(result || {
      success: false,
      error: 'No result returned from test generator'
    });
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};
