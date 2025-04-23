// api/generate-incremental.js
// Ultra-simplified version that just returns static data

module.exports = async (req, res) => {
  console.log('[API] Test generation request received');
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Extract basic request info
    const body = req.body || {};
    const url = body.url || 'https://example.com';
    const mode = body.mode || 'first';
    
    console.log(`Request received: mode=${mode}, url=${url}`);
    
    // Generate a simple test case
    const testCase = {
      id: 'TC_PAGE_1',
      title: 'Verify Page Loads Correctly',
      description: 'Test that the page loads successfully with the correct title',
      priority: 'High',
      steps: [
        {
          step: 1,
          action: `Navigate to ${url}`,
          expected: 'Page loads without errors'
        },
        {
          step: 2,
          action: 'Verify page title',
          expected: 'Title is "Example Domain"'
        }
      ]
    };
    
    // Simplified mock page data
    const mockPageData = {
      url: url,
      title: 'Example Domain',
      extractedAt: new Date().toISOString(),
      buttons: [{ text: 'Sample Button', id: 'btn1' }],
      forms: [{ id: 'form1' }],
      links: [{ text: 'Sample Link', href: '#' }],
      inputs: [{ type: 'text', id: 'input1' }]
    };
    
    // Mock processed data
    const mockProcessed = {
      buttons: mode === 'first' ? 0 : 1,
      forms: 0,
      links: 0,
      inputs: 0
    };
    
    // Create a mock session ID
    const sessionId = 'test-session-' + Math.random().toString(36).substring(2, 10);
    
    // Return a dummy response
    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      pageData: mockPageData,
      processed: mockProcessed,
      testCases: [testCase],
      nextElementType: 'button',
      nextElementIndex: 0,
      hasMoreElements: true,
      totalTestCases: 1
    });
    
  } catch (error) {
    console.error('Error in simplified generate-incremental:', error);
    
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};
