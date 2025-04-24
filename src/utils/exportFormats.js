/**
 * Export formats module for Test Case Generator
 * Provides functionality to export test cases in different formats
 */

/**
 * Convert test cases to Maestro Studio format
 * @param {Object} pageData - The page data
 * @param {Array} testCases - The test cases to convert
 * @returns {String} - YAML content for Maestro Studio
 */
function exportToMaestro(pageData, testCases) {
  const maestroAppId = pageData.url.replace(/https?:\/\//, "").replace(/\/$/, "")

  let yamlContent = `appId: ${maestroAppId}\n---\n`
  yamlContent += `- launchUrl: ${pageData.url}\n`
  yamlContent += `- assertVisible: "${pageData.title}"\n\n`

  testCases.forEach((testCase) => {
    // Add test case as a comment
    yamlContent += `# ${testCase.title}\n`

    // Convert steps to Maestro flow steps
    testCase.steps.forEach((step) => {
      // Skip the navigation step if it's not the first test case
      if (step.step === 1 && step.action.includes("Navigate to") && testCases.indexOf(testCase) > 0) {
        return
      }

      // Parse the action to create Maestro commands
      if (step.action.includes("Click")) {
        yamlContent += `- tapOn: "${extractElementName(step.action)}"\n`
      } else if (step.action.includes("Enter")) {
        const inputField = extractInputField(step.action)
        yamlContent += `- inputText: "test_value"\n`
        yamlContent += `  into: "${inputField}"\n`
      } else if (step.action.includes("Verify")) {
        yamlContent += `- assertVisible: "${extractExpectedText(step.expected)}"\n`
      }
    })

    yamlContent += "\n"
  })

  return yamlContent
}

/**
 * Convert test cases to Katalon Studio format
 * @param {Object} pageData - The page data
 * @param {Array} testCases - The test cases to convert
 * @returns {String} - XML content for Katalon Studio
 */
function exportToKatalon(pageData, testCases) {
  let katalon = ""

  testCases.forEach((testCase, index) => {
    const testCaseId = testCase.id.replace("TC_", "")
    const guid = generateGuid()

    katalon += `<?xml version="1.0" encoding="UTF-8"?>\n`
    katalon += `<TestCaseEntity>\n`
    katalon += `   <name>${testCase.id}</name>\n`
    katalon += `   <tag></tag>\n`
    katalon += `   <comment>${testCase.description}</comment>\n`
    katalon += `   <testCaseGuid>${guid}</testCaseGuid>\n`

    // Add variables if needed
    if (testCase.title.includes("Form") || testCase.title.includes("Input")) {
      katalon += `   <variable>\n`
      katalon += `      <name>testValue</name>\n`
      katalon += `      <value>sample_value</value>\n`
      katalon += `   </variable>\n`
    }

    katalon += `</TestCaseEntity>\n\n`

    // Generate script content as well
    katalon += generateKatalonScript(testCase, pageData.url)
  })

  return katalon
}

/**
 * Convert test cases to TestRail CSV format
 * @param {Object} pageData - The page data
 * @param {Array} testCases - The test cases to convert
 * @returns {String} - CSV content for TestRail
 */
function exportToTestRail(pageData, testCases) {
  let csv = "Title,Type,Priority,Preconditions,Steps,Expected Result,References\n"

  testCases.forEach((testCase) => {
    const title = escapeCsvField(testCase.title)
    const type = "Functional"
    const priority = escapeCsvField(testCase.priority)
    const preconditions = "None"

    // Collect steps and expected results
    let steps = ""
    let expectedResults = ""

    testCase.steps.forEach((step) => {
      steps += `${step.step}. ${step.action}\n`
      expectedResults += `${step.step}. ${step.expected}\n`
    })

    // Escape and format
    const stepsFormatted = escapeCsvField(steps.trim())
    const expectedFormatted = escapeCsvField(expectedResults.trim())
    const references = testCase.id

    csv += `${title},${type},${priority},${preconditions},${stepsFormatted},${expectedFormatted},${references}\n`
  })

  return csv
}

/**
 * Export to HTML format with styling
 * @param {Object} pageData - The page data
 * @param {Array} testCases - The test cases to convert
 * @returns {String} - HTML content
 */
function exportToHtml(pageData, testCases) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Cases for ${pageData.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1 { color: #333; }
    .test-case { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; border-radius: 5px; }
    .test-case h2 { margin-top: 0; color: #0066cc; }
    .test-case p { margin: 5px 0; }
    .priority-High { background-color: #ffe6e6; }
    .priority-Medium { background-color: #e6f2ff; }
    .priority-Low { background-color: #e6ffe6; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Test Cases for ${pageData.title}</h1>
  <p>URL: ${pageData.url}</p>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <div class="test-cases">`

  testCases.forEach((testCase) => {
    html += `
    <div class="test-case priority-${testCase.priority}">
      <h2>${testCase.title}</h2>
      <p><strong>ID:</strong> ${testCase.id}</p>
      <p><strong>Description:</strong> ${testCase.description}</p>
      <p><strong>Priority:</strong> ${testCase.priority}</p>
      
      <h3>Test Steps:</h3>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Action</th>
            <th>Expected Result</th>
          </tr>
        </thead>
        <tbody>`

    testCase.steps.forEach((step) => {
      html += `
          <tr>
            <td>${step.step}</td>
            <td>${step.action}</td>
            <td>${step.expected}</td>
          </tr>`
    })

    html += `
        </tbody>
      </table>
    </div>`
  })

  html += `
  </div>
</body>
</html>`

  return html
}

/**
 * Generate plain text export format
 * @param {Object} pageData - The page data
 * @param {Array} testCases - The test cases to convert
 * @returns {String} - Plain text content
 */
function exportToPlainText(pageData, testCases) {
  let text = `TEST CASES FOR ${pageData.title.toUpperCase()}\n`
  text += `URL: ${pageData.url}\n`
  text += `Generated: ${new Date().toLocaleString()}\n\n`

  testCases.forEach((testCase) => {
    text += `ID: ${testCase.id}\n`
    text += `TITLE: ${testCase.title}\n`
    text += `DESCRIPTION: ${testCase.description}\n`
    text += `PRIORITY: ${testCase.priority}\n\n`

    text += `TEST STEPS:\n`
    testCase.steps.forEach((step) => {
      text += `${step.step}. ${step.action}\n`
      text += `   Expected: ${step.expected}\n\n`
    })

    text += `----------------------------\n\n`
  })

  return text
}

// Helper functions

/**
 * Escape a string for CSV inclusion
 * @param {String} field - The field to escape
 * @returns {String} - Escaped field
 */
function escapeCsvField(field) {
  const escaped = field.replace(/"/g, '""')
  return `"${escaped}"`
}

/**
 * Generate a random GUID
 * @returns {String} - A GUID string
 */
function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Extract element name from action text
 * @param {String} action - The action text
 * @returns {String} - Element name
 */
function extractElementName(action) {
  const buttonMatch = action.match(
    /(Click|Find|Submit) (?:button|link) (?:with text "([^"]+)"|with ID "([^"]+)"|(\d+))/i,
  )
  if (buttonMatch) {
    return buttonMatch[2] || buttonMatch[3] || buttonMatch[4] || "element"
  }
  return "element"
}

/**
 * Extract input field name from action text
 * @param {String} action - The action text
 * @returns {String} - Input field name
 */
function extractInputField(action) {
  const inputMatch = action.match(/input field (?:with ID "([^"]+)"|with name "([^"]+)")/i)
  if (inputMatch) {
    return inputMatch[1] || inputMatch[2] || "input_field"
  }
  return "input_field"
}

/**
 * Extract expected text from expected result
 * @param {String} expected - The expected result text
 * @returns {String} - Expected visible text
 */
function extractExpectedText(expected) {
  const titleMatch = expected.match(/Title is "([^"]+)"/i)
  if (titleMatch) {
    return titleMatch[1]
  }
  return expected.replace(/"/g, "")
}

/**
 * Generate Katalon script content
 * @param {Object} testCase - The test case
 * @param {String} baseUrl - The base URL
 * @returns {String} - Script content
 */
function generateKatalonScript(testCase, baseUrl) {
  let script = `import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

// ${testCase.title}
// ${testCase.description}

`

  testCase.steps.forEach((step) => {
    if (step.action.includes("Navigate to")) {
      script += `// Step ${step.step}: ${step.action}\n`
      script += `WebUI.openBrowser('${baseUrl}')\n`
      script += `WebUI.maximizeWindow()\n\n`
    } else if (step.action.includes("Click")) {
      const element = extractElementName(step.action)
      script += `// Step ${step.step}: ${step.action}\n`
      script += `WebUI.click(findTestObject('Object Repository/${element}'))\n\n`
    } else if (step.action.includes("Enter")) {
      const field = extractInputField(step.action)
      script += `// Step ${step.step}: ${step.action}\n`
      script += `WebUI.setText(findTestObject('Object Repository/${field}'), 'test_value')\n\n`
    } else if (step.action.includes("Verify")) {
      const text = extractExpectedText(step.expected)
      script += `// Step ${step.step}: ${step.action}\n`
      script += `WebUI.verifyTextPresent('${text}', false)\n\n`
    }
  })

  script += `// Close browser\nWebUI.closeBrowser()\n`

  return script
}

// Export all the format functions
module.exports = {
  exportToMaestro,
  exportToKatalon,
  exportToTestRail,
  exportToHtml,
  exportToPlainText,
}
