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

// Utility function to generate XPath
function generateXPath(element) {
  try {
    let path = '';
    while (element.parentElement && element.parentElement.tagName !== 'BODY') {
      const siblings = Array.from(element.parentElement.children);
      const index = siblings.indexOf(element) + 1;
      path = `/${element.tagName.toLowerCase()}[${index}]${path}`;
      element = element.parentElement;
    }
    return `//${element.tagName.toLowerCase()}${path}`;
  } catch {
    return '';
  }
}

// Utility function to generate CSS Selector
function generateCSSSelector(element) {
  try {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ').join('.')}`;
    return '';
  } catch {
    return '';
  }
}

// Identify button purpose
function identifyButtonPurpose(button) {
  const text = (button.text || '').toLowerCase();
  const classNames = (button.class || '').toLowerCase();
  
  const purposes = {
    'submit': ['submit', 'send', 'confirm', 'go'],
    'login': ['log in', 'signin', 'login', 'sign in'],
    'signup': ['sign up', 'register', 'create account', 'join'],
    'search': ['search', 'find', 'look up'],
    'navigation': ['next', 'previous', 'back', 'forward', 'page'],
    'action': ['add', 'edit', 'delete', 'update', 'create']
  };

  for (const [purpose, keywords] of Object.entries(purposes)) {
    if (keywords.some(keyword => text.includes(keyword) || classNames.includes(keyword))) {
      return purpose;
    }
  }

  return 'generic';
}

// Generate comprehensive test cases
function generateDetailedTestCases(pageData) {
  const testCases = [];

  // Button interaction test cases
  pageData.buttons.forEach((button, index) => {
    testCases.push({
      id: `TC_BTN_${index + 1}`,
      title: `Verify ${button.text || 'Button'} Functionality`,
      description: `Test interaction with button having purpose: ${button.purpose}`,
      selectors: {
        id: button.id,
        name: button.name,
        xpath: button.xpath,
        cssSelector: button.cssSelector
      },
      steps: [
        {
          step: 1,
          action: `Locate button "${button.text}"`,
          selector: button.xpath || button.cssSelector,
          expectedResult: 'Button is visible and enabled',
          type: 'verify_element'
        },
        {
          step: 2,
          action: `Click button "${button.text}"`,
          selector: button.xpath || button.cssSelector,
          expectedResult: 'Button responds appropriately',
          type: 'interaction'
        }
      ],
      priority: button.purpose === 'submit' ? 'High' : 'Medium'
    });
  });

  // Additional test cases for other elements can be added here

  return testCases;
}

async function generateTestCases(url, format = 'plain') {
  let browser;
  const TOTAL_TIMEOUT = 30000; // 30 seconds total
  const NAVIGATION_TIMEOUT = 20000; // 20 seconds for page load
  const ELEMENT_TIMEOUT = 10000; // 10 seconds for element extraction

  try {
    // Set up a global timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Total test generation timeout exceeded'));
      }, TOTAL_TIMEOUT);
    });

    // Actual test generation logic
    const testGenerationPromise = async () => {
      // Launch browser with specific timeout configurations
      if (isDev) {
        browser = await puppeteer.launch({ 
          headless: true,
          timeout: NAVIGATION_TIMEOUT,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } else {
        // Serverless environment launch
        try {
          if (chromeAWSLambda) {
            browser = await puppeteer.launch({
              args: chromeAWSLambda.args,
              executablePath: await chromeAWSLambda.executablePath,
              headless: true,
              timeout: NAVIGATION_TIMEOUT
            });
          } else if (chromium) {
            browser = await puppeteer.launch({
              args: chromium.args,
              executablePath: await chromium.executablePath(),
              headless: chromium.headless,
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
      
      // Set conservative page-level timeouts
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
      page.setDefaultTimeout(ELEMENT_TIMEOUT);

      try {
        // Graceful navigation with timeout handling
        await Promise.race([
          page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: NAVIGATION_TIMEOUT 
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Page load timeout')), NAVIGATION_TIMEOUT)
          )
        ]);

        // Implement fallback if primary wait fails
        await page.waitForSelector('body', { timeout: ELEMENT_TIMEOUT });

        // Initialize page data container
        const pageData = {
          url,
          title: await page.title(),
          buttons: [],
          forms: [],
          inputs: [],
          links: []
        };

        // Parallel element extraction with individual timeouts
        pageData.buttons = await Promise.race([
          page.$$eval(
            'button, input[type="button"], input[type="submit"], .btn, [role="button"]', 
            buttons => buttons.map(button => ({
              text: button.textContent.trim() || button.value || button.innerText || 'Unnamed Button',
              type: button.type || 'button',
              id: button.id || '',
              name: button.name || '',
              class: button.className || '',
              xpath: generateXPath(button),
              cssSelector: generateCSSSelector(button),
              purpose: identifyButtonPurpose({
                text: button.textContent.trim() || button.value || button.innerText,
                class: button.className
              })
            }))
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Button extraction timeout')), ELEMENT_TIMEOUT)
          )
        ]);

        // Generate test cases based on extracted elements
        const testCases = generateDetailedTestCases(pageData);

        // Close browser
        await browser.close();

        return { 
          success: true, 
          pageData, 
          testCases,
          url 
        };

      } catch (pageError) {
        console.error('Page analysis error:', pageError);
        
        // Ensure browser is closed
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.error('Error closing browser:', closeError);
          }
        }

        return { 
          success: false, 
          error: `Page analysis failed: ${pageError.message}`,
          details: {
            url,
            errorType: pageError.name,
            errorMessage: pageError.message
          }
        };
      }
    };

    // Race the test generation against total timeout
    return await Promise.race([
      testGenerationPromise(),
      timeoutPromise
    ]);

  } catch (globalError) {
    console.error('Global test generation error:', globalError);
    return {
      success: false,
      error: `Test generation failed: ${globalError.message}`,
      fallbackSuggestion: 'Try a simpler website or check network connectivity'
    };
  }
}

// Export the function for use in API routes
module.exports = { generateTestCases };
