// api/generate-tests.js - Enhanced with detailed element extraction
// Conditionally import puppeteer based on environment
let puppeteer;
let chromium;

console.log('========== API MODULE INITIALIZATION ==========');

try {
  // Try loading puppeteer-core for serverless environment
  puppeteer = require('puppeteer-core');
  console.log('✅ Successfully loaded puppeteer-core');
  
  try {
    // Try loading chromium for serverless environment
    chromium = require('@sparticuz/chromium-min');
    console.log('✅ Successfully loaded @sparticuz/chromium-min');
  } catch (e) {
    console.log('⚠️ Could not load @sparticuz/chromium-min:', e.message);
    try {
      // Fallback to chrome-aws-lambda
      chromium = require('chrome-aws-lambda');
      console.log('✅ Successfully loaded chrome-aws-lambda as fallback');
    } catch (e2) {
      console.log('⚠️ Could not load chrome-aws-lambda:', e2.message);
      console.log('⚠️ Will try to use puppeteer-core with default paths');
    }
  }
} catch (e) {
  console.log('⚠️ Could not load puppeteer-core:', e.message);
  try {
    // Fallback to regular puppeteer (dev environment)
    puppeteer = require('puppeteer');
    console.log('✅ Successfully loaded puppeteer');
  } catch (e2) {
    console.log('🛑 Could not load puppeteer:', e2.message);
    console.log('🛑 No browser automation available');
  }
}

// Helper to log the execution steps with timestamps
const logStep = (step, details = null) => {
  const timestamp = new Date().toISOString();
  const message = `${timestamp} - ${step}`;
  if (details) {
    console.log(message, details);
  } else {
    console.log(message);
  }
  return timestamp; // Return timestamp for tracking duration
};

// Main API handler
module.exports = async (req, res) => {
  const requestStart = logStep('⭐ API Request Started');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    logStep('✅ Handled OPTIONS request');
    return res.status(200).end();
  }
  
  logStep('📝 Request Details', {
    method: req.method,
    path: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body
  });
  
  if (req.method !== 'POST') {
    logStep('⚠️ Invalid Method', { method: req.method });
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url, format } = req.body || {};
  logStep('📝 Extracted Parameters', { url, format });

  if (!url) {
    logStep('⚠️ Missing URL Parameter');
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // Validate URL - carefully handle validation to avoid errors
    try {
      new URL(url);
      logStep('✅ URL Validation Passed', { url });
    } catch (urlError) {
      logStep('⚠️ URL Validation Failed', { url, error: urlError.message });
      // If URL is invalid, return a friendly error instead of a 400
      return res.status(200).json({ 
        success: false, 
        error: 'Please provide a valid URL (include http:// or https://)',
        testCases: [
          "Could not analyze the provided URL",
          "Please ensure it includes http:// or https://"
        ]
      });
    }
    
    // Check if we have necessary browser components
    if (!puppeteer) {
      logStep('⚠️ No Browser Automation Available');
      return res.status(200).json({
        success: true,
        note: "Browser automation not available, using fallback test cases",
        testCases: [
          `Test Case 1: Verify page loads at ${url}`,
          `Test Case 2: Test navigation menu functionality`,
          `Test Case 3: Verify responsive design on mobile devices`,
          `Test Case 4: Test form submission with valid data`,
          `Test Case 5: Verify search functionality works correctly`,
          `Test Case 6: Test ${format || 'plain'} format output`
        ]
      });
    }
    
    // Create a timeout promise to prevent exceeding Vercel's function execution time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        logStep('⚠️ Browser Timeout Triggered');
        reject(new Error('Request timeout - URL analysis took too long'));
      }, 20000);
    });
    
    // Try to launch browser with timeout protection
    let browser;
    try {
      logStep('🔄 Attempting Browser Launch');
      
      const browserPromise = (async () => {
        if (chromium) {
          logStep('🔄 Launching with chromium provider');
          const browser = await puppeteer.launch({
            args: chromium.args || ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath || undefined,
            headless: true,
          });
          logStep('✅ Browser launched with chromium provider');
          return browser;
        } else {
          logStep('🔄 Launching with default settings');
          const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          logStep('✅ Browser launched with default settings');
          return browser;
        }
      })();
      
      browser = await Promise.race([browserPromise, timeoutPromise]);
      
      // Now proceed with page analysis
      logStep('🔄 Creating new page');
      const page = await browser.newPage();
      
      logStep('🔄 Navigating to URL', { url });
      const pageStart = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      logStep('✅ Page loaded', { timeMs: Date.now() - pageStart });
      
      // Initialize detailed page data object
      const pageData = {
        title: '',
        url: url,
        headers: [],
        buttons: [],
        links: [],
        inputs: [],
        forms: [],
        navLinks: [],
        images: [],
        selectDropdowns: []
      };
      
      // Extract basic page info
      logStep('🔄 Extracting page title');
      pageData.title = await page.title();
      logStep('✅ Page title', { title: pageData.title });
      
      // Extract headers (h1, h2, h3)
      try {
        pageData.headers = await page.$$eval('h1, h2, h3', headers => 
          headers.map(h => ({
            text: h.textContent.trim(),
            level: h.tagName.toLowerCase(),
            id: h.id || ''
          }))
        );
        logStep('✅ Headers extracted', { count: pageData.headers.length });
      } catch (e) { logStep('⚠️ Error extracting headers', { error: e.message }); }
      
      // Extract buttons with detailed info
      try {
        pageData.buttons = await page.$$eval('button, input[type="button"], input[type="submit"], .btn, [role="button"]', buttons => 
          buttons.map(button => ({
            text: button.textContent.trim() || button.value || button.innerText || 'Unnamed Button',
            type: button.type || 'button',
            id: button.id || '',
            name: button.name || '',
            class: button.className || '',
            disabled: button.disabled || false
          }))
        );
        logStep('✅ Buttons extracted', { count: pageData.buttons.length });
      } catch (e) { logStep('⚠️ Error extracting buttons', { error: e.message }); }
      
      // Extract links with detailed info
      try {
        pageData.links = await page.$$eval('a', links => 
          links.map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            id: link.id || '',
            class: link.className || '',
            target: link.target || '_self'
          }))
        );
        logStep('✅ Links extracted', { count: pageData.links.length });
      } catch (e) { logStep('⚠️ Error extracting links', { error: e.message }); }
      
      // Extract input fields with detailed info
      try {
        pageData.inputs = await page.$$eval('input, textarea', inputs => 
          inputs.map(input => ({
            type: input.type || 'text',
            id: input.id || '',
            name: input.name || '',
            placeholder: input.placeholder || '',
            required: input.required || false,
            value: input.value || '',
            label: input.labels && input.labels.length > 0 ? input.labels[0].textContent.trim() : ''
          }))
        );
        logStep('✅ Inputs extracted', { count: pageData.inputs.length });
      } catch (e) { logStep('⚠️ Error extracting inputs', { error: e.message }); }
      
      // Extract forms with detailed info
      try {
        pageData.forms = await page.$$eval('form', forms => 
          forms.map(form => ({
            id: form.id || '',
            name: form.name || '',
            action: form.action || '',
            method: form.method || 'get',
            fields: Array.from(form.elements).filter(el => el.tagName !== 'FIELDSET').length
          }))
        );
        logStep('✅ Forms extracted', { count: pageData.forms.length });
      } catch (e) { logStep('⚠️ Error extracting forms', { error: e.message }); }
      
      // Extract navigation links
      try {
        pageData.navLinks = await page.$$eval('nav a, header a, .navbar a, .nav a, .navigation a, .menu a', links => 
          links.map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            id: link.id || '',
            class: link.className || ''
          }))
        );
        logStep('✅ Navigation links extracted', { count: pageData.navLinks.length });
      } catch (e) { logStep('⚠️ Error extracting nav links', { error: e.message }); }
      
      // Extract images
      try {
        pageData.images = await page.$$eval('img', images => 
          images.map(img => ({
            alt: img.alt || '',
            src: img.src || '',
            width: img.width || 0,
            height: img.height || 0
          }))
        );
        logStep('✅ Images extracted', { count: pageData.images.length });
      } catch (e) { logStep('⚠️ Error extracting images', { error: e.message }); }
      
      // Extract select dropdowns
      try {
        pageData.selectDropdowns = await page.$$eval('select', selects => 
          selects.map(select => ({
            id: select.id || '',
            name: select.name || '',
            options: Array.from(select.options).map(option => option.textContent.trim())
          }))
        );
        logStep('✅ Select dropdowns extracted', { count: pageData.selectDropdowns.length });
      } catch (e) { logStep('⚠️ Error extracting select dropdowns', { error: e.message }); }
      
      // Close browser
      logStep('🔄 Closing browser');
      await browser.close();
      logStep('✅ Browser closed');
      
      // Generate comprehensive test cases based on the page data
      logStep('🔄 Generating detailed test cases');
      const testCases = generateDetailedTestCases(pageData);
      
      // Format output based on requested format
      let formattedOutput;
      
      if (format === 'katalon') {
        logStep('🔄 Formatting output as Katalon');
        formattedOutput = formatKatalonTestCases(pageData, testCases);
      } else if (format === 'maestro') {
        logStep('🔄 Formatting output as Maestro');
        formattedOutput = formatMaestroTestCases(pageData, testCases);
      } else {
        formattedOutput = {
          title: `Test Suite for ${url}`,
          pageData: pageData,
          testCases: testCases
        };
      }
      
      logStep('✅ Test case generation completed successfully');
      const requestEnd = new Date().toISOString();
      const duration = (new Date(requestEnd) - new Date(requestStart)) / 1000;
      
      logStep('🏁 Request completed', { 
        duration: `${duration.toFixed(2)}s`,
        testCaseCount: testCases.length
      });
      
      return res.status(200).json({ 
        success: true, 
        pageData: pageData,
        testCases: formattedOutput 
      });
      
    } catch (browserError) {
      logStep('🛑 Browser Error', { error: browserError.message, stack: browserError.stack });
      
      if (browser) {
        try {
          await browser.close();
          logStep('✅ Browser closed after error');
        } catch (e) {
          logStep('⚠️ Error closing browser', { error: e.message });
        }
      }
      
      // Return graceful fallback instead of error
      return res.status(200).json({
        success: true,
        note: "Browser automation had issues, using fallback test cases",
        error: browserError.message,
        testCases: generateFallbackTestCases(url, format)
      });
    }
  } catch (error) {
    logStep('🛑 Unexpected Error', { error: error.message, stack: error.stack });
    
    // Return a 200 OK with error information rather than a 500 error
    return res.status(200).json({ 
      success: true,
      note: "An error occurred but we still generated basic test cases",
      error: error.message,
      testCases: generateFallbackTestCases(url, format)
    });
  }
};

// Generate comprehensive test cases based on extracted page data
function generateDetailedTestCases(pageData) {
  const testCases = [];
  
  // Basic page validation
  testCases.push({
    id: 'TC001',
    title: `Verify page loads with correct title`,
    description: `Ensure the page loads correctly with title "${pageData.title}"`,
    steps: [
      { step: 1, action: `Navigate to ${pageData.url}`, expected: `Page loads successfully` },
      { step: 2, action: `Verify page title`, expected: `Page title is "${pageData.title}"` }
    ],
    priority: 'High'
  });
  
  // Header validation
  if (pageData.headers.length > 0) {
    testCases.push({
      id: 'TC002',
      title: `Verify page headers are displayed correctly`,
      description: `Ensure all main headers are displayed`,
      steps: pageData.headers.slice(0, 5).map((header, idx) => ({
        step: idx + 1,
        action: `Check ${header.level} header visibility`,
        expected: `"${header.text}" header is visible`
      })),
      priority: 'Medium'
    });
  }
  
  // Navigation tests
  if (pageData.navLinks.length > 0) {
    testCases.push({
      id: 'TC003',
      title: `Verify navigation menu functionality`,
      description: `Test the navigation menu links`,
      steps: pageData.navLinks.slice(0, 5).map((link, idx) => ({
        step: idx + 1,
        action: `Click on navigation link "${link.text}"`,
        expected: `Link navigates to ${link.href}`
      })),
      priority: 'High'
    });
  }
  
  // Button tests
  if (pageData.buttons.length > 0) {
    testCases.push({
      id: 'TC004',
      title: `Verify button functionality`,
      description: `Test all important buttons on the page`,
      steps: pageData.buttons.slice(0, 5).map((button, idx) => ({
        step: idx + 1,
        action: `Click on button "${button.text}"`,
        expected: `Button responds correctly`
      })),
      priority: 'High'
    });
  }
  
  // Form tests
  if (pageData.forms.length > 0) {
    const form = pageData.forms[0];
    const formInputs = pageData.inputs.slice(0, 5);
    
    const formSteps = [
      { step: 1, action: `Locate form ${form.id ? `with ID "${form.id}"` : ''}`, expected: `Form is visible` }
    ];
    
    formInputs.forEach((input, idx) => {
      formSteps.push({
        step: idx + 2,
        action: `Enter valid data in ${input.type} field ${input.id ? `"${input.id}"` : input.name ? `"${input.name}"` : ''} ${input.placeholder ? `(placeholder: "${input.placeholder}")` : ''}`,
        expected: `Data is accepted in the field`
      });
    });
    
    formSteps.push({
      step: formSteps.length + 1,
      action: `Submit the form`,
      expected: `Form submits successfully`
    });
    
    testCases.push({
      id: 'TC005',
      title: `Verify form submission`,
      description: `Test form submission with valid data`,
      steps: formSteps,
      priority: 'High'
    });
  }
  
  // Image tests
  if (pageData.images.length > 0) {
    testCases.push({
      id: 'TC006',
      title: `Verify images are displayed correctly`,
      description: `Ensure all important images are loaded`,
      steps: pageData.images.slice(0, 5).map((img, idx) => ({
        step: idx + 1,
        action: `Check image ${img.alt ? `with alt text "${img.alt}"` : `at position ${idx + 1}`}`,
        expected: `Image loads correctly`
      })),
      priority: 'Medium'
    });
  }
  
  // Dropdown tests
  if (pageData.selectDropdowns.length > 0) {
    const dropdown = pageData.selectDropdowns[0];
    const options = dropdown.options.slice(0, 3);
    
    const dropdownSteps = [
      { step: 1, action: `Locate dropdown ${dropdown.id ? `with ID "${dropdown.id}"` : dropdown.name ? `with name "${dropdown.name}"` : ''}`, expected: `Dropdown is visible` }
    ];
    
    options.forEach((option, idx) => {
      dropdownSteps.push({
        step: idx + 2,
        action: `Select option "${option}"`,
        expected: `Option is selected`
      });
    });
    
    testCases.push({
      id: 'TC007',
      title: `Verify dropdown functionality`,
      description: `Test dropdown selection options`,
      steps: dropdownSteps,
      priority: 'Medium'
    });
  }
  
  // Responsive design test
  testCases.push({
    id: 'TC008',
    title: `Verify responsive design`,
    description: `Test page layout on different screen sizes`,
    steps: [
      { step: 1, action: `View page on desktop (1920x1080)`, expected: `Page displays correctly` },
      { step: 2, action: `View page on tablet (768x1024)`, expected: `Page adjusts layout for tablet` },
      { step: 3, action: `View page on mobile (375x667)`, expected: `Page adjusts layout for mobile` }
    ],
    priority: 'Medium'
  });
  
  return testCases;
}

// Generate fallback test cases when browser automation fails
function generateFallbackTestCases(url, format) {
  return [
    {
      id: 'FB001',
      title: `Verify page loads correctly`,
      description: `Ensure the page loads with the correct content`,
      steps: [
        { step: 1, action: `Navigate to ${url}`, expected: `Page loads successfully` },
        { step: 2, action: `Verify page content`, expected: `Page displays with expected content` }
      ],
      priority: 'High'
    },
    {
      id: 'FB002',
      title: `Verify navigation menu functionality`,
      description: `Test the main navigation menu`,
      steps: [
        { step: 1, action: `Locate main navigation menu`, expected: `Navigation menu is visible` },
        { step: 2, action: `Click on each navigation link`, expected: `Each link navigates to correct page` }
      ],
      priority: 'High'
    },
    {
      id: 'FB003',
      title: `Verify responsive design`,
      description: `Test page layout on different screen sizes`,
      steps: [
        { step: 1, action: `View page on desktop`, expected: `Page displays correctly` },
        { step: 2, action: `View page on tablet`, expected: `Page adjusts layout for tablet` },
        { step: 3, action: `View page on mobile`, expected: `Page adjusts layout for mobile` }
      ],
      priority: 'Medium'
    },
    {
      id: 'FB004',
      title: `Verify form submission`,
      description: `Test form with valid and invalid data`,
      steps: [
        { step: 1, action: `Locate main form`, expected: `Form is visible` },
        { step: 2, action: `Submit form with valid data`, expected: `Form submits successfully` },
        { step: 3, action: `Submit form with invalid data`, expected: `Form shows validation errors` }
      ],
      priority: 'High'
    },
    {
      id: 'FB005',
      title: `Verify UI elements are functional`,
      description: `Test interactive elements like buttons and links`,
      steps: [
        { step: 1, action: `Interact with buttons`, expected: `Buttons respond correctly` },
        { step: 2, action: `Interact with links`, expected: `Links navigate to correct pages` }
      ],
      priority: 'Medium'
    }
  ];
}

// Format test cases for Katalon
function formatKatalonTestCases(pageData, testCases) {
  let katalon = `<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <name>Generated Test Suite for ${pageData.url}</name>
   <description>Automatically generated test suite</description>`;
  
  testCases.forEach((testCase, index) => {
    katalon += `
   <testCaseLink>
      <testCaseId>Test Cases/${testCase.id}</testCaseId>
      <guid>${index + 1}</guid>
      <variable>
         <name>testTitle</name>
         <value>${testCase.title}</value>
      </variable>`;
    
    // Add steps as variables
    testCase.steps.forEach((step, stepIdx) => {
      katalon += `
      <variable>
         <name>step${stepIdx + 1}_action</name>
         <value>${step.action}</value>
      </variable>
      <variable>
         <name>step${stepIdx + 1}_expected</name>
         <value>${step.expected}</value>
      </variable>`;
    });
    
    katalon += `
   </testCaseLink>`;
  });
  
  katalon += `
</TestSuiteEntity>`;
  
  return katalon;
}

// Format test cases for Maestro
function formatMaestroTestCases(pageData, testCases) {
  let maestro = `# Generated Maestro flow for ${pageData.url}
appId: ${new URL(pageData.url).hostname}
---
- launchUrl: ${pageData.url}
- assertVisible: ${pageData.title}
- waitForAnimationToEnd
- takeScreenshot
`;
  
  // Add navigation tests
  if (pageData.navLinks.length > 0) {
    maestro += `
# Testing navigation links
`;
    pageData.navLinks.slice(0, 3).forEach(link => {
      maestro += `
- tapOn: :text("${link.text}")
- waitForAnimationToEnd
- takeScreenshot
- back
`;
    });
  }
  
  // Add form tests if forms exist
  if (pageData.inputs.length > 0) {
    maestro += `
# Testing form inputs
`;
    pageData.inputs.slice(0, 3).forEach(input => {
      const selector = input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : `input[type="${input.type}"]`;
      maestro += `
- tapOn: ${selector}
- inputText: "test data"
`;
    });
    
    // If buttons, add a submit action
    if (pageData.buttons.length > 0) {
      const submitButton = pageData.buttons.find(b => 
        b.type === 'submit' || 
        b.text.toLowerCase().includes('submit') || 
        b.text.toLowerCase().includes('send')
      ) || pageData.buttons[0];
      
      maestro += `
- tapOn: :text("${submitButton.text}")
- waitForAnimationToEnd
`;
    }
  }
  
  return maestro;
}
