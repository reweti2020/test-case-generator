/**
 * Simple test API endpoint to verify API route structure
 */
module.exports = async (req, res) => {
  // Log the start of the function to help with debugging
  console.log('[API] Processing test request');
  
  try {
    // Log the request
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    // Return a simple success response
    return res.status(200).json({
      success: true,
      message: 'API endpoint working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
