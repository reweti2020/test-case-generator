// /api/generate-incremental.js - Serverless API for test case generation
const { generateTestCases } = require('../testGen');

// Helper function to verify user subscription
async function verifySubscription(userId) {
  // This would typically query your database or auth service
  // Placeholder implementation
  if (!userId) return false;
  
  try {
    // Example implementation - replace with your actual auth check
    // const user = await db.users.findOne({ id: userId });
    // return user?.subscription?.status === 'active';
    
    // For demo purposes, checking a dummy userId
    return userId === 'premium-user-123';
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return false;
  }
}

// Main handler function for the API endpoint
module.exports = async (req, res) => {
  // Support both GET and POST methods
  const method = req.method.toUpperCase();
  
  // Log request to debug
  console.log(`[API] ${method} request to generate-incremental`);
  
  // Only allow POST requests
  if (method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Please use POST.'
    });
  }
  
  // Get request body
  const body = req.body || {};
  const { url, mode, sessionId, elementType, elementIndex, format } = body;
  
  // Get user information from request
  const userId = req.headers.authorization?.split(' ')[1];
  
  try {
    // Log operation
    console.log(`Processing ${mode === 'first' ? 'initial' : 'subsequent'} test generation for ${url || sessionId}`);
    
    // Check if user has premium subscription
    const isPremium = await verifySubscription(userId);
    const userPlan = isPremium ? 'pro' : 'free';
    
    const options = {
      mode: mode || 'first',
      sessionId,
      elementType,
      elementIndex: elementIndex ? parseInt(elementIndex) : 0,
      format: format || 'plain',
      userPlan
    };
    
    // Validate required parameters
    if (options.mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    if (options.mode === 'next' && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required for subsequent test generation'
      });
    }
    
    // Generate test cases
    const result = await generateTestCases(url, options);
    
    // Check for premium format request by non-premium user
    if (format && ['katalon', 'maestro', 'testrail'].includes(format) && !isPremium) {
      return res.status(200).json({
        success: false,
        error: 'Premium format requires a Pro subscription',
        upgradeRequired: true
      });
    }
    
    // Check session duration for free users (10 minutes)
    if (userPlan === 'free' && mode === 'next' && sessionId) {
      // This would check how long the session has been active
      // Placeholder implementation - in production, store session creation time
      // const sessionAge = Date.now() - sessionStartTime; 
      // if (sessionAge > 10 * 60 * 1000) { // 10 minutes
      //   return res.status(200).json({
      //     success: false,
      //     error: 'Free plan session duration limit reached',
      //     upgradeRequired: true
      //   });
      // }
    }
    
    // Log result status
    console.log(`Test generation ${result.success ? 'succeeded' : 'failed'}: ${result.error || 'No error'}`);
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};
