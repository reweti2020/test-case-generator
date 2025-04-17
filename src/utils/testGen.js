const puppeteer = require('puppeteer');

async function generateTestCases(url, format = 'plain') {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  console.log(`Navigating to ${url}...`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
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
    await browser.close();
    return { success: false, error: error.message };
  }
}

function formatKatalonTestCases(url, title, buttons, inputs, links, forms) {
  // Katalon format example (simplified)
  let katalon = `<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <name>Generated Test Suite for ${url}</name>
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
         <name>buttonText</name>
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

// For direct Node.js usage
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log('Please provide a URL: node testGen.js https://example.com');
    process.exit(1);
  }
  
  const format = process.argv[3] || 'plain';
  
  generateTestCases(url, format)
    .then(result => {
      if (result.success) {
        if (Array.isArray(result.testCases)) {
          console.log('Generated Test Cases:');
          result.testCases.forEach(tc => console.log(tc));
        } else {
          console.log(result.testCases);
        }
      } else {
        console.error('Error:', result.error);
      }
    });
}

// Export for use in API routes
module.exports = { generateTestCases };
