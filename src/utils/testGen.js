// Conditionally import puppeteer based on environment
let puppeteer;
let chromium;
let chromeAWSLambda;

// Check if we're in a Vercel serverless environment
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Local development
  puppeteer = require('puppeteer');
} else {
  // Vercel serverless environment
  puppeteer = require('puppeteer-core');
  try {
    chromium = require('@sparticuz/chromium-min');
  } catch (e) {
    console.log('Could not load @sparticuz/chromium-min:', e.message);
  }
  try {
    chromeAWSLambda = require('chrome-aws-lambda');
  } catch (e) {
    console.log('Could not load chrome-aws-lambda:', e.message);
  }
}

// In-memory storage for page analysis results
// This will be lost on serverless function restarts, but works for short sessions
const pageCache = {};

// Utility functions (keep these as they are)
function generateXPath(element) {
  // Existing implementation...
}

function generateCSSSelector(element) {
  // Existing implementation...
}

function identifyButtonPurpose(button) {
  // Existing implementation...
}

// Main function - now with incremental mode support
async function generateTestCases(url, options = {}) {
  const { mode = 'first', sessionId = null, elementType = 'button', elementIndex = 0 } = options;
  const format = options.format || 'plain';
  
  // For subsequent calls, use cached page data if available
  if (mode === 'next' && sessionId && pageCache[sessionId]) {
    return generateNextTest(sessionId, elementType, elementIndex);
  }
  
  // For first call, analyze the page
  let browser;
  const NAVIGATION_TIMEOUT = 12000; // 12 seconds for page load

  try {
    console.time('initial-analysis');
    
    // Launch browser with minimal options
    if (isDev) {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    } else {
      try {
        if (chromium) {
          browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
          });
        } else if (chromeAWSLambda) {
          browser = await puppeteer.launch({
            args: chromeAWSLambda.args,
            executablePath: await chromeAWSLambda.executablePath,
            headless: true
          });
        }
      } catch (e) {
        console.error('Browser launch error:', e);
        throw e;
      }
    }

    // Create page with resource blocking
    const page = await browser.newPage();
    
    // Block heavy resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'document' || resourceType === 'script') {
        req.continue();
      } else {
        req.abort();
      }
    });
    
    // Set timeouts
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    
    // Navigate with minimal wait
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extract basic page data
    const pageData = {
      url,
      title: await page.title(),
      extractedAt: new Date().toISOString()
    };

    // Extract buttons
    try {
      pageData.buttons = await page.$$eval(
        'button, input[type="submit"], input[type="button"], .btn, [role="button"]', 
        buttons => buttons.map(button => ({
          text: button.textContent?.trim() || button.value || button.innerText || 'Unnamed Button',
          type: button.type || 'button',
          id: button.id || '',
          name: button.name || '',
          class: button.className || ''
        }))
      );
      console.log(`Extracted ${pageData.buttons.length} buttons`);
    } catch (e) {
      console.log('Button extraction error:', e.message);
      pageData.buttons = [];
    }

    // Extract forms (very basic)
    try {
      pageData.forms = await page.$$eval(
        'form', 
        forms => forms.map(form => ({
          id: form.id || '',
          action: form.action || '',
          method: form.method || ''
        }))
      );
      console.log(`Extracted ${pageData.forms.length} forms`);
    } catch (e) {
      console.log('Form extraction error:', e.message);
      pageData.forms = [];
    }

    // Extract links (very basic)
    try {
      pageData.links = await page.$$eval(
        'a[href]', 
        links => links.map(link => ({
          text: link.textContent?.trim() || 'Unnamed Link',
          href: link.href || '',
          id: link.id || ''
        }))
      );
      console.log(`Extracted ${pageData.links.length} links`);
    } catch (e) {
      console.log('Link extraction error:', e.message);
      pageData.links = [];
    }

    // Close browser
    await browser.close();
    browser = null;
    console.timeEnd('initial-analysis');
    
    // Generate a session ID
    const newSessionId = Math.random().toString(36).substring(2, 15);
    
    // Store in cache with counts of unprocessed elements
    pageCache[newSessionId] = {
      pageData,
      processed: {
        buttons: 0,
        forms: 0,
        links: 0
      },
      hasMore: {
        buttons: pageData.buttons.length > 0,
        forms: pageData.forms.length > 0,
        links: pageData.links.length > 0
      }
    };
    
    // Generate first test (always page verification)
    const firstTest = {
      id: 'TC_PAGE_1',
      title: `Verify ${pageData.title || 'Page'} Loads Correctly`,
      description: `Test that the page loads successfully with the correct title`,
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
          expected: `Title is "${pageData.title || 'Expected Title'}"`
        }
      ]
    };
    
    // Return first test with session info
    return { 
      success: true, 
      sessionId: newSessionId,
      testCases: [firstTest],
      nextElementType: pageData.buttons.length > 0 ? 'button' : 
                      (pageData.forms.length > 0 ? 'form' : 
                      (pageData.links.length > 0 ? 'link' : null)),
      nextElementIndex: 0,
      hasMoreElements: pageData.buttons.length > 0 || pageData.forms.length > 0 || pageData.links.length > 0
    };

  } catch (error) {
    console.error('Error in test generation:', error);
    if (browser) await browser.close();
    return { 
      success: false, 
      error: `Test generation error: ${error.message}`
    };
  }
}

// Function to generate the next test from cached page data
function generateNextTest(sessionId, elementType, elementIndex) {
  // Get cached page data
  const cache = pageCache[sessionId];
  if (!cache) {
    return { 
      success: false, 
      error: 'Session expired or not found'
    };
  }
  
  // Generate test based on element type and index
  const pageData = cache.pageData;
  let testCase = null;
  let nextElementType = elementType;
  let nextElementIndex = elementIndex + 1;
  let hasMoreElements = true;
  
  // Handle different element types
  if (elementType === 'button') {
    if (elementIndex < pageData.buttons.length) {
      const button = pageData.buttons[elementIndex];
      testCase = {
        id: `TC_BTN_${elementIndex + 1}`,
        title: `Verify "${button.text}" Button Functionality`,
        description: `Test interaction with the ${button.text} button`,
        priority: button.type === 'submit' ? 'High' : 'Medium',
        steps: [
          {
            step: 1,
            action: `Locate the "${button.text}" button`,
            expected: 'Button is visible and enabled'
          },
          {
            step: 2,
            action: `Click the "${button.text}" button`,
            expected: 'Button responds appropriately to the click action'
          }
        ]
      };
      
      // Update processed count
      cache.processed.buttons = elementIndex + 1;
    }
    
    // Check if we need to move to next element type
    if (nextElementIndex >= pageData.buttons.length) {
      nextElementType = pageData.forms.length > 0 ? 'form' : 
                        (pageData.links.length > 0 ? 'link' : null);
      nextElementIndex = 0;
    }
  } 
  else if (elementType === 'form') {
    if (elementIndex < pageData.forms.length) {
      const form = pageData.forms[elementIndex];
      testCase = {
        id: `TC_FORM_${elementIndex + 1}`,
        title: `Verify Form Submission`,
        description: `Test form functionality${form.id ? ` for form #${form.id}` : ''}`,
        priority: 'High',
        steps: [
          {
            step: 1,
            action: 'Locate the form',
            expected: 'Form is visible and accessible'
          },
          {
            step: 2,
            action: 'Fill in required fields with valid data',
            expected: 'All fields accept input correctly'
          },
          {
            step: 3,
            action: 'Submit the form',
            expected: 'Form submits successfully'
          }
        ]
      };
      
      // Update processed count
      cache.processed.forms = elementIndex + 1;
    }
    
    // Check if we need to move to next element type
    if (nextElementIndex >= pageData.forms.length) {
      nextElementType = pageData.links.length > 0 ? 'link' : null;
      nextElementIndex = 0;
    }
  }
  else if (elementType === 'link') {
    if (elementIndex < pageData.links.length) {
      const link = pageData.links[elementIndex];
      testCase = {
        id: `TC_LINK_${elementIndex + 1}`,
        title: `Verify "${link.text}" Link Navigation`,
        description: `Test navigation when clicking the ${link.text} link`,
        priority: 'Medium',
        steps: [
          {
            step: 1,
            action: `Locate the "${link.text}" link`,
            expected: 'Link is visible and clickable'
          },
          {
            step: 2,
            action: `Click the "${link.text}" link`,
            expected: 'Link navigates to the correct destination'
          }
        ]
      };
      
      // Update processed count
      cache.processed.links = elementIndex + 1;
    }
    
    // This is the last element type
    if (nextElementIndex >= pageData.links.length) {
      nextElementType = null;
      nextElementIndex = 0;
    }
  }
  
  // Check if we have more elements
  hasMoreElements = nextElementType !== null;
  
  // Return the test case
  if (testCase) {
    return {
      success: true,
      sessionId: sessionId,
      testCases: [testCase],
      nextElementType,
      nextElementIndex,
      hasMoreElements
    };
  } else {
    return {
      success: false,
      error: 'No more test cases available',
      hasMoreElements: false
    };
  }
}

// Export the function for use in API routes
module.exports = { generateTestCases };
