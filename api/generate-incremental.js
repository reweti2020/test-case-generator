// api/generate-incremental.js
// Real website analyzer version
const axios = require('axios');
const cheerio = require('cheerio');

// Simple in-memory cache for session data
const sessionCache = {};

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
    const sessionId = body.sessionId;
    const elementType = body.elementType;
    const elementIndex = body.elementIndex !== undefined ? parseInt(body.elementIndex) : 0;
    const batchSize = body.batchSize ? parseInt(body.batchSize) : 5;
    
    console.log(`Request params: mode=${mode}, sessionId=${sessionId}, elementType=${elementType}, elementIndex=${elementIndex}, batchSize=${batchSize}`);
    
    // For initial test generation
    if (mode === 'first') {
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required for initial test generation'
        });
      }
      
      try {
        console.log(`Fetching URL: ${url}`);
        
        // Ensure URL has protocol
        let fetchUrl = url;
        if (!fetchUrl.startsWith('http')) {
          fetchUrl = 'https://' + fetchUrl;
        }
        
        // Fetch the website content
        const response = await axios.get(fetchUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          maxContentLength: 1024 * 1024 // 1MB limit
        });
        
        // Load HTML into cheerio
        const $ = cheerio.load(response.data);
        
        // Extract page title
        const pageTitle = $('title').text().trim() || 'Untitled Page';
        
        // Extract elements
        const pageData = {
          url: fetchUrl,
          title: pageTitle,
          extractedAt: new Date().toISOString(),
          buttons: [],
          forms: [],
          links: [],
          inputs: []
        };
        
        // Extract buttons (limit to 20)
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
        
        // Extract forms (limit to 10)
        $('form').slice(0, 10).each((i, el) => {
          const $form = $(el);
          pageData.forms.push({
            id: $form.attr('id') || '',
            action: $form.attr('action') || '',
            method: $form.attr('method') || ''
          });
        });
        
        // Extract links (limit to 15)
        $('a[href]').slice(0, 15).each((i, el) => {
          const $link = $(el);
          pageData.links.push({
            text: $link.text().trim() || 'Unnamed Link',
            href: $link.attr('href') || '',
            id: $link.attr('id') || ''
          });
        });
        
        // Extract inputs (limit to 15)
        $('input[type!="submit"][type!="button"], textarea, select').slice(0, 15).each((i, el) => {
          const $input = $(el);
          pageData.inputs.push({
            type: $input.attr('type') || 'text',
            id: $input.attr('id') || '',
            name: $input.attr('name') || '',
            placeholder: $input.attr('placeholder') || ''
          });
        });
        
        console.log(`Found: ${pageData.buttons.length} buttons, ${pageData.forms.length} forms, ${pageData.links.length} links, ${pageData.inputs.length} inputs`);
        
        // Create session
        const newSessionId = 'session-' + Math.random().toString(36).substring(2, 10);
        
        // Initial processed state
        const processed = {
          buttons: 0,
          forms: 0,
          links: 0,
          inputs: 0
        };
        
        // Store in session cache
        sessionCache[newSessionId] = {
          pageData: pageData,
          processed: processed,
          testCases: []
        };
        
        // Generate first test case (page verification)
        const firstTest = {
          id: 'TC_PAGE_1',
          title: `Verify ${pageTitle} Loads Correctly`,
          description: `Test that the page loads successfully with the correct title`,
          priority: 'High',
          steps: [
            {
              step: 1,
              action: `Navigate to ${fetchUrl}`,
              expected: 'Page loads without errors'
            },
            {
              step: 2,
              action: 'Verify page title',
              expected: `Title is "${pageTitle}"`
            }
          ]
        };
        
        // Add to session
        sessionCache[newSessionId].testCases.push(firstTest);
        
        // Determine next element type
        let nextElementType = null;
        if (pageData.buttons.length > 0) {
          nextElementType = 'button';
        } else if (pageData.forms.length > 0) {
          nextElementType = 'form';
        } else if (pageData.links.length > 0) {
          nextElementType = 'link';
        } else if (pageData.inputs.length > 0) {
          nextElementType = 'input';
        }
        
        // Check if there are more elements to process
        const hasMoreElements = 
          pageData.buttons.length > 0 || 
          pageData.forms.length > 0 || 
          pageData.links.length > 0 || 
          pageData.inputs.length > 0;
        
        return res.status(200).json({
          success: true,
          sessionId: newSessionId,
          pageData: pageData,
          processed: processed,
          testCases: [firstTest],
          nextElementType: nextElementType,
          nextElementIndex: 0,
          hasMoreElements: hasMoreElements,
          totalTestCases: 1
        });
        
      } catch (error) {
        console.error('Error fetching or parsing website:', error);
        return res.status(200).json({
          success: false,
          error: `Error analyzing website: ${error.message}`
        });
      }
    }
    // For subsequent test generation
    else if (mode === 'next' && sessionId) {
      // Check if session exists
      if (!sessionCache[sessionId]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired session ID'
        });
      }
      
      // Get session data
      const session = sessionCache[sessionId];
      const pageData = session.pageData;
      const processed = session.processed;
      
      // Generate batch of test cases
      const newTestCases = [];
      
      // Keep track of whether we have more elements
      let hasMoreElements = false;
      let nextElementType = null;
      let nextElementIndex = 0;
      
      // Generate up to batchSize test cases
      for (let i = 0; i < batchSize; i++) {
        // Try to generate a test case based on current element type and index
        let testCase = null;
        let currentElementType = elementType;
        let currentElementIndex = elementIndex + i;
        
        // If no element type specified, find one
        if (!currentElementType) {
          if (processed.buttons < pageData.buttons.length) {
            currentElementType = 'button';
            currentElementIndex = processed.buttons;
          } else if (processed.forms < pageData.forms.length) {
            currentElementType = 'form';
            currentElementIndex = processed.forms;
          } else if (processed.links < pageData.links.length) {
            currentElementType = 'link';
            currentElementIndex = processed.links;
          } else if (processed.inputs < pageData.inputs.length) {
            currentElementType = 'input';
            currentElementIndex = processed.inputs;
          }
        }
        
        // If still no element type or we've processed all elements, break
        if (!currentElementType) {
          break;
        }
        
        // Check if we've processed all elements of this type
        if (currentElementIndex >= pageData[`${currentElementType}s`].length) {
          // Try another element type
          if (processed.buttons < pageData.buttons.length) {
            currentElementType = 'button';
            currentElementIndex = processed.buttons;
          } else if (processed.forms < pageData.forms.length) {
            currentElementType = 'form';
            currentElementIndex = processed.forms;
          } else if (processed.links < pageData.links.length) {
            currentElementType = 'link';
            currentElementIndex = processed.links;
          } else if (processed.inputs < pageData.inputs.length) {
            currentElementType = 'input';
            currentElementIndex = processed.inputs;
          } else {
            // No more elements to process
            break;
          }
        }
        
        // Get element
        const element = pageData[`${currentElementType}s`][currentElementIndex];
        
        // Generate test case based on element type
        switch (currentElementType) {
          case 'button':
            testCase = generateButtonTest(pageData.url, element, currentElementIndex);
            processed.buttons++;
            break;
          case 'form':
            testCase = generateFormTest(pageData.url, element, currentElementIndex);
            processed.forms++;
            break;
          case 'link':
            testCase = generateLinkTest(pageData.url, element, currentElementIndex);
            processed.links++;
            break;
          case 'input':
            testCase = generateInputTest(pageData.url, element, currentElementIndex);
            processed.inputs++;
            break;
        }
        
        if (testCase) {
          newTestCases.push(testCase);
          session.testCases.push(testCase);
        }
      }
      
      // Check if there are more elements to process
      hasMoreElements = 
        processed.buttons < pageData.buttons.length || 
        processed.forms < pageData.forms.length || 
        processed.links < pageData.links.length || 
        processed.inputs < pageData.inputs.length;
      
      // Determine next element type and index for next batch
      if (hasMoreElements) {
        if (processed.buttons < pageData.buttons.length) {
          nextElementType = 'button';
          nextElementIndex = processed.buttons;
        } else if (processed.forms < pageData.forms.length) {
          nextElementType = 'form';
          nextElementIndex = processed.forms;
        } else if (processed.links < pageData.links.length) {
          nextElementType = 'link';
          nextElementIndex = processed.links;
        } else if (processed.inputs < pageData.inputs.length) {
          nextElementType = 'input';
          nextElementIndex = processed.inputs;
        }
      }
      
      console.log(`Generated ${newTestCases.length} new test cases. More elements: ${hasMoreElements}`);
      
      return res.status(200).json({
        success: true,
        sessionId: sessionId,
        pageData: pageData,
        processed: processed,
        testCases: newTestCases,
        nextElementType: nextElementType,
        nextElementIndex: nextElementIndex,
        hasMoreElements: hasMoreElements,
        totalTestCases: session.testCases.length
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters'
      });
    }
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error'}`
    });
  }
};

// Helper functions to generate different types of test cases

function generateButtonTest(url, button, index) {
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonType = button.type || 'button';
  
  // Generate expected result based on button text or type
  let expectedResult = 'Action is performed successfully';
  
  const textLower = buttonText.toLowerCase();
  
  if (textLower.includes('submit')) {
    expectedResult = 'Form is submitted and appropriate response is displayed';
  } else if (textLower.includes('login') || textLower.includes('sign in')) {
    expectedResult = 'User is authenticated and redirected to dashboard';
  } else if (textLower.includes('register') || textLower.includes('sign up')) {
    expectedResult = 'New account is created and confirmation is displayed';
  } else if (textLower.includes('search')) {
    expectedResult = 'Search results are displayed based on query';
  } else if (textLower.includes('cancel')) {
    expectedResult = 'Action is cancelled and previous state is restored';
  } else if (textLower.includes('save')) {
    expectedResult = 'Data is saved and confirmation message is displayed';
  } else if (textLower.includes('delete') || textLower.includes('remove')) {
    expectedResult = 'Item is deleted and confirmation message is displayed';
  } else if (textLower.includes('add') || textLower.includes('create')) {
    expectedResult = 'Item is added or created successfully';
  } else if (textLower.includes('edit') || textLower.includes('update')) {
    expectedResult = 'Item is updated successfully';
  } else if (textLower.includes('close')) {
    expectedResult = 'Dialog or panel is closed';
  } else if (textLower.includes('open')) {
    expectedResult = 'Dialog or panel is opened';
  } else if (textLower.includes('next')) {
    expectedResult = 'User is navigated to the next step or page';
  } else if (textLower.includes('previous') || textLower.includes('back')) {
    expectedResult = 'User is navigated to the previous step or page';
  } else if (textLower.includes('download')) {
    expectedResult = 'File download begins';
  } else if (textLower.includes('upload')) {
    expectedResult = 'File upload dialog opens';
  } else if (textLower.includes('send')) {
    expectedResult = 'Message or data is sent successfully';
  }
  
  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${buttonText}`,
    description: `Verify that the ${buttonText} button works as expected`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${buttonText} button`,
        expected: 'Button is visible on the page'
      },
      {
        step: 3,
        action: `Click the ${buttonText} button`,
        expected: expectedResult
      }
    ]
  };
}

function generateFormTest(url, form, index) {
  const formId = form.id || `Form ${index + 1}`;
  const formMethod = form.method || 'post';
  const formAction = form.action || '';
  
  // Try to determine form purpose from action or ID
  let formPurpose = 'form';
  let expectedResult = 'Form submits successfully';
  
  const formIdLower = formId.toLowerCase();
  const formActionLower = formAction.toLowerCase();
  
  if (formIdLower.includes('login') || formActionLower.includes('login')) {
    formPurpose = 'login form';
    expectedResult = 'User is logged in and redirected to appropriate page';
  } else if (formIdLower.includes('register') || formActionLower.includes('register') || 
             formIdLower.includes('signup') || formActionLower.includes('signup')) {
    formPurpose = 'registration form';
    expectedResult = 'User account is created and confirmation is shown';
  } else if (formIdLower.includes('search') || formActionLower.includes('search')) {
    formPurpose = 'search form';
    expectedResult = 'Search results are displayed based on query';
  } else if (formIdLower.includes('contact') || formActionLower.includes('contact')) {
    formPurpose = 'contact form';
    expectedResult = 'Message is sent and confirmation is shown';
  } else if (formIdLower.includes('comment') || formActionLower.includes('comment')) {
    formPurpose = 'comment form';
    expectedResult = 'Comment is posted and displayed';
  } else if (formIdLower.includes('checkout') || formActionLower.includes('checkout') ||
             formIdLower.includes('payment') || formActionLower.includes('payment')) {
    formPurpose = 'payment form';
    expectedResult = 'Payment is processed and confirmation is shown';
  } else if (formIdLower.includes('subscribe') || formActionLower.includes('subscribe') ||
             formIdLower.includes('newsletter') || formActionLower.includes('newsletter')) {
    formPurpose = 'subscription form';
    expectedResult = 'Subscription is confirmed';
  }
  
  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test ${formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}: ${formId}`,
    description: `Verify that the ${formPurpose} submits correctly`,
    priority: 'High',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${formPurpose} (${formId})`,
        expected: 'Form is visible on the page'
      },
      {
        step: 3,
        action: 'Fill all required fields with valid data',
        expected: 'All fields accept input correctly'
      },
      {
        step: 4,
        action: 'Submit the form',
        expected: expectedResult
      }
    ]
  };
}

function generateLinkTest(url, link, index) {
  const linkText = link.text || 'Unnamed Link';
  const linkHref = link.href || '#';
  
  // Generate expected result based on link href and text
  let expectedResult = 'User is navigated to the correct page';
  
  const textLower = linkText.toLowerCase();
  const hrefLower = linkHref.toLowerCase();
  
  if (hrefLower === '/' || hrefLower.includes('home') || textLower.includes('home')) {
    expectedResult = 'User is navigated to the home page';
  } else if (hrefLower.includes('about') || textLower.includes('about')) {
    expectedResult = 'User is navigated to the About page';
  } else if (hrefLower.includes('contact') || textLower.includes('contact')) {
    expectedResult = 'User is navigated to the Contact page';
  } else if (hrefLower.includes('product') || textLower.includes('product')) {
    expectedResult = 'User is navigated to the Products page';
  } else if (hrefLower.includes('service') || textLower.includes('service')) {
    expectedResult = 'User is navigated to the Services page';
  } else if (hrefLower.includes('blog') || textLower.includes('blog') || 
             hrefLower.includes('news') || textLower.includes('news')) {
    expectedResult = 'User is navigated to the Blog/News page';
  } else if (hrefLower.includes('faq') || textLower.includes('faq')) {
    expectedResult = 'User is navigated to the FAQ page';
  } else if (hrefLower.includes('login') || textLower.includes('login') ||
             hrefLower.includes('sign-in') || textLower.includes('sign in')) {
    expectedResult = 'User is navigated to the login page';
  } else if (hrefLower.includes('register') || textLower.includes('register') ||
             hrefLower.includes('sign-up') || textLower.includes('sign up')) {
    expectedResult = 'User is navigated to the registration page';
  } else if (hrefLower.startsWith('#')) {
    expectedResult = 'Page scrolls to the appropriate section';
  } else if (hrefLower.startsWith('mailto:')) {
    expectedResult = 'Email client opens with the recipient address';
  } else if (hrefLower.startsWith('tel:')) {
    expectedResult = 'Phone dialer opens with the correct number';
  } else if (hrefLower.includes('.pdf') || hrefLower.includes('.doc') || 
             hrefLower.includes('.xls') || hrefLower.includes('.zip')) {
    expectedResult = 'File download begins';
  } else if (hrefLower.startsWith('http') && !hrefLower.includes(url.replace(/https?:\/\//, ''))) {
    expectedResult = 'User is navigated to external website';
  }
  
  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: `Verify that the ${linkText} link navigates correctly`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${linkText} link`,
        expected: 'Link is visible on the page'
      },
      {
        step: 3,
        action: `Click the ${linkText} link`,
        expected: expectedResult
      }
    ]
  };
}

function generateInputTest(url, input, index) {
  const inputType = input.type || 'text';
  const inputName = input.name || input.id || `Input ${index + 1}`;
  const inputPlaceholder = input.placeholder || '';
  
  // Try to determine input purpose from attributes
  let inputPurpose = inputType;
  let testData = 'Sample text';
  let validationCheck = 'Input accepts the entered data';
  
  const inputNameLower = inputName.toLowerCase();
  const placeholderLower = inputPlaceholder.toLowerCase();
  
  // Field specific test data and validation
  switch (inputType) {
    case 'email':
      testData = 'test@example.com';
      validationCheck = 'Email format is validated correctly';
      break;
      
    case 'password':
      testData = 'SecurePassword123';
      validationCheck = 'Password is masked and accepted';
      break;
      
    case 'number':
      testData = '42';
      validationCheck = 'Numeric value is accepted';
      break;
      
    case 'tel':
      testData = '(555) 123-4567';
      validationCheck = 'Phone number format is accepted';
      break;
      
    case 'date':
      testData = '2023-01-01';
      validationCheck = 'Date is accepted in the correct format';
      break;
      
    case 'checkbox':
      testData = 'checked state';
      validationCheck = 'Checkbox state is toggled successfully';
      break;
      
    case 'radio':
      testData = 'selected state';
      validationCheck = 'Radio button is selected successfully';
      break;
      
    default:
      // Try to determine field purpose from name/placeholder
      if (inputNameLower.includes('email') || placeholderLower.includes('email')) {
        inputPurpose = 'email';
        testData = 'test@example.com';
        validationCheck = 'Email format is validated correctly';
      } else if (inputNameLower.includes('name') || placeholderLower.includes('name')) {
        inputPurpose = 'name';
        testData = 'John Doe';
        validationCheck = 'Name is accepted correctly';
      } else if (inputNameLower.includes('phone') || placeholderLower.includes('phone') ||
                inputNameLower.includes('tel') || placeholderLower.includes('tel')) {
        inputPurpose = 'phone number';
        testData = '(555) 123-4567';
        validationCheck = 'Phone number is accepted correctly';
      } else if (inputNameLower.includes('address') || placeholderLower.includes('address')) {
        inputPurpose = 'address';
        testData = '123 Main St';
        validationCheck = 'Address is accepted correctly';
      } else if (inputNameLower.includes('search') || placeholderLower.includes('search')) {
        inputPurpose = 'search';
        testData = 'search query';
        validationCheck = 'Search query is accepted correctly';
      } else if (inputNameLower.includes('zip') || placeholderLower.includes('zip') ||
                inputNameLower.includes('postal') || placeholderLower.includes('postal')) {
        inputPurpose = 'postal code';
        testData = '12345';
        validationCheck = 'Postal code is accepted correctly';
      }
  }
  
  let actionStep;
  if (inputType === 'checkbox' || inputType === 'radio') {
    actionStep = `Click the ${inputName} ${inputType}`;
  } else {
    actionStep = `Enter "${testData}" into the ${inputName} field`;
  }
  
  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test ${inputPurpose.charAt(0).toUpperCase() + inputPurpose.slice(1)} Input: ${inputName}`,
    description: `Verify that the ${inputName} input field works correctly`,
    priority: inputType === 'password' || inputType === 'email' ? 'High' : 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${inputName} field`,
        expected: 'Input field is visible on the page'
      },
      {
        step: 3,
        action: actionStep,
        expected: 'Input is interactive and responds to user action'
      },
      {
        step: 4,
        action: 'Check validation behavior',
        expected: validationCheck
      }
    ]
  };
}
