/**
 * API endpoint for incremental test case generation
 */
const { generateTestCases } = require('../testGen');

// Helper function to verify user subscription
async function verifySubscription(userId) {
  if (!userId) return false;
  
  try {
    return userId === 'premium-user-123';
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  console.log('=== GENERATE INCREMENTAL REQUEST ===');
  console.log('Request Method:', req.method);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request Body:', JSON.stringify(req.body, null, 2));

  const { url, mode, sessionId, elementType, elementIndex, format } = req.body;
  
  const userId = req.headers.authorization?.split(' ')[1];
  
  try {
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
    
    const result = await generateTestCases(url, options);
    
    if (format && ['katalon', 'maestro', 'testrail'].includes(format) && !isPremium) {
      return res.status(200).json({
        success: false,
        error: 'Premium format requires a Pro subscription',
        upgradeRequired: true
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
};
