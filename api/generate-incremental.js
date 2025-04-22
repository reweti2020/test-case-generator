// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');

// In-memory storage for page analysis results (Note: this will reset when serverless function cold starts)
const pageCache = {};

/**
 * API handler for test case generation
 */
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
    // Extract request body
    const { url, mode, sessionId, elementType, elementIndex, format } = req.body || {};
    
    // Log request for debugging
    console.log(`Request params: ${JSON.stringify({ url, mode, sessionId, elementType, elementIndex, format })}`);
    
    // Check if all required fields are present
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    if (mode === 'next' && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required for subsequent test generation'
      });
    }

    // Force pro access for testing
    const userPlan = 'pro';
    
    // Process the request based on mode
    let result;
    
    if (mode === 'first') {
      result = await generateFirstTest(url, userPlan);
    } else {
      result = generateNextTest(sessionId, elementType, elementIndex, userPlan);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};

/**
 * Generate the first test case by analyzing the website
 */
async function generateFirstTest(url, userPlan = 'pro') {
  try {
    console.log(`Fetching URL: ${url}`);
    
    // Fetch the HTML content with a timeout
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Check response status
    if (response.status !== 200) {
      return {
        success: false,
        error: `Failed to fetch URL (Status ${response.status})`
      };
    }
    
    console.log('URL fetched successfully, parsing HTML...');
    
    // Load HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Extract basic page data with better title extraction
    let pageTitle = $('title').text().trim();
    if (!pageTitle) {
      // Try to find title in meta tags
      pageTitle = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  'Unknown Title';
    }

    // Add debugging to see what's being extracted
    console.log('Extracted page title:', pageTitle);

    const pageData = {
      url,
      title: pageTitle,
      extractedAt: new Date().toISOString()
    };
        
    pageData.buttons = [];
    $('button, input[type="submit"], input[type="button"], .btn, [role="button"], a.button, a.btn').slice(0, 20).each((i, el) => {
      const $el = $(el);
      
      // Get text content with better handling for nested elements
      let buttonText = $el.text().trim();
      
      // If no direct text, try getting value attribute
      if (!buttonText) {
        buttonText = $el.val() || '';
      }
      
      // If still no text, try getting text from child elements
      if (!buttonText) {
        buttonText = $el.find('*').text().trim();
      }
      
      // If still no text, try getting aria-label
      if (!buttonText) {
        buttonText = $el.attr('aria-label') || 'Unnamed Button';
      }
      
      // Debug log the extracted button
      console.log(`Button ${i+1}:`, buttonText);
      
      pageData.buttons.push({
        text: buttonText,
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
        
    // Set very high limit for testing
    const freeLimit = 9999;
    const hasMoreElements = (pageData.buttons.length > 0 || pageData.forms.length > 0 || 
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
      upgradeRequired: false // Always false for testing
    };
  } catch (error) {
    console.error('Error generating first test:', error);
        
    // Provide more user-friendly error messages based on error type
    if (error.code === 'ENOTFOUND') {
      return { 
        success: false, 
        error: `Could not resolve domain name. Please check that "${url}" is correct and publicly accessible.`
      };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return { 
        success: false, 
        error: `Connection to "${url}" timed out. The site might be slow or unreachable.`
      };
    } else if (error.code === 'ECONNREFUSED') {
      return { 
        success: false, 
        error: `Connection to "${url}" was refused. The site might be blocking our access.`
      };
    } else if (error.response && error.response.status) {
      return { 
        success: false, 
        error: `Server responded with status ${error.response.status} when trying to access "${url}".`
      };
    }
        
    return { 
      success: false, 
      error: `Test generation error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Generate the next test case from session data
 */
function generateNextTest(sessionId, elementType, elementIndex, userPlan = 'pro') {
  if (!sessionId || !pageCache[sessionId]) {
    return {
      success: false,
      error: 'Invalid or expired session ID'
    };
  }
  
  const session = pageCache[sessionId];
  
  // Disable free plan check during testing
  const freeLimit = 9999; // Set very high limit
  // Skipping the check to allow unlimited tests
  
  // Get element collection based on type
  const elements = session.pageData[`${elementType}s`] || [];
  
  if (elementIndex >= elements.length) {
    return {
      success: false,
      error: 'Element index out of bounds'
    };
  }
  
  // Get the specific element
  const element = elements[elementIndex];
  
  // Generate a test case based on element type
  let testCase;
  
  switch (elementType) {
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
  
  if (!testCase) {
    return {
      success: false,
      error: 'Failed to generate test case'
    };
  }
  
  // Add the test case to the cache
  session.testCases.push(testCase);
  
  // Update processed count
  session.processed[`${elementType}s`]++;
  
  // Find next element type to process
  let nextElementType = null;
  let nextElementIndex = 0;
  
  // First try the current element type
  if (session.processed[`${elementType}s`] < session.pageData[`${elementType}s`].length) {
    nextElementType = elementType;
    nextElementIndex = session.processed[`${elementType}s`];
  } else {
    // Try other element types
    const types = ['button', 'form', 'input', 'link'];
    for (const type of types) {
      if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
        nextElementType = type;
        nextElementIndex = session.processed[`${type}s`];
        break;
      }
    }
  }
  
  // Always allow more elements for testing
  const hasMoreElements = nextElementType !== null;
  
  return {
    success: true,
    testCases: [testCase],
    nextElementType,
    nextElementIndex,
    hasMoreElements,
    totalTestCases: session.testCases.length,
    upgradeRequired: false // Always false for testing
  };
}

// Helper functions to generate specific test cases
function generateButtonTest(pageData, button, index) {
  // Ensure we have a valid button text
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonIdentifier = button.text ? `with text "${button.text}"` : 
                         button.id ? `with ID "${button.id}"` : 
                         `#${index + 1}`;
  
  // Generate intelligent expectation
  let expectedResult = 'Button responds to the click (page navigates or action occurs)';
  
  // Simple inference without complex functions
  const lowerButtonText = buttonText.toLowerCase();
  if (lowerButtonText.includes('search') || lowerButtonText.includes('find')) {
    expectedResult = 'Search results are displayed';
  } else if (lowerButtonText.includes('login') || lowerButtonText.includes('sign in')) {
    expectedResult = 'User is logged in or login form is displayed';
  } else if (lowerButtonText.includes('submit') || lowerButtonText.includes('save')) {
    expectedResult = 'Form is submitted and confirmation is displayed';
  } else if (lowerButtonText.includes('menu') || lowerButtonText.includes('nav')) {
    expectedResult = 'Menu or navigation options are displayed';
  } else if (lowerButtonText.includes('download')) {
    expectedResult = 'File download begins';
  }
  
  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${buttonText}`,
    description: `Verify that the button works correctly`,
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

function generateLinkTest(pageData, link, index) {
  // Add simple intelligent expectations
  let expectedResult = `Link navigates to ${link.href || 'correct destination'}`;
  
  // Simple inference
  const lowerLinkText = (link.text || '').toLowerCase();
  const lowerHref = (link.href || '').toLowerCase();
  
  if (lowerHref.startsWith('#')) {
    expectedResult = `Page scrolls to the "${link.href.substring(1)}" section`;
  } else if (lowerHref.startsWith('mailto:')) {
    expectedResult = 'Email client opens';
  } else if (lowerHref.includes('.pdf') || lowerHref.includes('.doc')) {
    expectedResult = 'File download begins';
  } else if (lowerLinkText.includes('home')) {
    expectedResult = 'User is navigated to the Home page';
  } else if (lowerLinkText.includes('about')) {
    expectedResult = 'User is navigated to the About page';
  } else if (lowerLinkText.includes('contact')) {
    expectedResult = 'User is navigated to the Contact page';
  }
  
  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${link.text || link.href || 'Unnamed Link'}`,
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
        action: `Find link ${link.text ? `with text "${link.text}"` : link.id ? `with ID "${link.id}"` : index + 1}`,
        expected: 'Link is visible on the page'
      },
      {
        step: 3,
        action: 'Click the link',
        expected: expectedResult
      }
    ]
  };
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

// Export for use in other files
module.exports.pageCache = pageCache;
