import { NextResponse } from "next/server"

// Reference to the in-memory page cache from generate-incremental.js
// In production, use a database or cache service like Redis
const sessionCache = {}

export async function POST(request) {
  try {
    const body = await request.json()
    const { sessionId, format } = body || {}

    // Log the request parameters
    console.log(`Export request params: ${JSON.stringify({ sessionId, format })}`)

    if (!sessionId || !sessionCache[sessionId]) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired session ID",
      })
    }

    const sessionData = sessionCache[sessionId]
    let exportData = null
    let filename = "test-cases"
    let contentType = "application/json"

    switch (format) {
      case "maestro":
        exportData = exportToMaestro(sessionData.pageData, sessionData.testCases)
        filename = "maestro-flow.yaml"
        contentType = "application/yaml"
        break

      case "katalon":
        exportData = exportToKatalon(sessionData.pageData, sessionData.testCases)
        filename = "katalon-tests.tc"
        contentType = "application/octet-stream"
        break

      case "csv":
        exportData = exportToCsv(sessionData.pageData, sessionData.testCases)
        filename = "test-cases.csv"
        contentType = "text/csv"
        break

      case "html":
        exportData = exportToHtml(sessionData.pageData, sessionData.testCases)
        filename = "test-cases.html"
        contentType = "text/html"
        break

      case "txt":
        exportData = exportToPlainText(sessionData.pageData, sessionData.testCases)
        filename = "test-cases.txt"
        contentType = "text/plain"
        break

      case "json":
      default:
        exportData = JSON.stringify(sessionData.testCases, null, 2)
        filename = "test-cases.json"
        contentType = "application/json"
    }

    return NextResponse.json({
      success: true,
      exportData,
      filename,
      contentType,
    })
  } catch (error) {
    console.error("Error in export-test:", error)
    return NextResponse.json({
      success: false,
      error: `Export error: ${error.message || "Unknown error"}`,
    })
  }
}

/**
 * Convert test cases to Maestro Studio format
 */
function exportToMaestro(pageData, testCases) {
  const maestroAppId = pageData.url.replace(/https?:\/\//, "").replace(/\/$/, "")

  let yamlContent = `appId: ${maestroAppId}\n---\n`
  yamlContent += `- launchUrl: ${pageData.url}\n`
  yamlContent += `- assertVisible: "${pageData.title}"\n\n`

  testCases.forEach((testCase) => {
    yamlContent += `# ${testCase.title}\n`

    testCase.steps.forEach((step) => {
      if (step.step === 1 && step.action.includes("Navigate to") && testCases.indexOf(testCase) > 0) {
        return
      }

      if (step.action.includes("Click")) {
        yamlContent += `- tapOn: "${extractElementName(step.action)}"\n`
      } else if (step.action.includes("Enter")) {
        const inputField = extractInputField(step.action)
        const inputValue = extractInputValue(step.action)
        yamlContent += `- inputText: "${inputValue}"\n`
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

    if (testCase.title.includes("Form") || testCase.title.includes("Input")) {
      katalon += `   <variable>\n`
      katalon += `      <name>testValue</name>\n`
      katalon += `      <value>sample_value</value>\n`
      katalon += `   </variable>\n`
    }

    katalon += `</TestCaseEntity>\n\n`
  })

  return katalon
}

/**
 * Convert test cases to CSV format
 */
function exportToCsv(pageData, testCases) {
  let csv = "Title,Type,Priority,Preconditions,Steps,Expected Result,References\n"

  testCases.forEach((testCase) => {
    const title = escapeCsvField(testCase.title)
    const type = "Functional"
    const priority = escapeCsvField(testCase.priority)
    const preconditions = "None"

    let steps = ""
    let expectedResults = ""

    testCase.steps.forEach((step) => {
      steps += `${step.step}. ${step.action}\n`
      expectedResults += `${step.step}. ${step.expected}\n`
    })

    const stepsFormatted = escapeCsvField(steps.trim())
    const expectedFormatted = escapeCsvField(expectedResults.trim())
    const references = testCase.id

    csv += `${title},${type},${priority},${preconditions},${stepsFormatted},${expectedFormatted},${references}\n`
  })

  return csv
}

/**
 * Export to HTML format with styling
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
function escapeCsvField(field) {
  const escaped = field.replace(/"/g, '""')
  return `"${escaped}"`
}

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function extractElementName(action) {
  const buttonMatch = action.match(
    /(Click|Find|Submit) (?:button|link) (?:with text "([^"]+)"|with ID "([^"]+)"|(\d+))/i,
  )
  if (buttonMatch) {
    return buttonMatch[2] || buttonMatch[3] || buttonMatch[4] || "element"
  }
  return "element"
}

function extractInputField(action) {
  const inputMatch = action.match(/(?:the|into) ([^"]+) field|field ([^"]+)/i)
  if (inputMatch) {
    return inputMatch[1] || inputMatch[2] || "input_field"
  }
  return "input_field"
}

function extractInputValue(action) {
  const valueMatch = action.match(/Enter "([^"]+)"/i)
  if (valueMatch) {
    return valueMatch[1] || "test_value"
  }
  return "test_value"
}

function extractExpectedText(expected) {
  const titleMatch = expected.match(/Title is "([^"]+)"/i)
  if (titleMatch) {
    return titleMatch[1]
  }
  return expected.replace(/"/g, "")
}
