// testGen.js - Optimized for Vercel serverless environment
const axios = require('axios');
const cheerio = require('cheerio');

// In-memory storage for page analysis results
const pageCache = {};

/**
 * Main function for test generation
 * @param {string} url - Website URL to analyze
 * @param {object} options - Generation options
 * @returns {object} - Generated test cases and session info
 */
async function generateTestCases(url, options = {}) {
  const { 
    mode = 'first', 
    sessionId = null, 
    elementType = 'button', 
    elementIndex = 0, 
    userPlan = 'free',  // Fixed missing comma here
    batchSize = 5       // Added batchSize parameter with default value
  } = options;
  
  // For subsequent calls, use cached page data if available
  if (mode === 'next' && sessionId && pageCache[sessionId]) {
    try {
      return generateNextTest(sessionId, elementType, elementIndex, userPlan, batchSize);
    } catch (error) {
      console.error('Error generating next test:', error);
      return { 
        success: false, 
        error: `Error generating next test: ${error.message}`
      };
    }
  }
  
// First-time call logic (analyzing website)
try {
  console.log(`Fetching URL: ${url}`);
  
  // Validate URL format first
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
    console.log(`Added protocol to URL: ${url}`);
  }
  
  // Fetch the HTML content with a timeout and better error handling
  const response = await axios.get(url, {
    timeout: 6000, // Reduced timeout for serverless environment 
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    maxContentLength: 1024 * 1024, // Limit to 1MB
    validateStatus: status => status < 500 // Accept all statuses under 500
  });
    
    // Check response status
    if (response.status !== 200) {
      return {
        success: false,
        error: `Failed to fetch URL (Status ${response.status})`
      };
    }
    
    console.log('URL fetched successfully, parsing HTML...');
    
    // Load HTML into cheerio with decodeEntities option to handle character encoding issues
    const $ = cheerio.load(response.data, {
      decodeEntities: true,
      normalizeWhitespace: false
    });
    
    // Extract basic page data
    const pageData = {
      url,
      title: $('title').text().trim() || 'Unknown Title',
      extractedAt: new Date().toISOString()
    };

    // Extract elements more efficiently
    // Extract buttons - limit to first 20 for performance
    pageData.buttons = [];
    $('button, input[type="submit"], input[type="button"], .btn, [role="button"]').slice(0, 20).each((i, el) => {
      const $el = $(el);
      pageData.buttons.push({
        text: $el.text().trim() || $el.val() || 'Unnamed Button',
        type: $el.attr('type') || 'button',
        id: $el.attr('id') || '',
        name: $el.attr('name') || '',
        class: $el.attr('class') || ''
      });
    });

    // Extract forms - limit to first 10
    pageData.forms = [];
    $('form').slice(0, 10).each((i, el) => {
      const $form = $(el);
      pageData.forms.push({
        id: $form.attr('id') || '',
        action: $form.attr('action') || '',
        method: $form.attr('method') || ''
      });
    });

    // Extract links - limit to first 15
    pageData.links = [];
    $('a[href]').slice(0, 15).each((i, el) => {
      const $link = $(el);
      pageData.links.push({
        text: $link.text().trim() || 'Unnamed Link',
        href: $link.attr('href') || '',
        id: $link.attr('id') || ''
      });
    });

    // Extract inputs - limit to first 15
    pageData.inputs = [];
    $('input[type!="submit"][type!="button"], textarea, select').slice(0, 15).each((i, el) => {
      const $input = $(el);
      pageData.inputs.push({
        type: $input.attr('type') || 'text',
        id: $input.attr('id') || '',
        name: $input.attr('name') || '',
        placeholder: $input.attr('placeholder') || ''
      });
    });

    console.log('HTML parsed successfully, creating session...');

    // Generate a session ID and store page data
    const newSessionId = Math.random().toString(36).substring(2, 15);
    pageCache[newSessionId] = {
      pageData,
      processed: {
        buttons: 0,
        forms: 0,
        links: 0, 
        inputs: 0
      },
      hasMore: {
        buttons: pageData.buttons.length > 0,
        forms: pageData.forms.length > 0,
        links: pageData.links.length > 0,
        inputs: pageData.inputs.length > 0
      },
      testCases: []
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
    
    // Add the test case to the cache
    pageCache[newSessionId].testCases.push(firstTest);
    
    // Determine next element to test
    const nextElementType = pageData.buttons.length > 0 ? 'button' : 
                     (pageData.forms.length > 0 ? 'form' : 
                     (pageData.inputs.length > 0 ? 'input' : 
                     (pageData.links.length > 0 ? 'link' : null)));
    
    // Check test case limits for free plan users
    const freeLimit = 10;
    const hasMoreElements = (userPlan !== 'free' || pageCache[newSessionId].testCases.length < freeLimit) && 
                      (pageData.buttons.length > 0 || pageData.forms.length > 0 || 
                       pageData.links.length > 0 || pageData.inputs.length > 0);
    
    console.log('First test case generated successfully');
    
    // Return first test with session info
    return { 
      success: true, 
      sessionId: newSessionId,
      testCases: [firstTest],
      nextElementType,
      nextElementIndex: 0,
      hasMoreElements,
      totalTestCases: pageCache[newSessionId].testCases.length,
      upgradeRequired: userPlan === 'free' && pageCache[newSessionId].testCases.length >= freeLimit
    };

  } catch (error) {
    console.error('Error in test generation:', error);
    return { 
      success: false, 
      error: `Test generation error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Function to generate the next batch of tests from cached page data
 * @param {string} sessionId - Session ID
 * @param {string} elementType - Type of element to test
 * @param {number} elementIndex - Index of element to test
 * @param {string} userPlan - User's subscription plan
 * @param {number} batchSize - Number of test cases to generate
 * @returns {object} - Generated test cases and session info
 */
function generateNextTest(sessionId, elementType, elementIndex, userPlan = 'free', batchSize = 5) {
  if (!sessionId || !pageCache[sessionId]) {
    return {
      success: false,
      error: 'Invalid or expired session ID'
    };
  }
  
  const session = pageCache[sessionId];
  
  // Check free plan limits
  const freeLimit = 10; // Set to 10 to match frontend limit
  if (userPlan === 'free' && session.testCases.length >= freeLimit) {
    return {
      success: false,
      error: 'Free plan limit reached',
      upgradeRequired: true,
      totalTestCases: session.testCases.length
    };
  }
  
  // Array to store newly generated test cases
  const newTestCases = [];
  
  // Initialize tracking variables
  let currentElementType = elementType;
  let currentElementIndex = elementIndex;
  let hasMoreElements = true;
  
  // Generate up to batchSize test cases
  for (let i = 0; i < batchSize; i++) {
    // Stop if we've reached the free user limit
    if (userPlan === 'free' && session.testCases.length + newTestCases.length >= freeLimit) {
      hasMoreElements = false;
      break;
    }
    
    // Stop if there are no more elements to process
    if (!currentElementType) {
      hasMoreElements = false;
      break;
    }
    
    // Get element collection based on type
    const elements = session.pageData[`${currentElementType}s`] || [];
    
    if (currentElementIndex >= elements.length) {
      // Find next element type that has unprocessed elements
      const types = ['button', 'form', 'link', 'input'];
      let foundNext = false;
      
      for (const type of types) {
        if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
          currentElementType = type;
          currentElementIndex = session.processed[`${type}s`];
          foundNext = true;
          break;
        }
      }
      
      if (!foundNext) {
        hasMoreElements = false;
        break;
      }
    }
    
    // Get the specific element
    const element = session.pageData[`${currentElementType}s`][currentElementIndex];
    
    // Generate a test case based on element type
    let testCase;
    switch (currentElementType) {
      case 'button':
        testCase = generateButtonTest(session.pageData, element, session.processed.buttons);
        break;
      case 'form':
        testCase = generateFormTest(session.pageData, element, session.processed.forms);
        break;
      case 'link':
        testCase = generateLinkTest(session.pageData, element, session.processed.links);
        break;
      case 'input':
        testCase = generateInputTest(session.pageData, element, session.processed.inputs);
        break;
      default:
        testCase = null;
    }
    
    if (testCase) {
      // Add the test case to our batch
      newTestCases.push(testCase);
      
      // Update processed count
      session.processed[`${currentElementType}s`]++;
      
      // Move to the next element
      currentElementIndex++;
      
      // Check if we've reached the end of this element type
      if (currentElementIndex >= session.pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ['button', 'form', 'input', 'link'];
        let foundNext = false;
        
        for (const type of types) {
          if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
            currentElementType = type;
            currentElementIndex = session.processed[`${type}s`];
            foundNext = true;
            break;
          }
        }
        
        if (!foundNext) {
          hasMoreElements = false;
          currentElementType = null;
        }
      }
    } else {
      // If we couldn't generate a test case, move to the next element
      currentElementIndex++;
      if (currentElementIndex >= session.pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ['button', 'form', 'input', 'link'];
        let foundNext = false;
        
        for (const type of types) {
          if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
            currentElementType = type;
            currentElementIndex = session.processed[`${type}s`];
            foundNext = true;
            break;
          }
        }
        
        if (!foundNext) {
          hasMoreElements = false;
          currentElementType = null;
        }
      }
    }
  }
  
  // Add all new test cases to the session
  session.testCases = session.testCases.concat(newTestCases);
  
  // Return the batch of new test cases and updated state
  return {
    success: true,
    testCases: newTestCases,
    nextElementType: currentElementType,
    nextElementIndex: currentElementIndex,
    hasMoreElements,
    totalTestCases: session.testCases.length,
    upgradeRequired: userPlan === 'free' && session.testCases.length >= freeLimit
  };
}

// Enhanced button test generation with intelligent expectations
function generateButtonTest(pageData, button, index) {
  // Ensure we have a valid button text
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonIdentifier = button.text ? `with text "${button.text}"` : 
                           button.id ? `with ID "${button.id}"` : 
                           `#${index + 1}`;
  
  // Generate specific expected result based on button text
  let expectedResult = inferButtonExpectation(buttonText);
  
  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${buttonText}`,
    description: `Verify that the "${buttonText}" button works correctly`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Find button ${buttonIdentifier}`,
        expected: 'Button is visible on the page'
      },
      {
        step: 3,
        action: 'Click the button',
        expected: expectedResult
      }
    ]
  };
}

/**
 * Infer what should happen when a button is clicked based on its text
 * @param {String} buttonText - The text of the button
 * @returns {String} - Expected result after clicking the button
 */
function inferButtonExpectation(buttonText) {
  buttonText = buttonText.toLowerCase();
  
  // Search/Filter buttons
  if (buttonText.includes('search') || buttonText.includes('find')) {
    return 'Search results are displayed based on the search criteria';
  }
  
  // Navigation-related buttons
  if (buttonText.includes('menu') || buttonText.includes('navigation')) {
    return 'Menu or navigation options are displayed';
  }
  
  // Comparison/Table buttons
  if (buttonText.includes('compar') || buttonText.includes('table')) {
    return 'Comparison table is displayed to the user';
  }
  
  // Form submission buttons
  if (buttonText.includes('submit') || buttonText.includes('send') || 
      buttonText.includes('save') || buttonText.includes('apply')) {
    return 'Form is submitted and appropriate confirmation is displayed';
  }
  
  // Login/account buttons
  if (buttonText.includes('login') || buttonText.includes('sign in')) {
    return 'User is logged in successfully or login form is displayed';
  }
  if (buttonText.includes('register') || buttonText.includes('sign up')) {
    return 'Registration form is displayed or user is registered successfully';
  }
  
  // Download buttons
  if (buttonText.includes('download')) {
    return 'File download begins or download options are presented';
  }
  
  // View/Show buttons
  if (buttonText.includes('view') || buttonText.includes('show') || 
      buttonText.includes('display') || buttonText.includes('open')) {
    const contentType = extractContentType(buttonText);
    return `${contentType} is displayed to the user`;
  }
  
  // Close/Hide buttons
  if (buttonText.includes('close') || buttonText.includes('hide') || 
      buttonText.includes('cancel') || buttonText.includes('dismiss')) {
    return 'The associated content is hidden or closed';
  }
  
  // Add/Create buttons
  if (buttonText.includes('add') || buttonText.includes('create') || 
      buttonText.includes('new')) {
    return 'New item creation form/option is displayed';
  }
  
  // Default fallback
  return 'Appropriate content or action occurs based on the button purpose';
}

/**
 * Extract content type from button text
 * @param {String} text - Button text
 * @returns {String} - Content type
 */
function extractContentType(text) {
  // Remove common action words
  const cleanedText = text.replace(/(view|show|display|open|get|see)\s+/i, '');
  
  // Capitalize the first letter
  return cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
}

function generateFormTest(pageData, form, index) {
  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test Form: ${form.id || 'Form ' + (index + 1)}`,
    description: `Verify that the form can be submitted correctly`,
    priority: 'High',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Find form ${form.id ? `with ID "${form.id}"` : (index + 1)}`,
        expected: 'Form is visible on the page'
      },
      {
        step: 3,
        action: 'Fill all required fields with valid data',
        expected: 'Data can be entered in the fields'
      },
      {
        step: 4,
        action: 'Submit the form',
        expected: 'Form submits without errors'
      }
    ]
  };
}

/**
 * Enhanced link test generation with intelligent expectations
 */
function generateLinkTest(pageData, link, index) {
  const linkText = link.text || link.href || 'Unnamed Link';
  const linkIdentifier = link.text ? `with text "${link.text}"` : 
                         link.id ? `with ID "${link.id}"` : 
                         `#${index + 1}`;
  
  // Extract destination from href or text
  let destination = inferLinkDestination(link.href, linkText);
  
  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: `Verify that the link navigates to the correct destination`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Find link ${linkIdentifier}`,
        expected: 'Link is visible on the page'
      },
      {
        step: 3,
        action: 'Click the link',
        expected: destination
      }
    ]
  };
}

/**
 * Infer the destination page/action from link href and text
 * @param {String} href - Link href attribute
 * @param {String} linkText - Link text content
 * @returns {String} - Expected destination
 */
function inferLinkDestination(href, linkText) {
  // If no href, use generic expectation
  if (!href) {
    return inferFromLinkText(linkText);
  }
  
  href = href.toLowerCase();
  linkText = linkText.toLowerCase();
  
  // Check for anchor links (same page navigation)
  if (href.startsWith('#')) {
    const anchorName = href.substring(1);
    return `Page scrolls to the "${anchorName}" section`;
  }
  
  // Check for external links
  if (href.startsWith('http') && !href.includes(global.location?.hostname || '')) {
    let hostname = '';
    try {
      hostname = new URL(href).hostname;
    } catch (e) {
      // If URL parsing fails, just use the href
      hostname = href;
    }
    return `User is navigated to external website: ${hostname}`;
  }
  
  // Check for file downloads
  if (href.includes('.pdf') || href.includes('.doc') || href.includes('.xls') || 
      href.includes('.zip') || href.includes('.csv')) {
    return `File download begins for the linked document`;
  }
  
  // Check for mail links
  if (href.startsWith('mailto:')) {
    return `Email client opens with the specified email address`;
  }
  
  // Check for phone links
  if (href.startsWith('tel:')) {
    return `Phone dialer opens with the specified phone number`;
  }
  
  // Extract page name from href
  let pageName = '';
  try {
    // Try to extract the last part of the path
    const url = new URL(href);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pageName = pathParts[pathParts.length - 1].replace(/\.\w+$/, ''); // Remove file extension
      pageName = pageName.replace(/-|_/g, ' '); // Replace dashes/underscores with spaces
    }
  } catch (e) {
    // If parsing fails, extract from the href string
    const lastPart = href.split('/').pop();
    if (lastPart) {
      pageName = lastPart.replace(/\.\w+$/, '').replace(/-|_/g, ' ');
    }
  }
  
  // If we have a page name, use it
  if (pageName) {
    // Capitalize each word
    pageName = pageName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return `User is navigated to the ${pageName} page`;
  }
  
  // Fallback to link text analysis
  return inferFromLinkText(linkText);
}

/**
 * Infer destination from link text when href analysis fails
 * @param {String} linkText - The text of the link
 * @returns {String} - Expected destination
 */
function inferFromLinkText(linkText) {
  linkText = linkText.toLowerCase();
  
  // Common page types
  if (linkText.includes('home')) return 'User is navigated to the Home page';
  if (linkText.includes('about')) return 'User is navigated to the About page';
  if (linkText.includes('contact')) return 'User is navigated to the Contact page';
  if (linkText.includes('pricing')) return 'User is navigated to the Pricing page';
  if (linkText.includes('feature')) return 'User is navigated to the Features page';
  if (linkText.includes('product')) return 'User is navigated to the Products page';
  if (linkText.includes('service')) return 'User is navigated to the Services page';
  if (linkText.includes('blog') || linkText.includes('news')) return 'User is navigated to the Blog/News page';
  if (linkText.includes('login') || linkText.includes('sign in')) return 'User is navigated to the Login page';
  if (linkText.includes('register') || linkText.includes('sign up')) return 'User is navigated to the Registration page';
  
  // If nothing specific, construct from the link text
  return `User is navigated to the ${linkText} page/section`;
}

function generateInputTest(pageData, input, index) {
  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test Input Field: ${input.name || input.id || input.type + ' input'}`,
    description: `Verify that the input field accepts valid data`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Find input field ${input.id ? `with ID "${input.id}"` : input.name ? `with name "${input.name}"` : index + 1}`,
        expected: 'Input field is visible on the page'
      },
      {
        step: 3,
        action: `Enter valid data into the ${input.type} field`,
        expected: 'Input field accepts the data'
      },
      {
        step: 4,
        action: 'Check validation behavior',
        expected: 'Input validates correctly'
      }
    ]
  };
}

// Cleanup function to remove old sessions (call periodically)
function cleanupSessions(maxAge = 3600000) { // Default 1 hour
  const now = Date.now();
  Object.keys(pageCache).forEach(sessionId => {
    const session = pageCache[sessionId];
    const extractedTime = new Date(session.pageData.extractedAt).getTime();
    if (now - extractedTime > maxAge) {
      delete pageCache[sessionId];
    }
  });
}

// Export functions
module.exports = { 
  generateTestCases,
  cleanupSessions,
  pageCache // Export for testing purposes
};
