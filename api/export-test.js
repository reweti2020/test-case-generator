// /api/export-tests.js - Serverless API for exporting test cases
const { pageCache } = require('../testGen');

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

// Export format functions

/**
 * Export to Maestro format
 * @param {Object} pageData - Page data
 * @param {Array} testCases - Test cases
 * @returns {String} - YAML format
 */
function exportToMaestro(pageData, testCases) {
  const maestroAppId = pageData.url.replace(/https?:\/\//, '').replace(/\/$/, '');
  
  let yamlContent = `appId: ${maestroAppId}\n---\n`;
  yamlContent += `- launchUrl: ${pageData.url}\n`;
  yamlContent += `- assertVisible: "${pageData.title}"\n\n`;
  
  testCases.forEach(testCase => {
    // Add test case as a comment
    yamlContent += `# ${testCase.title}\n`;
    
    // Convert steps to Maestro flow steps
    testCase.steps.forEach(step => {
      // Skip the navigation step if it's not the first test case
      if (step.step === 1 && step.action.includes('Navigate to') && testCases.indexOf(testCase) > 0) {
        return;
      }
      
      // Parse the action to create Maestro commands
      if (step.action.includes('Click')) {
        yamlContent += `- tapOn: "${extractElementName(step.action)}"\n`;
      } else if (step.action.includes('Enter')) {
        const inputField = extractInputField(step.action);
        yamlContent += `- inputText: "test_value"\n`;
        yamlContent += `  into: "${inputField}"\n`;
      } else if (step.action.includes('Verify')) {
        yamlContent += `- assertVisible: "${extractExpectedText(step.expected)}"\n`;
      }
    });
    
    yamlContent += '\n';
  });
  
  return yamlContent;
}

/**
 * Export to Katalon format
 * @param {Object} pageData - Page data
 * @param {Array} testCases - Test cases
 * @returns {String} - XML format
 */
function exportToKatalon(pageData, testCases) {
  let katalon = '';
  
  testCases.forEach((testCase, index) => {
    const testCaseId = testCase.id.replace('TC_', '');
    const guid = generateGuid();
    
    katalon += `<?xml version="1.0" encoding="UTF-8"?>\n`;
    katalon += `<TestCaseEntity>\n`;
    katalon += `   <name>${testCase.id}</name>\n`;
    katalon += `   <tag></tag>\n`;
    katalon += `   <comment>${testCase.description}</comment>\n`;
    katalon += `   <testCaseGuid>${guid}</testCaseGuid>\n`;
    
    // Add variables if needed
    if (testCase.title.includes('Form') || testCase.title.includes('Input')) {
      katalon += `   <variable>\n`;
      katalon += `      <name>testValue</name>\n`;
      katalon += `      <value>sample_value</value>\n`;
      katalon += `   </variable>\n`;
    }
    
    katalon += `</TestCaseEntity>\n\n`;
  });
  
  return katalon;
}

/**
 * Export to TestRail format
 * @param {Object} pageData - Page data
 * @param {Array} testCases - Test cases
 * @returns {String} - CSV format
 */
function exportToTestRail(pageData, testCases) {
  let csv = 'Title,Type,Priority,Preconditions,Steps,Expected Result,References\n';
  
  testCases.forEach(testCase => {
    const title = escapeCsvField(testCase.title);
    const type = 'Functional';
    const priority = escapeCsvField(testCase.priority);
    const preconditions = 'None';
    
    // Collect steps and expected results
    let steps = '';
    let expectedResults = '';
    
    testCase.steps.forEach(step => {
      steps += `${step.step}. ${step.action}\n`;
      expectedResults += `${step.step}. ${step.expected}\n`;
    });
    
    // Escape and format
    const stepsFormatted = escapeCsvField(steps.trim());
    const expectedFormatted = escapeCsvField(expectedResults.trim());
    const references = testCase.id;
    
    csv += `${title},${type},${priority},${preconditions},${stepsFormatted},${expectedFormatted},${references}\n`;
  });
  
  return csv;
}

/**
 * Export to HTML format
 * @param {Object} pageData - Page data
 * @param {Array} testCases - Test cases
 * @returns {String} - HTML format
 */
function exportToHtml(pageData, testCases) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Cases for ${pageData.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1 { color: #333; }
    .test-case { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; border-radius: 5px; }
    .test-case h2 { margin-top: 0; color: #0066cc; }
    .test-case p { margin: 5px 0; }
    .priority-High { background-color: #ffe6e6; }
    .priority-Medium { background-color: #e6f2ff; }
    .priority-Low { background-color: #e6ffe6; }
    table { width: 100%; border
