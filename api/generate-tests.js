// api/generate-tests.js
const path = require('path');

// Use consistent path resolution that works in both development and production
const { generateTestCases } = require(path.join(process.cwd(), 'src', 'utils', 'testGen'));

// Vercel serverless function with increased timeout handling
module.exports = async (req, res) => {
  // Set appropriate CORS headers for your domain
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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
    
    console.log(`Processing request for URL: ${url} with format: ${format || 'plain'}`);
    
    // Create a timeout promise to prevent exceeding Vercel's function execution time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - URL analysis took too long')), 25000);
    });
    
    // Race the test case generation against the timeout
    const result = await Promise.race([
      generateTestCases(url, format),
      timeoutPromise
    ]);
    
    console.log(`Successfully generated test cases for ${url}`);
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
