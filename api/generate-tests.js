// api/generate-tests.js
const path = require('path');
const crypto = require('crypto');

// In-memory session cache for paginated results
const sessionCache = {};
const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

// Clean up expired cache entries
function cleanupExpiredSessions() {
  const now = Date.now();
  Object.keys(sessionCache).forEach(key => {
    if (sessionCache[key].timestamp + CACHE_EXPIRATION_MS < now) {
      delete sessionCache[key];
    }
  });
}

// Conditionally import puppeteer based on environment
let puppeteer;
let chromium;
let chromeAWSLambda;

// Check if we're in a Vercel serverless environment
const isDev = process.env.NODE_ENV === 'development';

console.log('========== API MODULE INITIALIZATION ==========');

if (isDev) {
  // Local development
  try {
    puppeteer = require('puppeteer');
    console.log('✅ Successfully loaded puppeteer for development');
  } catch (e) {
    console.log('⚠️ Could not load puppeteer for development:', e.message);
  }
} else {
  // Vercel serverless environment
  try {
    puppeteer = require('puppeteer-core');
    console.log('✅ Successfully loaded puppeteer-core');
    
    try {
      // Try loading @sparticuz/chromium-min
      chromium = require('@sparticuz/chromium-min');
      console.log('✅ Successfully loaded @sparticuz/chromium-min');
    } catch (e) {
      console.log('⚠️ Could not load @sparticuz/chromium-min:', e.message);
      
      try {
        // Fallback to chrome-aws-lambda
        chromeAWSLambda = require('chrome-aws-lambda');
        console.log('✅ Successfully loaded chrome-aws-lambda as fallback');
      } catch (e2) {
        console.log('⚠️ Could not load chrome-aws-lambda:', e2.message);
      }
    }
  } catch (e) {
    console.log('🛑 Failed to load any puppeteer variant:', e.message);
  }
}

// Helper for logging with timestamps
const logStep = (step, details = null) => {
  const timestamp = new Date().toISOString();
  const message = `${timestamp} - ${step}`;
  if (details) {
    console.log(message, details);
  } else {
    console.log(message);
  }
  return timestamp;
};

// Main API handler
module.exports = async (req, res) => {
  const requestStart = logStep('⭐ API Request Started');
  
  // Clean old sessions
  cleanupExpiredSessions();
  
  // Set appropriate CORS headers for your domain
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Extract params
  const { url, format, sessionId, page = 1, pageSize = 5 } = req.body || {};
  logStep('📝 Request Parameters', { url, format, sessionId, page, pageSize });

  // Check for continuing session
  if (sessionId && sessionCache[sessionId]) {
    logStep('✅ Found existing session', { sessionId });
    return continueSession(res, sessionId, page, pageSize, format);
  }
  
  // New session, validate URL
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // URL validation
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(200).json({ 
        success: false, 
        error: 'Please provide a valid URL (include http:// or https://)'
      });
    }
    
    // Check if we have puppeteer
    if (!puppeteer) {
      return res.status(200).json({
        success: false,
        error: 'Browser automation not available in this environment',
        note: 'Please contact support if this error persists'
      });
    }
    
    // Main page analysis with browser
    const testData = await analyzePageWithBrowser(url);
    
    // Generate and paginate test cases
    const allTestCases = generateTestCasesFromPageData(testData);
    const firstPageTestCases = allTestCases.slice(0, pageSize);
    
    // Create session for pagination
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    // Store in cache
    sessionCache[newSessionId] = {
      pageData: testData,
      allTestCases: allTestCases,
      timestamp: Date.now()
    };
    
    // Format output if needed
    let formattedOutput = firstPageTestCases;
    if (format === 'katalon') {
      formattedOutput = formatKatalonTestCases(testData, firstPageTestCases);
    } else if (format === 'maestro') {
      formattedOutput = formatMaestroTestCases(testData, firstPageTestCases);
    }
    
    logStep('✅ Request completed successfully', {
      testCasesGenerated: allTestCases.length, 
      testCasesReturned: firstPageTestCases.length
    });
    
    return res.status(200).json({
      success: true,
      pageData: testData,
      testCases: formattedOutput,
      sessionId: newSessionId,
      page: 1,
      pageSize: pageSize,
      totalTestCases: allTestCases.length,
      hasMore: allTestCases.length > pageSize,
      totalPages: Math.ceil(allTestCases.length / pageSize)
    });
    
  } catch (error) {
    logStep('🛑 Error in main handler', { error: error.message, stack: error.stack });
    
    return res.status(200).json({ 
      success: false,
      error: 'Error analyzing page: ' + error.message,
      note: 'Please try again or contact support if this error persists'
    });
  }
};

// Handle continuing a session
async function continueSession(res, sessionId, page, pageSize, format) {
  const sessionData = sessionCache[sessionId];
  
  // Update session timestamp
  sessionData.timestamp = Date.now();
  
  const { pageData, allTestCases } = sessionData;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, allTestCases.length);
  
  if (startIndex >= allTestCases.length) {
    return res.status(200).json({
      success: false,
      error: 'Page number exceeds available test cases',
      hasMore: false
    });
  }
  
  // Get requested page of test cases
  const paginatedTestCases = allTestCases.slice(startIndex, endIndex);
  
  // Format if needed
  let formattedOutput = paginatedTestCases;
  if (format === 'katalon') {
    formattedOutput = formatKatalonTestCases(pageData, paginatedTestCases);
  } else if (format === 'maestro') {
    formattedOutput = formatMaestroTestCases(pageData, paginatedTestCases);
  }
  
  return res.status(200).json({
    success: true,
    testCases: formattedOutput,
    sessionId: sessionId,
    page: page,
    pageSize: pageSize,
    totalTestCases: allTestCases.length,
    hasMore: endIndex < allTestCases.length,
    totalPages: Math.ceil(allTestCases.length / pageSize)
  });
}

// Browser analysis function - core of the real test case generation
async function analyzePageWithBrowser(url) {
  let browser;
  
  try {
    logStep('🔄 Launching browser');
    
    // Launch browser with appropriate options for environment
    if (isDev) {
      // Local development
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } else {
      // Serverless environment - need to handle different packages
      const browserLaunchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ];
      
      if (chromium) {
        // @sparticuz/chromium-min - executablePath is a function
        browser = await puppeteer.launch({
          args: [...(chromium.args || []), ...browserLaunchArgs],
          executablePath: await chromium.executablePath(), // FIXED: Call the function
          headless: chromium.headless,
          ignoreHTTPSErrors: true
        });
      } else if (chromeAWSLambda) {
        // chrome-aws-lambda - executablePath is a promise
        browser = await puppeteer.launch({
          args: [...(chromeAWSLambda.args || []), ...browserLaunchArgs],
          executablePath: await chromeAWSLambda.executablePath, // This is a promise
          headless: true,
          ignoreHTTPSErrors: true
        });
      } else {
        // Fallback to regular puppeteer launch (rare case)
        browser = await puppeteer.launch({
          args: browserLaunchArgs,
          headless: true,
          ignoreHTTPSErrors: true
        });
      }
    }
    
    logStep('✅ Browser launched');
    
    // Set conservative timeouts for serverless
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(25000);
    await page.setDefaultTimeout(10000);
    
    // Set viewport to desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate with explicit wait conditions
    logStep('🔄 Navigating to page', { url });
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 25000 
    });
    
    // Wait for content to be visible
    await page.waitForSelector('body', { timeout: 5000 });
    logStep('✅ Page loaded');
    
    // Initialize page data container
    const pageData = {
      url,
      title: '',
      headers: [],
      buttons: [],
      links: [],
      forms: [],
      inputs: [],
      images: [],
      navLinks: [],
      selectDropdowns: []
    };
    
    // Extract page title - safely
    try {
      pageData.title = await page.title();
      logStep('✅ Title extracted', { title: pageData.title });
    } catch (e) {
      logStep('⚠️ Error extracting title', { error: e.message });
      pageData.title = url; // Fallback to URL
    }
    
    // Extract all elements with try/catch for each
    await extractHeaders(page, pageData);
    await extractButtons(page, pageData);
    await extractLinks(page, pageData);
    await extractForms(page, pageData);
    await extractInputs(page, pageData);
    await extractImages(page, pageData);
    await extractNavigationLinks(page, pageData);
    await extractSelectDropdowns(page, pageData);
    
    // Additional unique page elements
    await extractUniquePageElements(page, pageData);
    
    // Close browser
    logStep('🔄 Closing browser');
    await browser.close();
    logStep('✅ Browser closed');
    
    return pageData;
    
  } catch (error) {
    logStep('🛑 Error during page analysis', { error: error.message, stack: error.stack });
    
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
        logStep('✅ Browser closed after error');
      } catch (e) {
        logStep('⚠️ Error closing browser', { error: e.message });
      }
    }
    
    throw new Error(`Browser analysis failed: ${error.message}`);
  }
}

// Helper functions for extracting different element types
async function extractHeaders(page, pageData) {
  try {
    pageData.headers = await page.$$eval('h1, h2, h3', headers => 
      headers.map(h => ({
        text: h.textContent.trim(),
        level: h.tagName.toLowerCase(),
        id: h.id || ''
      }))
    );
    logStep('✅ Headers extracted', { count: pageData.headers.length });
  } catch (e) {
    logStep('⚠️ Error extracting headers', { error: e.message });
    pageData.headers = []; // Ensure we have an empty array at minimum
  }
}

async function extractButtons(page, pageData) {
  try {
    pageData.buttons = await page.$$eval(
      'button, input[type="button"], input[type="submit"], .btn, [role="button"]', 
      buttons => buttons.map(button => ({
        text: button.textContent.trim() || button.value || button.innerText || 'Unnamed Button',
        type: button.type || 'button',
        id: button.id || '',
        name: button.name || '',
        class: button.className || ''
      }))
    );
    logStep('✅ Buttons extracted', { count: pageData.buttons.length });
  } catch (e) {
    logStep('⚠️ Error extracting buttons', { error: e.message });
    pageData.buttons = [];
  }
}

async function extractLinks(page, pageData) {
  try {
    pageData.links = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent.trim() || link.title || 'Unnamed Link',
        href: link.href,
        id: link.id || '',
        class: link.className || ''
      }))
    );
    logStep('✅ Links extracted', { count: pageData.links.length });
  } catch (e) {
    logStep('⚠️ Error extracting links', { error: e.message });
    pageData.links = [];
  }
}

async function extractForms(page, pageData) {
  try {
    pageData.forms = await page.$$eval('form', forms => 
      forms.map(form => ({
        id: form.id || '',
        name: form.name || '',
        action: form.action || '',
        method: form.method || 'get',
        classes: form.className || ''
      }))
    );
    logStep('✅ Forms extracted', { count: pageData.forms.length });
  } catch (e) {
    logStep('⚠️ Error extracting forms', { error: e.message });
    pageData.forms = [];
  }
}

async function extractInputs(page, pageData) {
  try {
    pageData.inputs = await page.$$eval('input, textarea', inputs => 
      inputs.map(input => ({
        type: input.type || 'text',
        id: input.id || '',
        name: input.name || '',
        placeholder: input.placeholder || '',
        required: input.required || false
      }))
    );
    logStep('✅ Inputs extracted', { count: pageData.inputs.length });
  } catch (e) {
    logStep('⚠️ Error extracting inputs', { error: e.message });
    pageData.inputs = [];
  }
}

async function extractImages(page, pageData) {
  try {
    pageData.images = await page.$$eval('img', images => 
      images.map(img => ({
        alt: img.alt || '',
        src: img.src || '',
        id: img.id || ''
      }))
    );
    logStep('✅ Images extracted', { count: pageData.images.length });
  } catch (e) {
    logStep('⚠️ Error extracting images', { error: e.message });
    pageData.images = [];
  }
}

async function extractNavigationLinks(page, pageData) {
  try {
    pageData.navLinks = await page.$$eval(
      'nav a, header a, .navbar a, .nav a, .navigation a, .menu a', 
      links => links.map(link => ({
        text: link.textContent.trim() || link.title || 'Unnamed Link',
        href: link.href,
        id: link.id || '',
        class: link.className || ''
      }))
    );
    logStep('✅ Navigation links extracted', { count: pageData.navLinks.length });
  } catch (e) {
    logStep('⚠️ Error extracting navigation links', { error: e.message });
    pageData.navLinks = [];
  }
}

async function extractSelectDropdowns(page, pageData) {
  try {
    pageData.selectDropdowns = await page.$$eval('select', selects => 
      selects.map(select => ({
        id: select.id || '',
        name: select.name || '',
        options: Array.from(select.options).map(option => option.textContent.trim())
      }))
    );
    logStep('✅ Select dropdowns extracted', { count: pageData.selectDropdowns.length });
  } catch (e) {
    logStep('⚠️ Error extracting select dropdowns', { error: e.message });
    pageData.selectDropdowns = [];
  }
}

async function extractUniquePageElements(page, pageData) {
  // Look for special page elements likely to be present
  try {
    // Check for search functionality
    const searchInputs = await page.$$('input[type="search"], input[name*="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
    if (searchInputs.length > 0) {
      pageData.hasSearchFunction = true;
      logStep('✅ Search function detected');
    }
    
    // Check for login/signup forms
    const loginElements = await page.$$('input[name*="password" i], input[type="password"], form[action*="login" i], form[action*="signin" i]');
    if (loginElements.length > 0) {
      pageData.hasLoginFunction = true;
      logStep('✅ Login functionality detected');
    }
    
    // Check for shopping cart elements
    const cartElements = await page.$$('[class*="cart" i], [id*="cart" i], a[href*="cart" i]');
    if (cartElements.length > 0) {
      pageData.hasCart = true;
      logStep('✅ Shopping cart detected');
    }
    
    // Check for product elements (e-commerce)
    const productElements = await page.$$('[class*="product" i], [id*="product" i], .product, .item, .products');
    if (productElements.length > 0) {
      pageData.hasProducts = true;
      logStep('✅ Product elements detected');
    }
    
    // Check for social media links
    const socialMediaLinks = await page.$$('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]');
    if (socialMediaLinks.length > 0) {
      pageData.hasSocialMediaLinks = true;
      logStep('✅ Social media links detected');
    }
    
    // Check for contact form
    const contactElements = await page.$$('form[action*="contact" i], [id*="contact-form" i], [class*="contact-form" i]');
    if (contactElements.length > 0) {
      pageData.hasContactForm = true;
      logStep('✅ Contact form detected');
    }
    
  } catch (e) {
    logStep('⚠️ Error extracting unique page elements', { error: e.message });
  }
}

// Generate comprehensive test cases from the page data
function generateTestCasesFromPageData(pageData) {
  const testCases = [];
  let testId = 1;
  
  // Helper function to generate test IDs
  const generateTestId = () => `TC${String(testId++).padStart(3, '0')}`;
  
  // Basic page load test - always present
  testCases.push({
    id: generateTestId(),
    title: `Verify page loads with correct title`,
    description: `Ensure the page loads correctly with title "${pageData.title}"`,
    steps: [
      { step: 1, action: `Navigate to ${pageData.url}`, expected: `Page loads successfully` },
      { step: 2, action: `Verify page title`, expected: `Page title is "${pageData.title}"` }
    ],
    priority: 'High'
  });
  
  // Add more test cases based on elements found
  // Header tests
  if (pageData.headers && pageData.headers.length > 0) {
    const mainHeaders = pageData.headers.filter(h => h.level === 'h1' || h.level === 'h2').slice(0, 5);
    
    if (mainHeaders.length > 0) {
      testCases.push({
        id: generateTestId(),
        title: `Verify main headers are displayed correctly`,
        description: `Ensure all main heading elements are visible and properly formatted`,
        steps: [
          { step: 1, action: `Navigate to ${pageData.url}`, expected: `Page loads successfully` },
          ...mainHeaders.map((header, idx) => ({
            step: idx + 2,
            action: `Check ${header.level.toUpperCase()} heading "${header.text}"`,
            expected: `Heading is visible and properly formatted`
          }))
        ],
        priority: 'High'
      });
    }
  }
  
  // Add more test cases as needed based on the page elements
  
  // Responsive design test - always include
  testCases.push({
    id: generateTestId(),
    title: `Verify responsive design`,
    description: `Test page layout on different screen sizes`,
    steps: [
      { step: 1, action: `View page on desktop (1920x1080)`, expected: `Page displays correctly` },
      { step: 2, action: `View page on tablet (768x1024)`, expected: `Page adjusts layout for tablet` },
      { step: 3, action: `View page on mobile (375x667)`, expected: `Page adjusts layout for mobile` }
    ],
    priority: 'High'
  });
  
  return testCases;
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
  
  // Add interactions for up to 5 test cases
  for (let i = 0; i < Math.min(5, testCases.length); i++) {
    const testCase = testCases[i];
    maestro += `
# ${testCase.title}
`;
    
    for (const step of testCase.steps.slice(1)) { // Skip first step (navigation)
      if (step.action.includes('Click') || step.action.includes('tap')) {
        maestro += `- tapOn: anything
- back\n`;
      } else if (step.action.includes('Enter') || step.action.includes('input')) {
        maestro += `- tapOn: anything
- inputText: "test data"
- back\n`;
      } else if (step.action.includes('Select')) {
        maestro += `- tapOn: anything
- back\n`;
      }
    }
  }
  
  return maestro;
}
