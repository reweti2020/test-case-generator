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

// Utility function to generate XPath (optimized)
function generateXPath(element) {
  try {
    // Use ID if available for faster XPath
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    // Use simplified XPath for faster generation
    let path = '';
    let maxIterations = 3; // Limit depth to avoid slow computation
    let currentElement = element;
    let iterations = 0;
    
    while (currentElement.parentElement && iterations < maxIterations) {
      const siblings = Array.from(currentElement.parentElement.children);
      const index = siblings.indexOf(currentElement) + 1;
      path = `/${currentElement.tagName.toLowerCase()}[${index}]${path}`;
      currentElement = currentElement.parentElement;
      iterations++;
    }
    
    return `//${currentElement.tagName.toLowerCase()}${path}`;
  } catch {
    return '';
  }
}

// Utility function to generate CSS Selector (optimized)
function generateCSSSelector(element) {
  try {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      // Take only first class to avoid complex selectors
      const firstClass = element.className.split(' ')[0];
      if (firstClass) return `.${firstClass}`;
    }
    return element.tagName ? element.tagName.toLowerCase() : '';
  } catch {
    return '';
  }
}

// Identify button purpose (optimized with common patterns)
function identifyButtonPurpose(button) {
  const text = (button.text || '').toLowerCase();
  const classNames = (button.class || '').toLowerCase();
  
  // Quick check for common button types (faster than looping through all types)
  if (text.includes('submit') || text.includes('send') || text.includes('save')) return 'submit';
  if (text.includes('log in') || text.includes('login') || text.includes('sign in')) return 'login';
  if (text.includes('search') || text.includes('find')) return 'search';
  if (text.includes('cancel') || text.includes('close')) return 'cancel';
  
  // Default purpose
  return 'action';
}

// Generate comprehensive test cases (optimized)
function generateDetailedTestCases(pageData) {
  const testCases = [];
  
  // Generate high-priority test cases for important elements first
  
  // Homepage verification case
  testCases.push({
    id: 'TC_PAGE_1',
    title: `Verify ${pageData.title || 'Page'} Loads Correctly`,
    description: `Test that the page loads and displays all expected elements`,
    priority: 'High',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully without errors'
      },
      {
        step: 2,
        action: 'Verify page title',
        expected: `Page title is "${pageData.title || 'Expected title'}"`
      }
    ]
  });
  
  // Button test cases (limited to first 10 to avoid timeouts)
  const priorityButtons = pageData.buttons.slice(0, 10);
  priorityButtons.forEach((button, index) => {
    if (!button.text) return; // Skip buttons without text
    
    testCases.push({
      id: `TC_BTN_${index + 1}`,
      title: `Verify "${button.text}" Button Functionality`,
      description: `Test interaction with the ${button.text} button`,
      selectors: {
        id: button.id,
        name: button.name,
        xpath: button.xpath,
        cssSelector: button.cssSelector
      },
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
      ],
      priority: button.purpose === 'submit' || button.purpose === 'login' ? 'High' : 'Medium'
    });
  });
  
  // Form test cases if available
  if (pageData.forms && pageData.forms.length > 0) {
    const priorityForms = pageData.forms.slice(0, 3);
    priorityForms.forEach((form, index) => {
      testCases.push({
        id: `TC_FORM_${index + 1}`,
        title: `Verify Form Submission`,
        description: `Test form completion and submission functionality`,
        priority: 'High',
        steps: [
          {
            step: 1,
            action: 'Locate form on page',
            expected: 'Form is visible and accessible'
          },
          {
            step: 2,
            action: 'Fill in all required fields with valid data',
            expected: 'All fields accept input'
          },
          {
            step: 3,
            action: 'Submit the form',
            expected: 'Form submits without errors'
          }
        ]
      });
    });
  }
  
  return testCases;
}

async function generateTestCases(url, format = 'plain') {
  let browser;
  const TOTAL_TIMEOUT = 25000; // 25 seconds total (reduced from 30)
  const NAVIGATION_TIMEOUT = 15000; // 15 seconds for page load (reduced from 20)
  const ELEMENT_TIMEOUT = 5000; // 5 seconds for element extraction (reduced from 10)

  try {
    // Set up a global timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Total test generation timeout exceeded'));
      }, TOTAL_TIMEOUT);
    });

    // Actual test generation logic
    const testGenerationPromise = async () => {
      // Optimized launch options
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1024,768'
        ],
        defaultViewport: { width: 1024, height: 768 }
      };

      // Launch browser with environment-specific options
      if (isDev) {
        browser = await puppeteer.launch({
          ...launchOptions,
          timeout: NAVIGATION_TIMEOUT
        });
      } else {
        // Serverless environment launch
        try {
          if (chromeAWSLambda) {
            browser = await puppeteer.launch({
              args: [...chromeAWSLambda.args, ...launchOptions.args],
              executablePath: await chromeAWSLambda.executablePath,
              headless: true,
              defaultViewport: launchOptions.defaultViewport,
              timeout: NAVIGATION_TIMEOUT
            });
          } else if (chromium) {
            browser = await puppeteer.launch({
              args: [...chromium.args, ...launchOptions.args],
              executablePath: await chromium.executablePath(),
              headless: chromium.headless,
              defaultViewport: launchOptions.defaultViewport,
              timeout: NAVIGATION_TIMEOUT
            });
          } else {
            throw new Error('No compatible browser automation library available');
          }
        } catch (launchError) {
          console.error('Browser launch error:', launchError);
          throw launchError;
        }
      }

      const page = await browser.newPage();
      
      // Block non-essential resources to speed up page load
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // Set conservative page-level timeouts
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
      page.setDefaultTimeout(ELEMENT_TIMEOUT);

      try {
        // Graceful navigation with faster wait condition
        await Promise.race([
          page.goto(url, { 
            waitUntil: 'domcontentloaded', // Faster than networkidle0
            timeout: NAVIGATION_TIMEOUT 
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Page load timeout')), NAVIGATION_TIMEOUT)
          )
        ]);

        // Quick check that body exists
        await page.waitForSelector('body', { timeout: 5000 });

        // Initialize page data container
        const pageData = {
          url,
          title: await page.title(),
          buttons: [],
          forms: [],
          inputs: [],
          links: []
        };

        // Extract buttons with timeout protection
        try {
          pageData.buttons = await Promise.race([
            page.$$eval(
              'button, input[type="button"], input[type="submit"], .btn, [role="button"]', 
              buttons => buttons.slice(0, 20).map(button => ({ // Limit to first 20 buttons
                text: button.textContent?.trim() || button.value || button.innerText || 'Unnamed Button',
                type: button.type || 'button',
                id: button.id || '',
                name: button.name || '',
                class: button.className || '',
                xpath: button.id ? `//*[@id="${button.id}"]` : '',
                cssSelector: button.id ? `#${button.id}` : (button.className ? `.${button.className.split(' ')[0]}` : '')
              }))
            ),
            new Promise((_, reject) => 
              setTimeout(() => {
                console.log('Button extraction timeout - returning partial results');
                return [];
              }, ELEMENT_TIMEOUT)
            )
          ]);
        } catch (buttonError) {
          console.log('Button extraction error:', buttonError.message);
          pageData.buttons = []; // Continue with empty buttons array
        }

        // Extract forms with timeout protection
        try {
          pageData.forms = await Promise.race([
            page.$$eval(
              'form', 
              forms => forms.slice(0, 5).map(form => ({ // Limit to first 5 forms
                id: form.id || '',
                action: form.action || '',
                method: form.method || '',
                inputs: Array.from(form.querySelectorAll('input')).slice(0, 10).map(input => ({
                  type: input.type || '',
                  name: input.name || '',
                  id: input.id || ''
                }))
              }))
            ),
            new Promise((_, reject) => 
              setTimeout(() => {
                console.log('Form extraction timeout - returning partial results');
                return [];
              }, ELEMENT_TIMEOUT)
            )
          ]);
        } catch (formError) {
          console.log('Form extraction error:', formError.message);
          pageData.forms = []; // Continue with empty forms array
        }

        // Generate test cases based on extracted elements
        const testCases = generateDetailedTestCases(pageData);

        // Close browser
        await browser.close();
        browser = null;

        return { 
          success: true, 
          pageData, 
          testCases,
          url 
        };

      } catch (pageError) {
        console.error('Page analysis error:', pageError);
        
        // Try to get any partial page data we can
        let partialPageData = {
          url,
          title: 'Unknown',
          buttons: [],
          error: pageError.message
        };
        
        try {
          // Try to at least get the title
          partialPageData.title = await page.title();
        } catch (e) {
          console.log('Could not get page title:', e.message);
        }
        
        // Ensure browser is closed
        if (browser) {
          try {
            await browser.close();
            browser = null;
          } catch (closeError) {
            console.error('Error closing browser:', closeError);
          }
        }

        // Return partial data with error
        return { 
          success: false, 
          error: `Page analysis failed: ${pageError.message}`,
          partialData: partialPageData,
          details: {
            url,
            errorType: pageError.name,
            errorMessage: pageError.message
          }
        };
      }
    };

    // Race the test generation against total timeout
    const result = await Promise.race([
      testGenerationPromise(),
      timeoutPromise
    ]);
    
    // Clean up browser if it's still open
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser in final cleanup:', e.message);
      }
    }
    
    return result;

  } catch (globalError) {
    console.error('Global test generation error:', globalError);
    
    // Clean up browser if it's still open
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser in error handler:', e.message);
      }
    }
    
    return {
      success: false,
      error: `Test generation failed: ${globalError.message}`,
      fallbackSuggestion: 'Try a simpler website or check network connectivity'
    };
  }
}

// Export the function for use in API routes
module.exports = { generateTestCases };
