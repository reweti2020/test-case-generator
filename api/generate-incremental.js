// api/generate-incremental.js
// Improved version that handles multiple tests and maintains state

// Simple in-memory cache for session data (will reset on server restart)
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
      
      // Create page data
      const pageData = {
        url: url,
        title: 'Page Title for ' + url,
        extractedAt: new Date().toISOString(),
        buttons: [
          { text: 'Submit', id: 'btn1', type: 'submit' },
          { text: 'Cancel', id: 'btn2', type: 'button' },
          { text: 'Login', id: 'btn3', type: 'button' },
          { text: 'Register', id: 'btn4', type: 'button' },
          { text: 'Search', id: 'btn5', type: 'button' }
        ],
        forms: [
          { id: 'form1', action: '/submit', method: 'post' },
          { id: 'form2', action: '/search', method: 'get' }
        ],
        links: [
          { text: 'Home', href: '/', id: 'link1' },
          { text: 'About', href: '/about', id: 'link2' },
          { text: 'Contact', href: '/contact', id: 'link3' },
          { text: 'Products', href: '/products', id: 'link4' },
          { text: 'Blog', href: '/blog', id: 'link5' }
        ],
        inputs: [
          { type: 'text', id: 'input1', name: 'username', placeholder: 'Username' },
          { type: 'password', id: 'input2', name: 'password', placeholder: 'Password' },
          { type: 'email', id: 'input3', name: 'email', placeholder: 'Email' },
          { type: 'checkbox', id: 'input4', name: 'remember', placeholder: 'Remember me' },
          { type: 'submit', id: 'input5', name: 'submit', placeholder: 'Submit' }
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
        title: `Verify ${url} Loads Correctly`,
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
            expected: `Title is "${pageData.title}"`
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
        return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Missing sessionId for "next" mode.'
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
  
  if (buttonText.toLowerCase().includes('submit')) {
    expectedResult = 'Form is submitted and appropriate response is displayed';
  } else if (buttonText.toLowerCase().includes('login')) {
    expectedResult = 'User is authenticated and redirected to dashboard';
  } else if (buttonText.toLowerCase().includes('register')) {
    expectedResult = 'New account is created and confirmation is displayed';
  } else if (buttonText.toLowerCase().includes('search')) {
    expectedResult = 'Search results are displayed based on query';
  } else if (buttonText.toLowerCase().includes('cancel')) {
    expectedResult = 'Action is cancelled and previous state is restored';
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
  
  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test Form: ${formId}`,
    description: `Verify that the ${formId} form submits correctly`,
    priority: 'High',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${formId} form`,
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
        expected: formMethod === 'get' ? 
          'Form submits and URL changes with query parameters' : 
          'Form submits and appropriate response is displayed'
      }
    ]
  };
}

function generateLinkTest(url, link, index) {
  const linkText = link.text || 'Unnamed Link';
  const linkHref = link.href || '#';
  
  // Generate expected result based on link href
  let expectedResult = 'User is navigated to the correct page';
  
  if (linkHref === '/' || linkHref.includes('home')) {
    expectedResult = 'User is navigated to the home page';
  } else if (linkHref.includes('about')) {
    expectedResult = 'User is navigated to the About page';
  } else if (linkHref.includes('contact')) {
    expectedResult = 'User is navigated to the Contact page';
  } else if (linkHref.includes('product')) {
    expectedResult = 'User is navigated to the Products page';
  } else if (linkHref.includes('blog') || linkHref.includes('news')) {
    expectedResult = 'User is navigated to the Blog/News page';
  } else if (linkHref.startsWith('#')) {
    expectedResult = 'Page scrolls to the appropriate section';
  } else if (linkHref.startsWith('mailto:')) {
    expectedResult = 'Email client opens with the recipient address';
  } else if (linkHref.startsWith('tel:')) {
    expectedResult = 'Phone dialer opens with the correct number';
  } else if (linkHref.includes('.pdf') || linkHref.includes('.doc') || linkHref.includes('.zip')) {
    expectedResult = 'File download begins';
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
  
  // Generate test data based on input type
  let testData = 'Sample text';
  let validationCheck = 'Input accepts the entered data';
  
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
  }
  
  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test ${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input: ${inputName}`,
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
        action: `Locate the ${inputName} ${inputType} field`,
        expected: 'Input field is visible on the page'
      },
      {
        step: 3,
        action: inputType === 'checkbox' || inputType === 'radio' ? 
          `Click the ${inputName} ${inputType}` : 
          `Enter "${testData}" into the ${inputName} field`,
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
