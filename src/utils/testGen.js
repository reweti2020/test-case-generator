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
    userPlan = 'free',
    batchSize = 5,
    pageData = null,
    processed = null
  } = options;
  
  // For subsequent calls using stateless approach
  if (mode === 'next' && pageData && processed) {
    try {
      return generateNextTestStateless(pageData, processed, elementType, elementIndex, userPlan, batchSize);
    } catch (error) {
      console.error('Error generating next test:', error);
      return { 
        success: false, 
        error: `Error generating next test: ${error.message}`
      };
    }
  }
  
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
      pageData: pageData,
      processed: {
        buttons: 0,
        forms: 0,
        links: 0, 
        inputs: 0
      },
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
 * Stateless function to generate the next batch of tests from page data
 * @param {Object} pageData - The page data 
 * @param {Object} processed - Information about already processed elements
 * @param {string} elementType - Type of element to test
 * @param {number} elementIndex - Index of element to test
 * @param {string} userPlan - User's subscription plan
 * @param {number} batchSize - Number of test cases to generate
 * @returns {object} - Generated test cases and session info
 */
function generateNextTestStateless(pageData, processed, elementType, elementIndex, userPlan = 'free', batchSize = 5) {
  // Array to store newly generated test cases
  const newTestCases = [];
  
  // Initialize tracking variables
  let currentElementType = elementType;
  let currentElementIndex = elementIndex;
  let hasMoreElements = true;
  let currentProcessed = { ...processed };
  
  // Generate up to batchSize test cases
  for (let i = 0; i < batchSize; i++) {
    // Stop if we've reached the free user limit
    const freeLimit = 10;
    if (userPlan === 'free' && newTestCases.length >= freeLimit) {
      hasMoreElements = false;
      break;
    }
    
    // Stop if there are no more elements to process
    if (!currentElementType) {
      hasMoreElements = false;
      break;
    }
    
    // Get element collection based on type
    const elements = pageData[`${currentElementType}s`] || [];
    
    if (currentElementIndex >= elements.length) {
      // Find next element type that has unprocessed elements
      const types = ['button', 'form', 'link', 'input'];
      let foundNext = false;
      
      for (const type of types) {
        if (currentProcessed[`${type}s`] < pageData[`${type}s`].length) {
          currentElementType = type;
          currentElementIndex = currentProcessed[`${type}s`];
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
    const element = pageData[`${currentElementType}s`][currentElementIndex];
    
    // Generate a test case based on element type
    let testCase;
    switch (currentElementType) {
      case 'button':
        testCase = generateButtonTest(pageData, element, currentProcessed.buttons);
        break;
      case 'form':
        testCase = generateFormTest(pageData, element, currentProcessed.forms);
        break;
      case 'link':
        testCase = generateLinkTest(pageData, element, currentProcessed.links);
        break;
      case 'input':
        testCase = generateInputTest(pageData, element, currentProcessed.inputs);
        break;
      default:
        testCase = null;
    }
    
    if (testCase) {
      // Add the test case to our batch
      newTestCases.push(testCase);
      
      // Update processed count
      currentProcessed[`${currentElementType}s`]++;
      
      // Move to the next element
      currentElementIndex++;
      
      // Check if we've reached the end of this element type
      if (currentElementIndex >= pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ['button', 'form', 'input', 'link'];
        let foundNext = false;
        
        for (const type of types) {
          if (currentProcessed[`${type}s`] < pageData[`${type}s`].length) {
            currentElementType = type;
            currentElementIndex = currentProcessed[`${type}s`];
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
      if (currentElementIndex >= pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ['button', 'form', 'input', 'link'];
        let foundNext = false;
        
        for (const type of types) {
          if (currentProcessed[`${type}s`] < pageData[`${type}s`].length) {
            currentElementType = type;
            currentElementIndex = currentProcessed[`${type}s`];
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
  
  // Return the batch of new test cases and updated state
  return {
    success: true,
    pageData: pageData,
    processed: currentProcessed,
    testCases: newTestCases,
    nextElementType: currentElementType,
    nextElementIndex: currentElementIndex,
    hasMoreElements,
    totalTestCases: newTestCases.length,
    upgradeRequired: userPlan === 'free' && newTestCases.length >= 10
  };
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
    pageData: session.pageData,
    processed: session.processed,
    testCases: newTestCases,
    nextElementType: currentElementType,
    nextElementIndex: currentElementIndex,
    hasMoreElements,
    totalTestCases: session.testCases.length,
    upgradeRequired: userPlan === 'free' && session.testCases.length >= freeLimit
  };
}

/**
 * Generate button test with enhanced expectations
 * @param {Object} pageData - Page data
 * @param {Object} button - Button element data
 * @param {Number} index - Index of button
 * @returns {Object} - Test case
 */
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
  
  // Buy/Purchase/Cart buttons
  if (buttonText.includes('buy') || buttonText.includes('purchase') || 
      buttonText.includes('cart') || buttonText.includes('checkout')) {
    return 'User is navigated to purchase flow or cart is updated';
  }
  
  // Share/Social buttons
  if (buttonText.includes('share') || buttonText.includes('tweet') || 
      buttonText.includes('post') || buttonText.includes('like')) {
    return 'Social sharing options are displayed or action is completed';
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
  
  // Settings/Config buttons
  if (buttonText.includes('settings') || buttonText.includes('config') || 
      buttonText.includes('preference') || buttonText.includes('option')) {
    return 'Settings or configuration options are displayed';
  }
  
  // Help/Support buttons
  if (buttonText.includes('help') || buttonText.includes('support') || 
      buttonText.includes('contact')) {
    return 'Help information or support options are displayed';
  }
  
  // Default fallback - more specific than previous version
  return 'The appropriate action is performed based on the button\'s context';
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

/**
 * Generate form test with enhanced expectations
 * @param {Object} pageData - Page data
 * @param {Object} form - Form element data
 * @param {Number} index - Index of form
 * @returns {Object} - Test case
 */
function generateFormTest(pageData, form, index) {
  // Create a more descriptive title
  let formTitle = form.id || `Form ${index + 1}`;
  
  // Try to infer form purpose from action URL if available
  if (form.action) {
    const actionLower = form.action.toLowerCase();
    
    if (actionLower.includes('search')) {
      formTitle = 'Search Form';
    } else if (actionLower.includes('login')) {
      formTitle = 'Login Form';
    } else if (actionLower.includes('register') || actionLower.includes('signup')) {
      formTitle = 'Registration Form';
    } else if (actionLower.includes('contact')) {
      formTitle = 'Contact Form';
    } else if (actionLower.includes('checkout')) {
      formTitle = 'Checkout Form';
    } else if (actionLower.includes('comment')) {
      formTitle = 'Comment Form';
    }
  }
  
  // Determine form method expectations
  let submissionExpectation = 'Form submits without errors';
  if (form.method && form.method.toLowerCase() === 'get') {
    submissionExpectation = 'Form submits and query parameters are added to the URL';
  } else {
    submissionExpectation = 'Form submits and appropriate confirmation is displayed';
  }
  
  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test ${formTitle}`,
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
        expected: 'Data can be entered in the fields without validation errors'
      },
      {
        step: 4,
        action: 'Submit the form',
        expected: submissionExpectation
      }
    ]
  };
}

/**
 * Generate link test with enhanced expectations
 * @param {Object} pageData - Page data
 * @param {Object} link - Link element data
 * @param {Number} index - Index of link
 * @returns {Object} - Test case
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
  const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.csv', '.txt', '.ppt', '.pptx'];
  for (const ext of fileExtensions) {
    if (href.includes(ext)) {
      return `File download begins for the ${ext.substring(1).toUpperCase()} document`;
    }
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
  
  // Common page types with more specific expectations
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
  if (linkText.includes('faq')) return 'User is navigated to the FAQ page';
  if (linkText.includes('help')) return 'User is navigated to the Help/Support page';
  if (linkText.includes('download')) return 'User is navigated to the Downloads page or a file download begins';
  if (linkText.includes('cart') || linkText.includes('checkout')) return 'User is navigated to the Shopping Cart/Checkout page';
  if (linkText.includes('account') || linkText.includes('profile')) return 'User is navigated to the Account/Profile page';
  if (linkText.includes('settings')) return 'User is navigated to the Settings page';
  if (linkText.includes('privacy') || linkText.includes('policy')) return 'User is navigated to the Privacy Policy page';
  if (linkText.includes('terms')) return 'User is navigated to the Terms of Service page';
  
  // More specific fallback
  // If nothing specific, construct from the link text
  return `User is navigated to the ${linkText} page or section`;
}

/**
 * Generate a test case for an input field
 * @param {Object} pageData - Data about the page
 * @param {Object} input - Input field data
 * @param {Number} index - Index of the input field
 * @returns {Object} - Test case for the input field
 */
function generateInputTest(pageData, input, index) {
  // Determine input type for better test cases
  const inputType = input.type?.toLowerCase() || 'text';
  
  // Get a meaningful name for the input field
  let inputName = input.name || input.id || input.placeholder;
  if (!inputName) {
    inputName = inputType + ' input';
  }
  
  // Prepare specific test data based on input type
  let testData = 'sample data';
  let validationText = 'Input field validates the data correctly';
  
  switch (inputType) {
    case 'email':
      testData = 'test@example.com';
      validationText = 'Email format is validated correctly';
      break;
    
    case 'password':
      testData = '********';
      validationText = 'Password is accepted and masked correctly';
      break;
    
    case 'number':
      testData = '42';
      validationText = 'Numeric value is accepted and validated';
      break;
    
    case 'tel':
      testData = '+1 (555) 123-4567';
      validationText = 'Phone number format is validated correctly';
      break;
    
    case 'date':
      testData = '2025-01-15';
      validationText = 'Date is accepted in the correct format';
      break;
    
    case 'time':
      testData = '14:30';
      validationText = 'Time is accepted in the correct format';
      break;
    
    case 'file':
      testData = 'test-file.txt';
      validationText = 'File selection dialog opens and file can be selected';
      break;
    
    case 'checkbox':
      testData = 'checked';
      validationText = 'Checkbox state toggles correctly';
      break;
    
    case 'radio':
      testData = 'selected';
      validationText = 'Radio button is selected correctly';
      break;
    
    case 'range':
      testData = 'mid-range value';
      validationText = 'Slider can be adjusted to different values';
      break;
    
    case 'select':
      testData = 'option value';
      validationText = 'Option is selected from the dropdown';
      break;
      
    // Default case for text and other types
    default:
      testData = 'sample text';
      validationText = 'Text input is accepted correctly';
  }
  
  // Create the test case
  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test ${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input: ${inputName}`,
    description: `Verify that the ${inputName} input field accepts and validates data correctly`,
    priority: inputType === 'password' || inputType === 'email' ? 'High' : 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Find the ${inputName} ${inputType} field ${input.id ? `with ID "${input.id}"` : input.name ? `with name "${input.name}"` : ''}`,
        expected: 'Input field is visible on the page'
      },
      {
        step: 3,
        action: `Enter "${testData}" into the ${inputName} field`,
        expected: 'Data is entered successfully'
      },
      {
        step: 4,
        action: 'Check field validation behavior',
        expected: validationText
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
