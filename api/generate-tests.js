// api/generate-tests.js
const { generateTestCases } = require('../../src/utils/testGen');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, format } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // Validate URL format
    new URL(url);
    
    // Generate test cases
    const result = await generateTestCases(url, format);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating test cases:', error);
    
    if (error instanceof TypeError && error.code === 'ERR_INVALID_URL') {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error generating test cases: ' + error.message 
    });
  }
};
