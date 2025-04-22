/**
 * API endpoint for exporting test cases in various formats
 */
const { 
  exportToMaestro, 
  exportToKatalon, 
  exportToTestRail,
  exportToHtml,
  exportToPlainText 
} = require('../src/utils/exportFormats');
const { pageCache } = require('../src/utils/testGen');

// Helper function to verify user subscription
async function verifySubscription(userId) {
  // This would typically query your database or auth service
  // Placeholder implementation
  if (!userId) return false;
  
  try {
    // Example implementation - replace with your actual auth check
    // const user = await db.users.findOne({ id: userId });
    // return user?.subscription?.status === 'active';
    
    // For demo purposes, checking a dummy userId
    return userId === 'premium-user-123';
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  // Log the start of the function to help with debugging
  console.log('[API] Processing export-test request');
  
  try {
    const { sessionId, format } = req.body || {};
    
    // Log the request parameters
    console.log(`Request params: ${JSON.stringify({ sessionId, format })}`);
    
    // Get user information from request
    const userId = req.headers.authorization?.split(' ')[1];
    
    if (!sessionId || !pageCache[sessionId]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired session ID'
      });
    }
    
    // Check if user has premium subscription
    const isPremium = await verifySubscription(userId);
    
    // Check format restrictions for free users
    if (!isPremium && ['maestro', 'katalon', 'testrail', 'csv', 'html'].includes(format)) {
      return res.status(200).json({
        success: false,
        error: 'This export format is only available with a Pro subscription',
        upgradeRequired: true
      });
    }
    
    const sessionData = pageCache[sessionId];
    let exportData = null;
    let filename = 'test-cases';
    let contentType = 'application/json';
    
    switch (format) {
      case 'maestro':
        exportData = exportToMaestro(sessionData.pageData, sessionData.testCases);
        filename = 'maestro-flow.yaml';
        contentType = 'application/yaml';
        break;
        
      case 'katalon':
        exportData = exportToKatalon(sessionData.pageData, sessionData.testCases);
        filename = 'katalon-tests.tc';
        contentType = 'application/octet-stream';
        break;
        
      case 'testrail':
        exportData = exportToTestRail(sessionData.pageData, sessionData.testCases);
        filename = 'testrail-import.csv';
        contentType = 'text/csv';
        break;
        
      case 'html':
        exportData = exportToHtml(sessionData.pageData, sessionData.testCases);
        filename = 'test-cases.html';
        contentType = 'text/html';
        break;
        
      case 'txt':
        exportData = exportToPlainText(sessionData.pageData, sessionData.testCases);
        filename = 'test-cases.txt';
        contentType = 'text/plain';
        break;

      case 'json':
      default:
        exportData = JSON.stringify(sessionData.testCases, null, 2);
        filename = 'test-cases.json';
        contentType = 'application/json';
    }
    
    return res.status(200).json({
      success: true,
      exportData,
      filename,
      contentType
    });
  } catch (error) {
    console.error('Error in export-test:', error);
    return res.status(500).json({
      success: false,
      error: `Export error: ${error.message || 'Unknown error'}`
    });
  }
};
