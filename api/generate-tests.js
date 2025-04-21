// api/generate-tests.js (simplified)
module.exports = async (req, res) => {
  // ... existing code ...
  
  try {
    // URL validation and other checks...
    
    // Main page analysis with browser
    const testData = await analyzePageWithBrowser(url);
    
    // Generate test cases in plain text format only
    const allTestCases = generateTestCasesFromPageData(testData);
    const firstPageTestCases = allTestCases.slice(0, pageSize);
    
    // Create session for pagination
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    // Store in cache
    sessionCache[newSessionId] = {
      pageData: testData,
      allTestCases: allTestCases,
      timestamp: Date.now()
    };
    
    // Only return plain text format from API
    return res.status(200).json({
      success: true,
      pageData: testData,
      testCases: firstPageTestCases,
      sessionId: newSessionId,
      page: 1,
      pageSize: pageSize,
      totalTestCases: allTestCases.length,
      hasMore: allTestCases.length > pageSize,
      totalPages: Math.ceil(allTestCases.length / pageSize)
    });
    
  } catch (error) {
    // Error handling...
  }
};
