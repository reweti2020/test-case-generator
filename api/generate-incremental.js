// api/generate-incremental.js
module.exports = async (req, res) => {
  console.log('[API] Simple test request received');
  try {
    return res.status(200).json({
      success: true,
      message: 'API is working',
      requestBody: req.body || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
