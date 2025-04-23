// api/generate-incremental.js
// Context-aware website analyzer version
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
        
        // Extract elements with context
        const pageData = {
          url: fetchUrl,
          title: pageTitle,
          extractedAt: new Date().toISOString(),
          buttons: [],
          forms: [],
          links: [],
          inputs: []
        };
        
        // Extract buttons with more context (limit to 20)
        $('button, input[type="submit"], input[type="button"], .btn, [role="button"]').slice(0, 20).each((i, el) => {
          const $el = $(el);
          // Get parent context for better naming
          const parentSection = getParentContext($, el);
          
          pageData.buttons.push({
            text: $el.text().trim() || $el.val() || 'Unnamed Button',
            type: $el.attr('type') || 'button',
            id: $el.attr('id') || '',
            name: $el.attr('name') || '',
            class: $el.attr('class') || '',
            context: parentSection, // Add context
            // Store HTML for debugging
            html: $.html(el).substring(0, 200)
          });
        });
        
        // Extract forms with context (limit to 10)
        $('form').slice(0, 10).each((i, el) => {
          const $form = $(el);
          // Get parent context
          const parentSection = getParentContext($, el);
          const formHeading = $form.find('h1, h2, h3, h4, h5, h6').first().text().trim();
          
          pageData.forms.push({
            id: $form.attr('id') || '',
            action: $form.attr('action') || '',
            method: $form.attr('method') || '',
            heading: formHeading,
            context: parentSection, // Add context
            // Count input fields
            inputCount: $form.find('input, select, textarea').length,
            // Store HTML
            html: $.html(el).substring(0, 200)
          });
        });
        
        // Extract links with context (limit to 25)
        $('a[href]').slice(0, 25).each((i, el) => {
          const $link = $(el);
          
          // Get text content properly
          let linkText = $link.text().trim();
          if (!linkText) {
            // Look for image alt text
            const $img = $link.find('img');
            if ($img.length > 0) {
              linkText = $img.attr('alt') || 'Image Link';
            } else {
              linkText = 'Unnamed Link';
            }
          }
          
          // Get link context
          const parentSection = getParentContext($, el);
          // Check for menu/nav context
          const isInNav = $link.closest('nav, [role="navigation"], .menu, .navigation, header').length > 0;
          const isInFooter = $link.closest('footer, .footer').length > 0;
          
          // Determine section
          let section = parentSection;
          if (isInNav) section = 'Navigation Menu';
          if (isInFooter) section = 'Footer';
          
          pageData.links.push({
            text: linkText,
            href: $link.attr('href') || '',
            id: $link.attr('id') || '',
            context: section,
            isNavLink: isInNav,
            isFooterLink: isInFooter,
            // Store any relevant classes
            classes: $link.attr('class') || '',
            // Store HTML
            html: $.html(el).substring(0, 200)
          });
        });
        
        // Extract inputs with context (limit to 15)
        $('input[type!="submit"][type!="button"], textarea, select').slice(0, 15).each((i, el) => {
          const $input = $(el);
          
          // Find label for this input
          let label = '';
          const id = $input.attr('id');
          if (id) {
            label = $(`label[for="${id}"]`).text().trim();
          }
          if (!label) {
            // Try to get label from parent
            label = $input.closest('label').text().trim();
            // Remove the input value from the label text if present
            const inputVal = $input.val();
            if (inputVal && label.includes(inputVal)) {
              label = label.replace(inputVal, '').trim();
            }
          }
          
          // Get form context if available
          const $form = $input.closest('form');
          let formContext = '';
          if ($form.length > 0) {
            formContext = $form.find('h1, h2, h3, h4, h5, h6').first().text().trim();
            if (!formContext) {
              // Try to get form context from buttons
              const $button = $form.find('button, input[type="submit"]').first();
              if ($button.length > 0) {
                formContext = $button.text().trim() || $button.val();
              }
            }
          }
          
          pageData.inputs.push({
            type: $input.attr('type') || 'text',
            id: $input.attr('id') || '',
            name: $input.attr('name') || '',
            placeholder: $input.attr('placeholder') || '',
            label: label,
            context: formContext || getParentContext($, el),
            isRequired: $input.attr('required') !== undefined || $input.hasClass('required'),
            // Store HTML
            html: $.html(el).substring(0, 200)
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
          testCases: [],
          processedElements: new Set() // Track processed elements to avoid duplicates
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
      const processedElements = session.processedElements || new Set();
      
      // Generate batch of unique test cases
      const newTestCases = [];
      let remainingBatchSize = batchSize;
      
      // Keep track of whether we have more elements
      let hasMoreElements = false;
      let nextElementType = elementType;
      let nextElementIndex = elementIndex;
      
      // Helper function to check if an element has been processed
      const isElementProcessed = (type, index) => {
        return processedElements.has(`${type}-${index}`);
      };
      
      // Process each element type
      const elementTypes = ['button', 'link', 'form', 'input'];
      let typesExhausted = 0;
      
      while (remainingBatchSize > 0 && typesExhausted < elementTypes.length) {
        // If no element type specified or current type exhausted, find one
        if (!nextElementType || nextElementIndex >= pageData[`${nextElementType}s`].length) {
          // Try each element type in sequence
          let found = false;
          for (const type of elementTypes) {
            if (processed[`${type}s`] < pageData[`${type}s`].length) {
              nextElementType = type;
              nextElementIndex = processed[`${type}s`];
              found = true;
              break;
            }
          }
          
          if (!found) {
            // No more elements to process
            break;
          }
        }
        
        // Find next unprocessed element
        let foundUnprocessed = false;
        
        while (nextElementIndex < pageData[`${nextElementType}s`].length) {
          if (!isElementProcessed(nextElementType, nextElementIndex)) {
            foundUnprocessed = true;
            break;
          }
          nextElementIndex++;
        }
        
        // If we've processed all elements of this type, go to next type
        if (!foundUnprocessed || nextElementIndex >= pageData[`${nextElementType}s`].length) {
          let found = false;
          for (const type of elementTypes) {
            if (processed[`${type}s`] < pageData[`${type}s`].length) {
              nextElementType = type;
              nextElementIndex = processed[`${type}s`];
              found = true;
              break;
            }
          }
          
          if (!found) {
            typesExhausted++;
            continue;
          }
        }
        
        // Get element
        const element = pageData[`${nextElementType}s`][nextElementIndex];
        
        // Skip if already processed
        if (isElementProcessed(nextElementType, nextElementIndex)) {
          nextElementIndex++;
          continue;
        }
        
        // Generate test case based on element type
        let testCase;
        
        switch (nextElementType) {
          case 'button':
            testCase = generateButtonTest(pageData.url, element, nextElementIndex);
            break;
          case 'form':
            testCase = generateFormTest(pageData.url, element, nextElementIndex);
            break;
          case 'link':
            testCase = generateLinkTest(pageData.url, element, nextElementIndex);
            break;
          case 'input':
            testCase = generateInputTest(pageData.url, element, nextElementIndex);
            break;
        }
        
        if (testCase) {
          // Mark element as processed
          processedElements.add(`${nextElementType}-${nextElementIndex}`);
          processed[`${nextElementType}s`]++;
          
          // Add test case
          newTestCases.push(testCase);
          session.testCases.push(testCase);
          remainingBatchSize--;
        }
        
        // Move to next element
        nextElementIndex++;
        
        // If we've processed all elements of this type, we'll pick a new type on next iteration
        if (nextElementIndex >= pageData[`${nextElementType}s`].length) {
          nextElementType = null;
        }
      }
      
      // Check if there are more elements to process
      hasMoreElements = 
        elementTypes.some(type => 
          pageData[`${type}s`].some((element, index) => 
            !isElementProcessed(type, index)
          )
        );
      
      // Determine next element type and index for next batch
      if (hasMoreElements) {
        let foundNext = false;
        
        // Find the next unprocessed element
        for (const type of elementTypes) {
          for (let i = 0; i < pageData[`${type}s`].length; i++) {
            if (!isElementProcessed(type, i)) {
              nextElementType = type;
              nextElementIndex = i;
              foundNext = true;
              break;
            }
          }
          if (foundNext) break;
        }
      } else {
        nextElementType = null;
        nextElementIndex = 0;
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

/**
 * Helper function to get parent context of an element
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {CheerioElement} el - Element to get context for
 * @returns {string} - Context string
 */
function getParentContext($, el) {
  const $el = $(el);
  
  // Look for parent section with heading
  let $section = $el.closest('section, article, div.section, [role="region"], .card, .package, .product');
  
  if ($section.length > 0) {
    // Try to get heading
    const $heading = $section.find('h1, h2, h3, h4, h5, h6').first();
    if ($heading.length > 0) {
      return $heading.text().trim();
    }
    
    // Try to get a class name that might indicate purpose
    const className = $section.attr('class');
    if (className) {
      const matches = className.match(/(?:section|block|container|panel|card|module)-([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) {
        return capitalizeWords(matches[1].replace(/[-_]/g, ' '));
      }
    }
  }
  
  // Look for parent with ID
  const $parentWithId = $el.closest('[id]');
  if ($parentWithId.length > 0) {
    const id = $parentWithId.attr('id');
    if (id && !id.match(/^[0-9]+$/)) {
      return capitalizeWords(id.replace(/[-_]/g, ' '));
    }
  }
  
  // Try to extract from breadcrumbs
  const $breadcrumbs = $('nav[aria-label="breadcrumb"], .breadcrumb, .breadcrumbs');
  if ($breadcrumbs.length > 0) {
    const $items = $breadcrumbs.find('li');
    if ($items.length > 1) {
      return $items.eq($items.length - 1).text().trim();
    }
  }
  
  // Default to generic context
  return 'Page Content';
}

/**
 * Capitalize words in a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Helper functions to generate different types of test cases

function generateButtonTest(url, button, index) {
  const buttonText = button.text || button.id || 'Unnamed Button';
  const buttonType = button.type || 'button';
  const buttonContext = button.context || 'Page';
  
  // Create specific title with context
  let title = `Test Button: ${buttonText}`;
  if (buttonContext && buttonContext !== 'Page Content' && !title.includes(buttonContext)) {
    title = `Test ${buttonContext} Button: ${buttonText}`;
  }
  
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
  } else if (textLower.includes('select') || textLower.includes('choose')) {
    expectedResult = `${buttonContext} is selected and highlighted`;
  }
  
  // Context-specific expected results
  if (buttonContext.toLowerCase().includes('package') || buttonContext.toLowerCase().includes('product')) {
    if (textLower.includes('select')) {
      expectedResult = `${buttonContext} is selected and added to cart/selection`;
    } else if (textLower.includes('buy')) {
      expectedResult = `Checkout process begins for ${buttonContext}`;
    }
  }
  
  return {
    id: `TC_BTN_${index + 1}`,
    title: title,
    description: `Verify that the ${buttonText} button in ${buttonContext} works as expected`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${buttonText} button in the ${buttonContext} section`,
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
  const formHeading = form.heading || '';
  const formContext = form.context || 'Page Content';
  
  // Create specific title
  let formPurpose = 'form';
  let title = `Test Form: ${formId}`;
  
  if (formHeading) {
    title = `Test Form: ${formHeading}`;
    formPurpose = formHeading.toLowerCase();
  } else if (formContext && formContext !== 'Page Content') {
    title = `Test Form: ${formContext}`;
    formPurpose = formContext.toLowerCase();
  }
  
  // Try to determine form purpose from ID, context, or heading
  let expectedResult = 'Form submits successfully';
  
  const formIdLower = formId.toLowerCase();
  const formContextLower = formContext.toLowerCase();
  const formHeadingLower = formHeading.toLowerCase();
  
  if (formIdLower.includes('login') || formContextLower.includes('login') || formHeadingLower.includes('login')) {
    formPurpose = 'login form';
    expectedResult = 'User is logged in and redirected to appropriate page';
  } else if (formIdLower.includes('register') || formContextLower.includes('register') || 
             formIdLower.includes('signup') || formContextLower.includes('signup')) {
    formPurpose = 'registration form';
    expectedResult = 'User account is created and confirmation is shown';
  } else if (formIdLower.includes('search') || formContextLower.includes('search')) {
    formPurpose = 'search form';
    expectedResult = 'Search results are displayed based on query';
  } else if (formIdLower.includes('contact') || formContextLower.includes('contact')) {
    formPurpose = 'contact form';
    expectedResult = 'Message is sent and confirmation is shown';
  } else if (formIdLower.includes('comment') || formContextLower.includes('comment')) {
    formPurpose = 'comment form';
    expectedResult = 'Comment is posted and displayed';
  } else if (formIdLower.includes('checkout') || formContextLower.includes('checkout') ||
             formIdLower.includes('payment') || formContextLower.includes('payment')) {
    formPurpose = 'payment form';
    expectedResult = 'Payment is processed and confirmation is shown';
  } else if (formIdLower.includes('subscribe') || formContextLower.includes('subscribe') ||
             formIdLower.includes('newsletter') || formContextLower.includes('newsletter')) {
    formPurpose = 'subscription form';
    expectedResult = 'Subscription is confirmed';
  }
  
  return {
    id: `TC_FORM_${index + 1}`,
    title: title,
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
        action: `Locate the ${formPurpose} in the ${formContext === 'Page Content' ? 'page' : formContext} section`,
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
  const linkContext = link.context || 'Page Content';
  const isNavLink = link.isNavLink;
  const isFooterLink = link.isFooterLink;
  
  // Create a more specific title with context
  let title = `Test Link: ${linkText}`;
  if (linkContext && linkContext !== 'Page Content' && !title.includes(linkContext)) {
    if (isNavLink) {
      title = `Test Navigation Link: ${linkText}`;
    } else if (isFooterLink) {
      title = `Test Footer Link: ${linkText}`;
    } else {
      title = `Test ${linkContext} Link: ${linkText}`;
    }
  }
  
  // Generate expected result based on link href, text, and context
  let expectedResult = 'User is navigated to the correct page';
  
  const textLower = linkText.toLowerCase();
  const hrefLower = linkHref.toLowerCase();
  const contextLower = linkContext.toLowerCase();
  
  // First check context + text combinations for most specific results
  if (contextLower.includes('package') || contextLower.includes('product') || contextLower.includes('pricing')) {
    if (textLower.includes('learn more') || textLower.includes('details')) {
      expectedResult = `Detailed information about the ${linkContext} is displayed`;
    } else if (textLower.includes('select') || textLower.includes('choose')) {
      expectedResult = `${linkContext} is selected and added to cart/selection`;
    } else if (textLower.includes('buy') || textLower.includes('purchase')) {
      expectedResult = `Checkout process begins for ${linkContext}`;
    }
  } else if (contextLower.includes('navigation') || isNavLink) {
    expectedResult = `User is navigated to the ${linkText} section/page`;
  } else if (contextLower.includes('footer') || isFooterLink) {
    if (textLower.includes('terms') || textLower.includes('privacy') || textLower.includes('policy')) {
      expectedResult = `User is navigated to the ${linkText} page`;
    } else if (textLower.includes('contact')) {
      expectedResult = 'User is navigated to the Contact page';
    }
  }
  
  // If not yet determined by context, check URL structure
  if (expectedResult === 'User is navigated to the correct page') {
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
  }
  
  // Get section description based on context
  let sectionDescription;
  if (isNavLink) {
    sectionDescription = 'navigation menu';
  } else if (isFooterLink) {
    sectionDescription = 'footer';
  } else if (linkContext && linkContext !== 'Page Content') {
    sectionDescription = `${linkContext} section`;
  } else {
    sectionDescription = 'page';
  }
  
  return {
    id: `TC_LINK_${index + 1}`,
    title: title,
    description: `Verify that the ${linkText} link in the ${sectionDescription} navigates correctly`,
    priority: 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${linkText} link in the ${sectionDescription}`,
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
  const inputLabel = input.label || '';
  const inputPlaceholder = input.placeholder || '';
  const inputContext = input.context || 'Page Content';
  const isRequired = input.isRequired;
  
  // Get the most descriptive name for the input
  const inputDescription = inputLabel || inputPlaceholder || inputName;
  
  // Create specific title with context
  let title = `Test ${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input: ${inputDescription}`;
  if (inputContext && inputContext !== 'Page Content' && !title.includes(inputContext)) {
    title = `Test ${inputContext} ${inputType} Input: ${inputDescription}`;
  }
  
  // Try to determine input purpose from attributes
  let inputPurpose = inputType;
  let testData = 'Sample text';
  let validationCheck = 'Input accepts the entered data';
  
  const inputNameLower = inputName.toLowerCase();
  const inputLabelLower = inputLabel.toLowerCase();
  const placeholderLower = inputPlaceholder.toLowerCase();
  const contextLower = inputContext.toLowerCase();
  
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
      // Try to determine field purpose from name/placeholder/label/context
      if (inputNameLower.includes('email') || inputLabelLower.includes('email') || placeholderLower.includes('email')) {
        inputPurpose = 'email';
        testData = 'test@example.com';
        validationCheck = 'Email format is validated correctly';
      } else if (inputNameLower.includes('name') || inputLabelLower.includes('name') || placeholderLower.includes('name')) {
        inputPurpose = 'name';
        testData = 'John Doe';
        validationCheck = 'Name is accepted correctly';
      } else if (inputNameLower.includes('phone') || inputLabelLower.includes('phone') || placeholderLower.includes('phone') ||
                inputNameLower.includes('tel') || inputLabelLower.includes('tel') || placeholderLower.includes('tel')) {
        inputPurpose = 'phone number';
        testData = '(555) 123-4567';
        validationCheck = 'Phone number is accepted correctly';
      } else if (inputNameLower.includes('address') || inputLabelLower.includes('address') || placeholderLower.includes('address')) {
        inputPurpose = 'address';
        testData = '123 Main St';
        validationCheck = 'Address is accepted correctly';
      } else if (inputNameLower.includes('search') || inputLabelLower.includes('search') || placeholderLower.includes('search') ||
                contextLower.includes('search')) {
        inputPurpose = 'search';
        testData = 'search query';
        validationCheck = 'Search query is accepted correctly';
      } else if (inputNameLower.includes('zip') || inputLabelLower.includes('zip') || placeholderLower.includes('zip') ||
                inputNameLower.includes('postal') || inputLabelLower.includes('postal') || placeholderLower.includes('postal')) {
        inputPurpose = 'postal code';
        testData = '12345';
        validationCheck = 'Postal code is accepted correctly';
      }
  }
  
  // Enhance validation check based on required status
  if (isRequired) {
    validationCheck += ' and is properly marked as required';
  }
  
  let actionStep;
  if (inputType === 'checkbox' || inputType === 'radio') {
    actionStep = `Click the ${inputDescription} ${inputType}`;
  } else {
    actionStep = `Enter "${testData}" into the ${inputDescription} field`;
  }
  
  return {
    id: `TC_INPUT_${index + 1}`,
    title: title,
    description: `Verify that the ${inputDescription} input field in ${inputContext} works correctly`,
    priority: inputType === 'password' || inputType === 'email' ? 'High' : 'Medium',
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: 'Page loads successfully'
      },
      {
        step: 2,
        action: `Locate the ${inputDescription} field in the ${inputContext === 'Page Content' ? 'page' : inputContext} section`,
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
