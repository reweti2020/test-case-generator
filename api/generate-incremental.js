// api/generate-incremental.js
const { generateTestCases } = require('../testGen');

module.exports = async (req, res) => {
  console.log('[API] Test generation request received');
  
  try {
    const { url, mode, sessionId, elementType, elementIndex, format } = req.body || {};
    
    // Log the request parameters
    console.log(`Request params: ${JSON.stringify({ url, mode, sessionId, elementType, elementIndex, format })}`);
    
    // Extract user plan from auth header or use 'free' as default
    // In a real application, this would verify with your auth system
    const authHeader = req.headers.authorization;
    const userPlan = authHeader && authHeader.includes('premium') ? 'pro' : 'free';
    
    // For first request, URL is required
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
    
    const options = {
      mode: mode || 'first',
      sessionId,
      elementType,
      elementIndex: elementIndex !== undefined ? parseInt(elementIndex) : 0,
      userPlan,
      format: format || 'plain'
    };
    
    // Generate test cases
    const result = await generateTestCases(url, options);
    
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
