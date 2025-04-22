/**
 * API endpoint for incremental test case generation
 */
const { generateTestCases } = require('../src/utils/testGen');

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

module.exports = async (req, res) => {
  // Log the start of the function to help with debugging
  console.log('[API] Processing generate-incremental request');
  
  try {
    const { url, mode, sessionId, elementType, elementIndex, format } = req.body || {};
    
    // Log the request parameters
    console.log(`Request params: ${JSON.stringify({ url, mode, sessionId, elementType, elementIndex, format })}`);
    
    // Get user information from request
    const userId = req.headers.authorization?.split(' ')[1];
    
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
    
    // For first request, URL is required
    if (options.mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    // For subsequent requests, sessionId is required
    if (options.mode === 'next' && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required for subsequent test generation'
      });
    }
    
    // Generate test cases
    console.log('Calling generateTestCases function');
    const result = await generateTestCases(url, options);
    console.log('Generate test cases result:', result.success ? 'Success' : 'Failed');
    
    // Check if premium format was requested by non-premium user
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
