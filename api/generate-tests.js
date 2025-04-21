// api/generate-tests.js - Streamlined version with real functionality
// Conditionally import puppeteer based on environment
let puppeteer;
let chromium;

try {
  // Try loading puppeteer-core for serverless environment
  puppeteer = require('puppeteer-core');
  console.log('Loaded puppeteer-core');
  
  try {
    // Try loading chromium for serverless environment
    chromium = require('@sparticuz/chromium-min');
    console.log('Loaded @sparticuz/chromium-min');
  } catch (e) {
    console.log('Could not load @sparticuz/chromium-min:', e.message);
    try {
      // Fallback to chrome-aws-lambda
      chromium = require('chrome-aws-lambda');
      console.log('Loaded chrome-aws-lambda as fallback');
    } catch (e2) {
      console.log('Could not load chrome-aws-lambda:', e2.message);
    }
  }
} catch (e) {
  console.log('Could not load puppeteer-core, attempting puppeteer:', e.message);
  try {
    // Fallback to regular puppeteer (dev environment)
    puppeteer = require('puppeteer');
    console.log('Loaded puppeteer');
  } catch (e2) {
    console.log('Could not load puppeteer:', e2.message);
  }
}

// Main API handler
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
  
  console.log('API Route Called, Method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, format } = req.body || {};
  console.log('Processing URL:', url, 'Format:', format);

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // Validate URL - carefully handle validation to avoid errors
    try {
      new URL(url);
    } catch (urlError) {
      // If URL is invalid, return a friendly error instead of a 400
      return res.status(200).json({ 
        success: false, 
        error: 'Please provide a valid URL (include http:// or https://)',
        testCases: [
          "Could not analyze the provided URL",
          "Please ensure it includes http:// or https://"
        ]
      });
    }
    
    console.log('URL validated, attempting browser launch...');
    
    // Check if we have necessary browser components
    if (!puppeteer) {
      console.log('No puppeteer available, using fallback test cases');
      return res.status(200).json({
        success: true,
        note: "Browser automation not available, using fallback test cases",
        testCases: [
          `Test Case 1: Verify page loads at ${url}`,
          `Test Case 2: Test navigation menu functionality`,
          `Test Case 3: Verify responsive design on mobile devices`,
          `Test Case 4: Test form submission with valid data`,
          `Test Case 5: Verify search functionality works correctly`,
          `Test Case 6: Test ${format || 'plain'} format output`
        ]
      });
    }
    
    // Create a timeout promise to prevent exceeding Vercel's function execution time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - URL analysis took too long')), 20000);
    });
    
    // Try to launch browser with timeout protection
    let browser;
    try {
      const browserPromise = (async () => {
        console.log('Launching browser...');
        if (chromium) {
          return await puppeteer.launch({
            args: chromium.args || ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath || undefined,
            headless: true,
          });
        } else {
          return await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
        }
      })();
      
      browser = await Promise.race([browserPromise, timeoutPromise]);
      console.log('Browser launched successfully');
      
      // Now proceed with page analysis
      const page = await browser.newPage();
      console.log('Page created');
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Page loaded');
      
      // Extract basic page info
      const title = await page.title();
      console.log('Page title:', title);
      
      // Count elements (with error handling)
      let buttonCount = 0;
      let linkCount = 0;
      let inputCount = 0;
      let formCount = 0;
      
      try {
        buttonCount = await page.$$eval('button', buttons => buttons.length);
      } catch (e) { console.log('Error counting buttons:', e.message); }
      
      try {
        linkCount = await page.$$eval('a', links => links.length);
      } catch (e) { console.log('Error counting links:', e.message); }
      
      try {
        inputCount = await page.$$eval('input', inputs => inputs.length);
      } catch (e) { console.log('Error counting inputs:', e.message); }
      
      try {
        formCount = await page.$$eval('form', forms => forms.length);
      } catch (e) { console.log('Error counting forms:', e.message); }
      
      console.log('Element counts:', { buttonCount, linkCount, inputCount, formCount });
      
      // Generate test cases
      const testCases = [
        `Test Case 1: Verify page loads at ${url} with correct title "${title}"`,
        `Test Case 2: Verify page contains ${buttonCount} buttons`,
        `Test Case 3: Verify page contains ${inputCount} input fields`,
        `Test Case 4: Verify page contains ${linkCount} links`,
        `Test Case 5: Verify page contains ${formCount} forms`
      ];
      
      // Close browser
      await browser.close();
      console.log('Browser closed');
      
      // Format output based on requested format
      let formattedOutput;
      if (format === 'katalon') {
        formattedOutput = `<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <name>Generated Test Suite for ${url}</name>
   <testCaseLink>
      <testCaseId>Test Cases/VerifyPageLoads</testCaseId>
      <guid>1</guid>
   </testCaseLink>
   <testCaseLink>
      <testCaseId>Test Cases/VerifyPageElements</testCaseId>
      <guid>2</guid>
      <variable>
         <name>buttonCount</name>
         <value>${buttonCount}</value>
      </variable>
   </testCaseLink>
</TestSuiteEntity>`;
      } else if (format === 'maestro') {
        formattedOutput = `# Generated Maestro flow for ${url}
appId: ${new URL(url).hostname}
---
- launchUrl: ${url}
- assertVisible: ${title}
- waitForAnimationToEnd
- takeScreenshot
`;
      } else {
        formattedOutput = testCases;
      }
      
      return res.status(200).json({ success: true, testCases: formattedOutput });
      
    } catch (browserError) {
      console.error('Error with browser operations:', browserError);
      if (browser) {
        try {
          await browser.close();
          console.log('Browser closed after error');
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
      
      // Return graceful fallback instead of error
      return res.status(200).json({
        success: true,
        note: "Browser automation had issues, using fallback test cases",
        testCases: [
          `Test Case 1: Verify page loads at ${url}`,
          `Test Case 2: Test navigation menu functionality`,
          `Test Case 3: Verify responsive design on mobile devices`,
          `Test Case 4: Test form submission with valid data`,
          `Test Case 5: Verify search functionality works correctly`
        ]
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error.message, error.stack);
    
    // Return a 200 OK with error information rather than a 500 error
    return res.status(200).json({ 
      success: true,
      note: "An error occurred but we still generated basic test cases",
      error: error.message,
      testCases: [
        `Test Case 1: Verify page loads at ${url}`,
        `Test Case 2: Test navigation menu functionality`,
        `Test Case 3: Verify responsive design on mobile devices`,
        `Test Case 4: Test form submission with valid data`,
        `Test Case 5: Verify search functionality works correctly`
      ]
    });
  }
};
