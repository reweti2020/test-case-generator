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
  
  // Debug: Log all incoming data
  console.log('API Route Called');
  console.log('Request Method:', req.method);
  console.log('Request Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, format } = req.body || {};
  
  console.log('Extracted URL:', url);
  console.log('Extracted Format:', format);

  // Debug: Skip the actual test generation and just return success
  return res.status(200).json({ 
    success: true, 
    testCases: [
      "Debug Test Case 1: This is a test case",
      "Debug Test Case 2: Another test case"
    ]
  });
};
