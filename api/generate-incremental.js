// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');
const { generateTestCases } = require('../testGen');

// In-memory cache for session data - this will be reset on serverless function cold starts
// For production, consider using a database or cache service like Redis
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
    const body = req.body || {};
    const url = body.url;
    const mode = body.mode || 'first';
    const format = body.format || 'plain';
    const elementType = body.elementType;
    const elementIndex = body.elementIndex ? parseInt(body.elementIndex) : 0;
    // Default batchSize to 5 if not provided
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 5;
    
    // Log request for debugging
    console.log(`Request params: mode=${mode}, elementType=${elementType}, elementIndex=${elementIndex}, batchSize=${batchSize}`);
    
    // Check if all required fields are present
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    // For subsequent calls, we need pageData and processed state
    if (mode === 'next' && (!body.pageData || !body.processed)) {
      return res.status(400).json({
        success: false,
        error: 'Page data and processed state are required for subsequent test generation'
      });
    }

    // Force pro access for testing
    const userPlan = 'pro';
    
    // Process the request based on mode
    let result;
    
    if (mode === 'first') {
      // For first call, generate initial test
      result = await generateTestCases(url, {
        mode: 'first',
        userPlan: userPlan
      });
    } else {
      // For subsequent calls, generate next batch of tests
      // Extract data from request body
      const pageData = body.pageData;
      const processed = body.processed;
      
      // Call testGen with the batch parameters
      result = await generateTestCases(null, {
        mode: 'next',
        sessionId: body.sessionId, // Make sure this is passed if using sessionId approach
        pageData: pageData,
        processed: processed,
        elementType: elementType,
        elementIndex: elementIndex,
        userPlan: userPlan,
        batchSize: batchSize
      });
    }
    
    // Return the result to the client
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
 * This function is a backup in case testGen.js has issues
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
        
    // Extract buttons
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
        
    console.log('HTML parsed successfully');
    
    // Initial processed state
    const processed = {
      buttons: 0,
      forms: 0,
      links: 0, 
      inputs: 0
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
        
    // Determine next element type to test
    const nextElementType = pageData.buttons.length > 0 ? 'button' : 
                     (pageData.forms.length > 0 ? 'form' : 
                     (pageData.inputs.length > 0 ? 'input' : 
                     (pageData.links.length > 0 ? 'link' : null)));
        
    // Set very high limit for testing
    const hasMoreElements = (pageData.buttons.length > 0 || pageData.forms.length > 0 || 
                       pageData.links.length > 0 || pageData.inputs.length > 0);
        
    console.log('First test case generated successfully');
        
    // Return complete data to client
    return { 
      success: true, 
      pageData: pageData,        // Send complete page data
      processed: processed,      // Send initial processing state
      testCases: [firstTest],
      nextElementType,
      nextElementIndex: 0,
      hasMoreElements,
      totalTestCases: 1,
      upgradeRequired: false
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
 * Function to generate the next batch of tests
 * This is a fallback in case testGen.js has issues
 */
function generateNextTest(pageData, processed, elementType, elementIndex, userPlan = 'pro', batchSize = 5) {
  if (!pageData || !processed) {
    return {
      success: false,
      error: 'Missing page data or processing state'
    };
  }
  
  console.log(`Generating ${batchSize} tests starting from ${elementType} #${elementIndex}`);
  
  // Array to store newly generated test cases
  const newTestCases = [];
  
  // Initialize tracking variables
  let currentElementType = elementType;
  let currentElementIndex = elementIndex;
  let hasMoreElements = true;
  
  // Generate up to batchSize test cases
  for (let i = 0; i < batchSize; i++) {
    // Stop if there are no more elements to process
    if (!currentElementType) {
      hasMoreElements = false;
      break;
    }
    
    // Get element collection based on type
    const elements = pageData[`${currentElementType}s`] || [];
    
    // Check if index is valid
    if (currentElementIndex >= elements.length) {
      // Try next element type
      const types = ['button', 'form', 'input', 'link'];
      let foundNext = false;
      
      for (const type of types) {
        if (processed[`${type}s`] < pageData[`${type}s`].length) {
          currentElementType = type;
          currentElementIndex = processed[`${type}s`];
          foundNext = true;
          break;
        }
      }
      
      if (!foundNext) {
        hasMoreElements = false;
        break;
      }
    }
    
    try {
      // Get the specific element
      const element = pageData[`${currentElementType}s`][currentElementIndex];
      
      // Generate a test case based on element type
      let testCase;
      switch (currentElementType) {
        case 'button':
          testCase = generateButtonTest(pageData, element, processed.buttons);
          break;
        case 'form':
          testCase = generateFormTest(pageData, element, processed.forms);
          break;
        case 'link':
          testCase = generateLinkTest(pageData, element, processed.links);
          break;
        case 'input':
          testCase = generateInputTest(pageData, element, processed.inputs);
          break;
        default:
          testCase = null;
      }
      
      if (testCase) {
        // Add the test case to our batch
        newTestCases.push(testCase);
        
        // Update processed count
        processed[`${currentElementType}s`]++;
        
        // Move to the next element
        currentElementIndex++;
        
        // Check if we've reached the end of this element type
        if (currentElementIndex >= pageData[`${currentElementType}s`].length) {
          // Find next element type
          const types = ['button', 'form', 'input', 'link'];
          let foundNext = false;
          
          for (const type of types) {
            if (processed[`${type}s`] < pageData[`${type}s`].length) {
              currentElementType = type;
              currentElementIndex = processed[`${type}s`];
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
            if (processed[`${type}s`] < pageData[`${type}s`].length) {
              currentElementType = type;
              currentElementIndex = processed[`${type}s`];
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
    } catch (error) {
      console.error(`Error processing ${currentElementType} element:`, error);
      // Skip this element and try the next one
      currentElementIndex++;
    }
  }
  
  console.log(`Generated ${newTestCases.length} test cases`);
  
  // Return the batch of new test cases and updated state
  return {
    success: true,
    pageData: pageData,
    processed: processed,
    testCases: newTestCases,
    nextElementType: currentElementType,
    nextElementIndex: currentElementIndex,
    hasMoreElements,
    totalTestCases: processed.buttons + processed.forms + processed.links + processed.inputs + 1, // +1 for page test
    upgradeRequired: false
  };
}

// Helper test generation functions
// These are backup implementations in case testGen.js has issues

function generateButtonTest(pageData, button, index) {
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonIdentifier = button.text ? `with text "${button.text}"` : 
                         button.id ? `with ID "${button.id}"` : 
                         `#${index + 1}`;
  
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
  const linkText = link.text || link.href || 'Unnamed Link';
  const linkIdentifier = link.text ? `with text "${link.text}"` : 
                       link.id ? `with ID "${link.id}"` : 
                       `#${index + 1}`;
  
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
        expected: 'Link navigates to the correct destination'
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

// Export pageCache for other modules to access
module.exports.pageCache = pageCache;
