// Conditionally import puppeteer based on environment
let puppeteer;
let chromium;
let chromeAWSLambda;

// Check if we're in a Vercel serverless environment
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Local development
  puppeteer = require('puppeteer');
} else {
  // Vercel serverless environment
  puppeteer = require('puppeteer-core');
  try {
    chromium = require('@sparticuz/chromium-min');
  } catch (e) {
    console.log('Could not load @sparticuz/chromium-min:', e.message);
  }
  try {
    chromeAWSLambda = require('chrome-aws-lambda');
  } catch (e) {
    console.log('Could not load chrome-aws-lambda:', e.message);
  }
}

async function generateTestCases(url, format = 'plain') {
  let browser;
  
  try {
    if (isDev) {
      // Local development
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } else {
      // Vercel serverless environment
      try {
        // First try chrome-aws-lambda if available
        if (chromeAWSLambda) {
          browser = await puppeteer.launch({
            args: chromeAWSLambda.args,
            executablePath: await chromeAWSLambda.executablePath,
            headless: true,
          });
        } else if (chromium) {
          // Fallback to @sparticuz/chromium-min
          browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
          });
        } else {
          throw new Error('No compatible browser automation library available');
        }
      } catch (error) {
        console.log('Browser launch error:', error);
        throw error;
      }
    }
    
    const page = await browser.newPage();
    console.log(`Navigating to ${url}...`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Extract page title
    const title = await page.title();
    
    // Find all buttons
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(button => ({
        text: button.textContent.trim(),
        id: button.id,
        type: button.type
      }))
    );
    
    // Find all links
    const links = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href
      }))
    );
    
    // Find all input fields
    const inputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        id: input.id,
        name: input.name,
        placeholder: input.placeholder
      }))
    );
    
    // Find all forms
    const forms = await page.$$eval('form', forms => 
      forms.map(form => ({
        id: form.id,
        action: form.action,
        method: form.method
      }))
    );
    
    // Generate test cases
    const testCases = [
      `Test Case 1: Verify page loads at ${url} with correct title "${title}"`,
      `Test Case 2: Verify page contains ${buttons.length} buttons`,
      `Test Case 3: Verify page contains ${inputs.length} input fields`,
      `Test Case 4: Verify page contains ${links.length} links`,
      `Test Case 5: Verify page contains ${forms.length} forms`
    ];
    
    // Generate detailed test cases for each element type
    buttons.forEach((button, index) => {
      testCases.push(`Test Case ${6 + index}: Verify button "${button.text}" is clickable`);
    });
    
    inputs.forEach((input, index) => {
      testCases.push(`Test Case ${6 + buttons.length + index}: Verify input field ${input.id || input.name || input.placeholder || input.type} accepts user input`);
    });
    
    // Format output based on requested format
    let formattedOutput;
    
    if (format === 'katalon') {
      formattedOutput = formatKatalonTestCases(url, title, buttons, inputs, links, forms);
    } else if (format === 'maestro') {
      formattedOutput = formatMaestroTestCases(url, title, buttons, inputs, links, forms);
    } else {
      formattedOutput = testCases;
    }
    
    await browser.close();
    return { success: true, testCases: formattedOutput };
  } catch (error) {
    console.error('Error during page processing:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
    return { success: false, error: error.message };
  }
}

function formatKatalonTestCases(url, title, buttons, inputs, links, forms) {
  // Katalon format example (simplified)
  let katalon = `<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <n>Generated Test Suite for ${url}</n>
   <testCaseLink>
      <testCaseId>Test Cases/VerifyPageLoads</testCaseId>
      <guid>1</guid>
   </testCaseLink>`;
  
  buttons.forEach((button, index) => {
    katalon += `
   <testCaseLink>
      <testCaseId>Test Cases/VerifyButton_${index}</testCaseId>
      <guid>${index + 2}</guid>
      <variable>
         <n>buttonText</n>
         <value>${button.text}</value>
      </variable>
   </testCaseLink>`;
  });
  
  katalon += `
</TestSuiteEntity>`;
  
  return katalon;
}

function formatMaestroTestCases(url, title, buttons, inputs, links, forms) {
  // Maestro flow format
  let maestro = `# Generated Maestro flow for ${url}
appId: ${new URL(url).hostname}
---
- launchUrl: ${url}
- assertVisible: ${title}`;
  
  buttons.forEach(button => {
    const selector = button.id ? `#${button.id}` : `:text("${button.text}")`;
    maestro += `
- tapOn: ${selector}
- back`;
  });
  
  inputs.forEach(input => {
    const selector = input.id ? `#${input.id}` : `input[type="${input.type}"]`;
    maestro += `
- tapOn: ${selector}
- inputText: "test input"`;
  });
  
  return maestro;
}

// Export for use in API routes
module.exports = { generateTestCases };
