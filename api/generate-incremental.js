// api/generate-incremental.js
const { generateTestCases } = require('../testGen');

module.exports = async (req, res) => {
  const { url, mode, sessionId, elementType, elementIndex, format } = req.body;
  
  try {
    const options = {
      mode: mode || 'first',
      sessionId,
      elementType,
      elementIndex: elementIndex ? parseInt(elementIndex) : 0,
      format: format || 'plain'
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
    const result = await generateTestCases(url, options);
    
    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
};
