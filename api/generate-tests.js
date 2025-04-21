// api/generate-tests.js
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('API Route Called');
  console.log('Request Method:', req.method);
  console.log('Request Body:', JSON.stringify(req.body));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, format } = req.body || {};
  
  console.log('Extracted URL:', url);
  console.log('Extracted Format:', format);

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // Actually validate the URL
    const validatedUrl = new URL(url);
    console.log('URL validated:', validatedUrl.href);
    
    // Return custom test cases based on the provided URL
    const hostname = validatedUrl.hostname;
    
    // Generate more realistic dummy test cases
    return res.status(200).json({ 
      success: true, 
      testCases: [
        `Test Case 1: Verify page loads at ${url} with correct title`,
        `Test Case 2: Verify navigation menu is present on ${hostname}`,
        `Test Case 3: Test search functionality on ${hostname}`,
        `Test Case 4: Verify responsive design on mobile viewports`,
        `Test Case 5: Test form submission on ${hostname}`,
        `Test Case 6: Verify ${format} format output is correct`
      ]
    });
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error instanceof TypeError && error.code === 'ERR_INVALID_URL') {
      return res.status(400).json({ success: false, error: 'Invalid URL format: ' + error.message });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error processing request: ' + error.message 
    });
  }
};
