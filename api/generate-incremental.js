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
      // Debug to see if the session exists
      console.log(`Looking for session: ${sessionId}`);
      console.log(`Available sessions: ${Object.keys(pageCache).join(', ')}`);
      
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
    
    // Log the newly created session ID for debugging
    console.log(`Created new session: ${newSessionId}`);
    console.log(`Available sessions: ${Object.keys(pageCache).join(', ')}`);
        
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
  console.log(`Session found. Current test count: ${session.testCases.length}`);
  
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
  
  // Generate a test case based on element type with intelligent expectations
  let testCase;
  
  switch (elementType) {
    case 'button':
      testCase = generateIntelligentButtonTest(session.pageData, element, session.processed.buttons);
      break;
    case 'form':
      testCase = generateFormTest(session.pageData, element, session.processed.forms);
      break;
    case 'link':
      testCase = generateIntelligentLinkTest(session.pageData, element, session.processed.links);
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

// Intelligent test generators with context-aware expectations

/**
 * Generate a button test with intelligent expectations
 */
function generateIntelligentButtonTest(pageData, button, index) {
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
 */
function extractContentType(text) {
  // Remove common action words
  const cleanedText = text.replace(/(view|show|display|open|get|see)\s+/i, '');
  
  // Capitalize the first letter
  return cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
}

/**
 * Generate a link test with intelligent expectations
 */
function generateIntelligentLinkTest(pageData, link, index) {
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
  if (href.startsWith('http')) {
    let hostname = '';
    try {
      const url = new URL(href);
      hostname = url.hostname;
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
    const pathParts = href.split('/').filter(Boolean);
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

// Original test generators (kept for forms and inputs since they were already good)
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

// Export pageCache for other modules if needed
module.exports.pageCache = pageCache;
// Export for use in other files
module.exports.pageCache = pageCache;
