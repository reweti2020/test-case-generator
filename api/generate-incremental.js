/**
 * API endpoint for incremental test case generation
 */
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

module.exports = async (req, res) => {
  // Detailed logging
  console.log('Incoming Request to Generate Incremental');
  console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));

  const { url, mode, sessionId, elementType, elementIndex, format } = req.body;
  
  // Get user information from request
  const userId = req.headers.authorization?.split(' ')[1];
  
  try {
    // Log before verifying subscription
    console.log('Verifying Subscription', { userId });

    // Check if user has premium subscription
    const isPremium = await verifySubscription(userId);
    const userPlan = isPremium ? 'pro' : 'free';
    
    console.log('Subscription Verification Result:', { 
      isPremium, 
      userPlan 
    });

    const options = {
      mode: mode || 'first',
      sessionId,
      elementType,
      elementIndex: elementIndex ? parseInt(elementIndex) : 0,
      format: format || 'plain',
      userPlan
    };
    
    console.log('Prepared Options:', JSON.stringify(options, null, 2));
    
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
    const result = await generateTestCases(url, options);
    
    console.log('Generation Result:', JSON.stringify(result, null, 2));

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
    res.status(200).json(result);
  } catch (error) {
    // Detailed error logging
    console.error('Error in generate-incremental:', error);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
};
