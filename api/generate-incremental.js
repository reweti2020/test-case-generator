// api/generate-incremental.js
const axios = require('axios');
const cheerio = require('cheerio');

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
    const { url, mode, pageData, processed, elementType, elementIndex, format } = req.body || {};
    
    // Log request for debugging
    console.log(`Request params: mode=${mode}, elementType=${elementType}, elementIndex=${elementIndex}`);
    
    // Check if all required fields are present
    if (mode === 'first' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for initial test generation'
      });
    }
    
    if (mode === 'next' && (!pageData || !processed)) {
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
      result = await generateFirstTest(url, userPlan);
    } else {
      result = generateNextTest(pageData, processed, elementType, elementIndex, userPlan);
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
 * Generate the next test case using client-provided data
 */
function generateNextTest(pageData, processed, elementType, elementIndex, userPlan = 'pro') {
  if (!pageData || !processed) {
    return {
      success: false,
      error: 'Missing page data or processing state'
    };
  }
  
  console.log(`Generating test for ${elementType} #${elementIndex}`);
  console.log(`Processing state:`, processed);
  
  // Get element collection based on type
  const elements = pageData[`${elementType}s`] || [];
  
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
  
  if (!testCase) {
    return {
      success: false,
      error: 'Failed to generate test case'
    };
  }
  
  // Update processed count
  processed[`${elementType}s`]++;
  
  // Find next element type to process
  let nextElementType = null;
  let nextElementIndex = 0;
  
  // First try the current element type
  if (processed[`${elementType}s`] < pageData[`${elementType}s`].length) {
    nextElementType = elementType;
    nextElementIndex = processed[`${elementType}s`];
  } else {
    // Try other element types
    const types = ['button', 'form', 'input', 'link'];
    for (const type of types) {
      if (processed[`${type}s`] < pageData[`${type}s`].length) {
        nextElementType = type;
        nextElementIndex = processed[`${type}s`];
        break;
      }
    }
  }
  
  // Always allow more elements for testing
  const hasMoreElements = nextElementType !== null;
  
  // Calculate total test cases
  const totalTestCases = 1 + // Page test
                        processed.buttons +
                        processed.forms +
                        processed.links +
                        processed.inputs;
  
  console.log(`Test generated successfully. Next: ${nextElementType} #${nextElementIndex}`);
  
  // Return updated state to client
  return {
    success: true,
    pageData: pageData,        // Send back complete page data
    processed: processed,      // Send updated processing state
    testCases: [testCase],
    nextElementType,
    nextElementIndex,
    hasMoreElements,
    totalTestCases: totalTestCases,
    upgradeRequired: false
  };
}

/**
 * Generate a button test with intelligent expectations
 */
function generateButtonTest(pageData, button, index) {
  // Ensure we have a valid button text
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonIdentifier = button.text ? `with text "${button.text}"` : 
                         button.id ? `with ID "${button.id}"` : 
                         `#${index + 1}`;
  
  // Generate specific expected result based on button text
  let expectedResult = 'Button responds to the click (page navigates or action occurs)';
  
  // Simple inference implementation
  const lowerButtonText = buttonText.toLowerCase();
  if (lowerButtonText.includes('search') || lowerButtonText.includes('find')) {
    expectedResult = 'Search results are displayed based on the search criteria';
  } else if (lowerButtonText.includes('login') || lowerButtonText.includes('sign in')) {
    expectedResult = 'User is logged in successfully or login form is displayed';
  } else if (lowerButtonText.includes('register') || lowerButtonText.includes('sign up')) {
    expectedResult = 'Registration form is displayed or user is registered';
  } else if (lowerButtonText.includes('submit') || lowerButtonText.includes('send') || 
             lowerButtonText.includes('save') || lowerButtonText.includes('apply')) {
    expectedResult = 'Form is submitted and appropriate confirmation is displayed';
  } else if (lowerButtonText.includes('download')) {
    expectedResult = 'File download begins or download options are presented';
  } else if (lowerButtonText.includes('menu') || lowerButtonText.includes('navigation')) {
    expectedResult = 'Menu or navigation options are displayed';
  } else if (lowerButtonText.includes('compar') || lowerButtonText.includes('table')) {
    expectedResult = 'Comparison table is displayed to the user';
  } else if (lowerButtonText.includes('close') || lowerButtonText.includes('hide') || 
             lowerButtonText.includes('cancel') || lowerButtonText.includes('dismiss')) {
    expectedResult = 'The associated content is hidden or closed';
  } else if (lowerButtonText.includes('add') || lowerButtonText.includes('create') || 
             lowerButtonText.includes('new')) {
    expectedResult = 'New item creation form/option is displayed';
  }
  
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
 * Generate a form test
 */
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
 * Generate a link test with intelligent expectations
 */
function generateLinkTest(pageData, link, index) {
  const linkText = link.text || link.href || 'Unnamed Link';
  const linkIdentifier = link.text ? `with text "${link.text}"` : 
                       link.id ? `with ID "${link.id}"` : 
                       `#${index + 1}`;
  
  // Generate specific expected result
  let expectedResult = `Link navigates to the correct destination`;
  
  // Simple inference based on href and text
  const lowerHref = (link.href || '').toLowerCase();
  const lowerText = linkText.toLowerCase();
  
  if (lowerHref.startsWith('#')) {
    const anchorName = link.href.substring(1);
    expectedResult = `Page scrolls to the "${anchorName}" section`;
  } else if (lowerHref.startsWith('mailto:')) {
    expectedResult = 'Email client opens with the specified email address';
  } else if (lowerHref.startsWith('tel:')) {
    expectedResult = 'Phone dialer opens with the specified phone number';
  } else if (lowerHref.includes('.pdf') || lowerHref.includes('.doc') || 
             lowerHref.includes('.xls') || lowerHref.includes('.zip')) {
    expectedResult = 'File download begins for the linked document';
  } else if (lowerText.includes('home')) {
    expectedResult = 'User is navigated to the Home page';
  } else if (lowerText.includes('about')) {
    expectedResult = 'User is navigated to the About page';
  } else if (lowerText.includes('contact')) {
    expectedResult = 'User is navigated to the Contact page';
  } else if (lowerText.includes('login') || lowerText.includes('sign in')) {
    expectedResult = 'User is navigated to the Login page';
  } else if (lowerText.includes('register') || lowerText.includes('sign up')) {
    expectedResult = 'User is navigated to the Registration page';
  } else if (lowerText.includes('pricing')) {
    expectedResult = 'User is navigated to the Pricing page';
  } else if (lowerText.includes('blog') || lowerText.includes('news')) {
    expectedResult = 'User is navigated to the Blog/News page';
  } else if (lowerHref.length > 0 && !lowerHref.startsWith('#')) {
    try {
      // Try to extract a descriptive part from the URL
      const urlParts = lowerHref.replace(/https?:\/\//, '').split('/');
      const lastPart = urlParts[urlParts.length - 1].replace(/\..*$/, '').replace(/[-_]/g, ' ');
      if (lastPart && lastPart.length > 0 && lastPart !== '/' && lastPart !== '') {
        expectedResult = `User is navigated to the ${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} page`;
      }
    } catch (e) {
      // If URL parsing fails, use default
    }
  }
  
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
        expected: expectedResult
      }
    ]
  };
}

/**
 * Generate an input field test
 */
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
