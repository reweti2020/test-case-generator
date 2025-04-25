import { NextResponse } from "next/server"

// Reference to the in-memory cache from generate-incremental.js
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

    // Support only JSON, CSV and Maestro formats
    switch (format) {
      case "maestro":
        exportData = exportToMaestro(sessionData.pageData, sessionData.testCases)
        filename = "maestro-flow.yaml"
        contentType = "application/yaml"
        break

      case "csv":
        exportData = exportToCsv(sessionData.pageData, sessionData.testCases)
        filename = "test-cases.csv"
        contentType = "text/csv"
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

// Helper functions
function escapeCsvField(field) {
  if (!field) return '""'
  const escaped = field.toString().replace(/"/g, '""')
  return `"${escaped}"`
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
