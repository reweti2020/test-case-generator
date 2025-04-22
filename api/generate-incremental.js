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
    console.error('Subscription Verification Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return false;
  }
}

// Enhanced error handling middleware
function handleServerError(error, req, res) {
  // Log the full error details
  console.error('CRITICAL SERVER ERROR:', {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      type: typeof error
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    }
  });

  // Differentiate error responses based on error type
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: error.message
    });
  }

  // Default 500 error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An unexpected error occurred'
  });
}

module.exports = async (req, res) => {
  // Add global error handling for unhandled promises
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  try {
    // Comprehensive request logging
    console.log('Incoming Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });

    // Destructure request with default values and strict validation
    const { 
      url = '', 
      mode = 'first', 
      sessionId = null, 
      elementType = null, 
      elementIndex = 0, 
      format = 'plain' 
    } = req.body;

    // Get user information from request
    const userId = req.headers.authorization?.split(' ')[1];

    // Validate request payload
    if (mode === 'first' && !url) {
      const error = new Error('URL is required for initial test generation');
      error.name = 'ValidationError';
      throw error;
    }

    if (mode === 'next' && !sessionId) {
      const error = new Error('Session ID is required for subsequent test generation');
      error.name = 'ValidationError';
      throw error;
    }

    // Check if user has premium subscription
    const isPremium = await verifySubscription(userId);
    const userPlan = isPremium ? 'pro' : 'free';

    // Prepare options for test generation
    const options = {
      mode,
      sessionId,
      elementType,
      elementIndex: elementIndex ? parseInt(elementIndex) : 0,
      format: format || 'plain',
      userPlan
    };
    
    // Generate test cases
    const result = await generateTestCases(url, options);
    
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
    // Centralized error handling
    handleServerError(error, req, res);
  }
};
