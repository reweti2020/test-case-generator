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

    // Determine user plan (in a real app, extract from auth token)
    const userPlan = 'pro'; // Force pro access for testing
    
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
async function generateFirstTest(url, userPlan = 'free') {
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
    
    // Extract basic page data
    const pageData = {
      url,
      title: $('title').text().trim() || 'Unknown Title',
      extractedAt: new Date().toISOString()
    };
    
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
    
    // Extract forms - limit to first 100
    pageData.forms = [];
    $('form').slice(0, 10).each((i, el) => {
      const $form = $(el);
      pageData.forms.push({
        id: $form.attr('id') || '',
        action: $form.attr('action') || '',
        method: $form.attr('method') || ''
      });
    });
    
    // Extract links - limit to first 150
    pageData.links = [];
    $('a[href]').slice(0, 15).each((i, el) => {
      const $link = $(el);
      pageData.links.push({
        text: $link.text().trim() || 'Unnamed Link',
        href: $link.attr('href') || '',
        id: $link.attr('id') || ''
      });
    });
    
    // Extract inputs - limit to first 150
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
    
    // Free plan limit
    const freeLimit = 100;
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
    console.error('Error generating first test:', error);
    return { 
      success: false, 
      error: `Test generation error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Generate the next test case from session data
 */
function generateNextTest(sessionId, elementType, elementIndex, userPlan = 'free') {
  if (!sessionId || !pageCache[sessionId]) {
    return {
      success: false,
      error: 'Invalid or expired session ID'
    };
  }
  
  const session = pageCache[sessionId];
  
  // Check free plan limits
  const freeLimit = 100;
  if (userPlan === 'free' && session.testCases.length >= freeLimit) {
    return {
      success: false,
      error: 'Free plan limit reached',
      upgradeRequired: true,
      totalTestCases: session.testCases.length
    };
  }
  
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
  
  // Check if there are more elements to process
  const hasMoreElements = (userPlan !== 'free' || session.testCases.length < freeLimit) && nextElementType !== null;
  
  return {
    success: true,
    testCases: [testCase],
    nextElementType,
    nextElementIndex,
    hasMoreElements,
    totalTestCases: session.testCases.length,
    upgradeRequired: userPlan === 'free' && session.testCases.length >= freeLimit
  };
}

// Helper functions to generate specific test cases
function generateButtonTest(pageData, button, index) {
  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${button.text || button.id || 'Unnamed Button'}`,
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
        action: `Find button ${button.text ? `with text "${button.text}"` : button.id ? `with ID "${button.id}"` : index + 1}`,
        expected: 'Button is visible on the page'
      },
      {
        step: 3,
        action: 'Click the button',
        expected: 'Button responds to the click (page navigates or action occurs)'
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
        expected: `Link navigates to ${link.href || 'correct destination'}`
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
