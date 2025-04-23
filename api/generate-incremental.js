// api/generate-incremental.js
// Simple version that worked before, with minor enhancements

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
    // Extract basic request info
    const body = req.body || {};
    const url = body.url || 'https://example.com';
    const mode = body.mode || 'first';
    const sessionId = body.sessionId;
    
    console.log(`Request received: mode=${mode}, url=${url}, sessionId=${sessionId}`);
    
    // For first-time requests
    if (mode === 'first') {
      // Create a new session ID
      const newSessionId = 'session-' + Math.random().toString(36).substring(2, 10);
      
      // Create page data with simple mock elements that are relevant to VelocityQA
      const pageData = {
        url: url,
        title: 'VelocityQA - Software Testing Solutions',
        extractedAt: new Date().toISOString(),
        buttons: [
          { text: 'Get Started', id: 'btn1', type: 'button' },
          { text: 'Contact Us', id: 'btn2', type: 'button' },
          { text: 'Submit', id: 'btn3', type: 'submit' },
          { text: 'Send Message', id: 'btn4', type: 'button' },
          { text: 'Book Demo', id: 'btn5', type: 'button' }
        ],
        forms: [
          { id: 'contactForm', action: '/contact', method: 'post' },
          { id: 'newsletterForm', action: '/subscribe', method: 'post' }
        ],
        links: [
          { text: 'Services', href: '/services', id: 'link1' },
          { text: 'About Us', href: '/about', id: 'link2' },
          { text: 'Test Automation', href: '/services/automation', id: 'link3' },
          { text: 'Bug Hunter Package', href: '/services/bug-hunter', id: 'link4' },
          { text: 'Learn More', href: '/services/details', id: 'link5' },
          { text: 'Select Package', href: '/pricing', id: 'link6' },
          { text: 'Documentation', href: '/docs', id: 'link7' },
          { text: 'API Reference', href: '/api', id: 'link8' },
          { text: 'Contact', href: '/contact', id: 'link9' },
          { text: 'Pricing', href: '/pricing', id: 'link10' }
        ],
        inputs: [
          { type: 'text', id: 'name', name: 'name', placeholder: 'Your Name' },
          { type: 'email', id: 'email', name: 'email', placeholder: 'Your Email' },
          { type: 'textarea', id: 'message', name: 'message', placeholder: 'Your Message' },
          { type: 'checkbox', id: 'subscribe', name: 'subscribe' },
          { type: 'radio', id: 'option1', name: 'package' }
        ]
      };
      
      // Create processed state
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
        title: `Verify VelocityQA Website Loads Correctly`,
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
            expected: `Title is "VelocityQA - Software Testing Solutions"`
          }
        ]
      };
      
      // Add to session
      sessionCache[newSessionId].testCases.push(firstTest);
      
      // Return first test response
      return res.status(200).json({
        success: true,
        sessionId: newSessionId,
        pageData: pageData,
        processed: processed,
        testCases: [firstTest],
        nextElementType: 'button',
        nextElementIndex: 0,
        hasMoreElements: true,
        totalTestCases: 1
      });
    } 
    // For subsequent requests (next mode)
    else if (mode === 'next' && sessionId) {
      // Check if session exists
      if (!sessionCache[sessionId]) {
        return res.status(200).json({
          success: false,
          error: 'Invalid or expired session ID'
        });
      }
      
      // Get session data
      const session = sessionCache[sessionId];
      const pageData = session.pageData;
      const processed = session.processed;
      
      // Generate 5 more test cases based on the current processing state
      const newTestCases = [];
      
      // Determine what element types we still have to process
      const elementTypes = [];
      
      if (processed.buttons < pageData.buttons.length) {
        elementTypes.push('button');
      }
      if (processed.forms < pageData.forms.length) {
        elementTypes.push('form');
      }
      if (processed.links < pageData.links.length) {
        elementTypes.push('link');
      }
      if (processed.inputs < pageData.inputs.length) {
        elementTypes.push('input');
      }
      
      // If no more elements, return empty
      if (elementTypes.length === 0) {
        return res.status(200).json({
          success: true,
          sessionId: sessionId,
          pageData: pageData,
          processed: processed,
          testCases: [],
          hasMoreElements: false,
          totalTestCases: session.testCases.length
        });
      }
      
      // Generate up to 5 test cases
      for (let i = 0; i < 5; i++) {
        // Cycle through element types
        const typeIndex = i % elementTypes.length;
        const elementType = elementTypes[typeIndex];
        
        // Get current index for this element type
        const elementIndex = processed[elementType + 's'];
        
        // If we've processed all elements of this type, skip
        if (elementIndex >= pageData[elementType + 's'].length) {
          continue;
        }
        
        // Get the element
        const element = pageData[elementType + 's'][elementIndex];
        
        // Generate test case based on element type
        let testCase;
        
        switch (elementType) {
          case 'button':
            testCase = generateButtonTest(pageData.url, element, elementIndex);
            processed.buttons++;
            break;
          case 'form':
            testCase = generateFormTest(pageData.url, element, elementIndex);
            processed.forms++;
            break;
          case 'link':
            testCase = generateLinkTest(pageData.url, element, elementIndex);
            processed.links++;
            break;
          case 'input':
            testCase = generateInputTest(pageData.url, element, elementIndex);
            processed.inputs++;
            break;
        }
        
        if (testCase) {
          newTestCases.push(testCase);
          session.testCases.push(testCase);
        }
        
        // If we've processed all elements, break
        if (
          processed.buttons >= pageData.buttons.length &&
          processed.forms >= pageData.forms.length &&
          processed.links >= pageData.links.length &&
          processed.inputs >= pageData.inputs.length
        ) {
          break;
        }
      }
      
      // Determine if there are more elements to process
      const hasMoreElements = 
        processed.buttons < pageData.buttons.length ||
        processed.forms < pageData.forms.length ||
        processed.links < pageData.links.length ||
        processed.inputs < pageData.inputs.length;
      
      // Determine next element type and index
      let nextElementType = null;
      let nextElementIndex = 0;
      
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
      
      // Return response with new test cases
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
      return res.status(200).json({
        success: false,
        error: 'Invalid request. Missing sessionId for "next" mode.'
      });
    }
  } catch (error) {
    console.error('Error in generate-incremental:', error);
    
    // Return 200 OK with error information to avoid HTTP error codes
    return res.status(200).json({
      success: false,
      error: `Error: ${error.message || 'Unknown error'}`
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
  } else if (textLower.includes('contact')) {
    expectedResult = 'Contact form is displayed or submitted';
  } else if (textLower.includes('get started')) {
    expectedResult = 'User is guided to the first step of the process';
  } else if (textLower.includes('send')) {
    expectedResult = 'Message is sent successfully';
  } else if (textLower.includes('book')) {
    expectedResult = 'Demo booking process is initiated';
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
  
  // Try to determine form purpose from ID
  let formPurpose = 'form';
  let expectedResult = 'Form submits successfully';
  
  const formIdLower = formId.toLowerCase();
  
  if (formIdLower.includes('contact')) {
    formPurpose = 'contact form';
    expectedResult = 'Contact message is sent and confirmation is shown';
  } else if (formIdLower.includes('newsletter') || formIdLower.includes('subscribe')) {
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
  let description = `Verify that the ${linkText} link navigates correctly`;
  
  const textLower = linkText.toLowerCase();
  const hrefLower = linkHref.toLowerCase();
  
  // Special handling for "Bug Hunter Package" and "Select Package"
  if (textLower.includes('bug hunter')) {
    expectedResult = 'User is navigated to the Bug Hunter Package details page';
    description = `Verify that the Bug Hunter Package link navigates to the correct service page`;
  } else if (textLower.includes('select package')) {
    expectedResult = 'User is navigated to the package selection or pricing page';
    description = `Verify that the Select Package link navigates to the pricing page`;
  } else if (textLower.includes('learn more')) {
    // Check if it's related to a service or package from the URL
    if (hrefLower.includes('service') || hrefLower.includes('detail')) {
      expectedResult = 'Detailed service information is displayed';
      description = `Verify that the Learn More link displays additional service details`;
    }
  } else if (hrefLower.includes('service')) {
    expectedResult = 'User is navigated to the Services page';
  } else if (hrefLower.includes('about')) {
    expectedResult = 'User is navigated to the About page';
  } else if (hrefLower.includes('contact')) {
    expectedResult = 'User is navigated to the Contact page';
  } else if (hrefLower.includes('pricing')) {
    expectedResult = 'User is navigated to the Pricing page';
  } else if (hrefLower.includes('api')) {
    expectedResult = 'User is navigated to the API Reference page';
  } else if (hrefLower.includes('doc')) {
    expectedResult = 'User is navigated to the Documentation page';
  }
  
  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: description,
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
      } else if (inputNameLower.includes('message') || placeholderLower.includes('message')) {
        inputPurpose = 'message';
        testData = 'This is a test message';
        validationCheck = 'Message is accepted correctly';
      } else if (inputNameLower.includes('subscribe')) {
        inputPurpose = 'subscription';
        testData = 'checked state';
        validationCheck = 'Subscription preference is saved';
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
