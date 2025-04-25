import { NextResponse } from "next/server"
import cheerio from "cheerio"

// Simple in-memory cache for session data
// Note: In production, use a database or Redis
const sessionCache = {}

export async function POST(request) {
  try {
    const body = await request.json()
    const url = body.url || "https://example.com"
    const mode = body.mode || "first"
    const sessionId = body.sessionId

    console.log(`Request received: mode=${mode}, url=${url}, sessionId=${sessionId}`)

    // For first-time requests
    if (mode === "first") {
      // Create a new session ID
      const newSessionId = "session-" + Math.random().toString(36).substring(2, 10)

      try {
        // Fetch the website content with proper headers and timeout
        console.log(`Fetching URL: ${url}`)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json({
            success: false,
            error: `Failed to fetch URL (Status ${response.status})`,
          })
        }

        const html = await response.text()

        // Parse the HTML
        const $ = cheerio.load(html, {
          decodeEntities: true,
          normalizeWhitespace: false,
        })

        // Extract page data
        const pageData = {
          url: url,
          title: $("title").text().trim() || url,
          extractedAt: new Date().toISOString(),
          buttons: [],
          forms: [],
          links: [],
          inputs: [],
        }

        // Extract buttons - limit to first 30 for performance
        $('button, input[type="submit"], input[type="button"], .btn, [role="button"]')
          .slice(0, 30)
          .each((i, el) => {
            try {
              const $el = $(el)
              pageData.buttons.push({
                text: $el.text().trim() || $el.val() || "Unnamed Button",
                type: $el.attr("type") || "button",
                id: $el.attr("id") || "",
                name: $el.attr("name") || "",
                class: $el.attr("class") || "",
                attributes: {
                  href: $el.attr("href") || "",
                  onclick: $el.attr("onclick") || "",
                  "data-target": $el.attr("data-target") || "",
                  "aria-label": $el.attr("aria-label") || "",
                },
              })
            } catch (e) {
              console.warn("Error processing button:", e)
            }
          })

        // Extract forms - limit to first 15
        $("form")
          .slice(0, 15)
          .each((i, el) => {
            try {
              const $form = $(el)
              const formInputs = []

              // Extract inputs within this form
              $form.find("input, textarea, select").each((j, input) => {
                const $input = $(input)
                formInputs.push({
                  type: $input.attr("type") || "text",
                  id: $input.attr("id") || "",
                  name: $input.attr("name") || "",
                  placeholder: $input.attr("placeholder") || "",
                  required: $input.attr("required") !== undefined,
                  label:
                    $input.attr("aria-label") ||
                    $form
                      .find(`label[for="${$input.attr("id")}"]`)
                      .text()
                      .trim() ||
                    "",
                })
              })

              pageData.forms.push({
                id: $form.attr("id") || "",
                action: $form.attr("action") || "",
                method: $form.attr("method") || "get",
                inputs: formInputs,
                submitButton: $form.find('button[type="submit"], input[type="submit"]').text().trim() || "Submit",
              })
            } catch (e) {
              console.warn("Error processing form:", e)
            }
          })

        // Extract links - limit to first 30
        $("a[href]")
          .slice(0, 30)
          .each((i, el) => {
            try {
              const $link = $(el)
              const href = $link.attr("href") || ""

              // Skip javascript: links and empty links
              if (href && !href.startsWith("javascript:") && href !== "#") {
                pageData.links.push({
                  text: $link.text().trim() || "Unnamed Link",
                  href: href,
                  id: $link.attr("id") || "",
                  class: $link.attr("class") || "",
                  target: $link.attr("target") || "",
                  title: $link.attr("title") || "",
                  ariaLabel: $link.attr("aria-label") || "",
                })
              }
            } catch (e) {
              console.warn("Error processing link:", e)
            }
          })

        // Extract inputs - limit to first 25
        $('input[type!="submit"][type!="button"], textarea, select')
          .slice(0, 25)
          .each((i, el) => {
            try {
              const $input = $(el)
              const labelText =
                $input.attr("aria-label") ||
                $(`label[for="${$input.attr("id")}"]`)
                  .text()
                  .trim() ||
                ""

              pageData.inputs.push({
                type: $input.attr("type") || "text",
                id: $input.attr("id") || "",
                name: $input.attr("name") || "",
                placeholder: $input.attr("placeholder") || "",
                required: $input.attr("required") !== undefined,
                label: labelText,
                autocomplete: $input.attr("autocomplete") || "",
                pattern: $input.attr("pattern") || "",
                min: $input.attr("min") || "",
                max: $input.attr("max") || "",
              })
            } catch (e) {
              console.warn("Error processing input:", e)
            }
          })

        console.log(
          `Found: ${pageData.buttons.length} buttons, ${pageData.forms.length} forms, ${pageData.links.length} links, ${pageData.inputs.length} inputs`,
        )

        // Create processed state
        const processed = {
          buttons: 0,
          forms: 0,
          links: 0,
          inputs: 0,
        }

        // Store in session cache
        sessionCache[newSessionId] = {
          pageData: pageData,
          processed: processed,
          testCases: [],
        }

        // Generate first test case (page verification) - plain text format
        const firstTest = {
          id: "TC_PAGE_1",
          title: `Verify ${pageData.title} Loads Correctly`,
          description: `Test that the page loads successfully with the correct title`,
          priority: "High",
          steps: [
            {
              step: 1,
              action: `Navigate to ${url}`,
              expected: "Page loads without errors",
            },
            {
              step: 2,
              action: "Verify page title",
              expected: `Title is "${pageData.title}"`,
            },
          ],
        }

        // Add to session
        sessionCache[newSessionId].testCases.push(firstTest)

        // Determine next element type
        const nextElementType =
          pageData.buttons.length > 0
            ? "button"
            : pageData.forms.length > 0
              ? "form"
              : pageData.links.length > 0
                ? "link"
                : pageData.inputs.length > 0
                  ? "input"
                  : null

        // Return first test response
        return NextResponse.json({
          success: true,
          sessionId: newSessionId,
          pageData: pageData,
          processed: processed,
          testCases: [firstTest],
          nextElementType: nextElementType,
          nextElementIndex: 0,
          hasMoreElements:
            pageData.buttons.length > 0 ||
            pageData.forms.length > 0 ||
            pageData.links.length > 0 ||
            pageData.inputs.length > 0,
          totalTestCases: 1,
        })
      } catch (error) {
        console.error("Error fetching or parsing website:", error)
        return NextResponse.json({
          success: false,
          error: `Error analyzing website: ${error.message || "Unknown error"}`,
        })
      }
    }
    // For subsequent requests (next mode)
    else if (mode === "next" && sessionId) {
      // Check if session exists
      if (!sessionCache[sessionId]) {
        return NextResponse.json({
          success: false,
          error: "Invalid or expired session ID",
        })
      }

      // Get session data
      const session = sessionCache[sessionId]
      const pageData = session.pageData
      const processed = session.processed

      // Generate 5 more test cases based on the current processing state
      const newTestCases = []

      // Determine what element types we still have to process
      const elementTypes = []

      if (processed.buttons < pageData.buttons.length) {
        elementTypes.push("button")
      }
      if (processed.forms < pageData.forms.length) {
        elementTypes.push("form")
      }
      if (processed.links < pageData.links.length) {
        elementTypes.push("link")
      }
      if (processed.inputs < pageData.inputs.length) {
        elementTypes.push("input")
      }

      // If no more elements, return empty
      if (elementTypes.length === 0) {
        return NextResponse.json({
          success: true,
          sessionId: sessionId,
          pageData: pageData,
          processed: processed,
          testCases: [],
          hasMoreElements: false,
          totalTestCases: session.testCases.length,
        })
      }

      // Generate up to 5 test cases
      for (let i = 0; i < 5; i++) {
        // Cycle through element types
        const typeIndex = i % elementTypes.length
        const elementType = elementTypes[typeIndex]

        // Get current index for this element type
        const elementIndex = processed[elementType + "s"]

        // If we've processed all elements of this type, skip
        if (elementIndex >= pageData[elementType + "s"].length) {
          continue
        }

        // Get the element
        const element = pageData[elementType + "s"][elementIndex]

        // Generate test case based on element type
        let testCase

        switch (elementType) {
          case "button":
            testCase = generateButtonTest(pageData.url, element, elementIndex)
            processed.buttons++
            break
          case "form":
            testCase = generateFormTest(pageData.url, element, elementIndex)
            processed.forms++
            break
          case "link":
            testCase = generateLinkTest(pageData.url, element, elementIndex)
            processed.links++
            break
          case "input":
            testCase = generateInputTest(pageData.url, element, elementIndex)
            processed.inputs++
            break
        }

        if (testCase) {
          newTestCases.push(testCase)
          session.testCases.push(testCase)
        }

        // If we've processed all elements, break
        if (
          processed.buttons >= pageData.buttons.length &&
          processed.forms >= pageData.forms.length &&
          processed.links >= pageData.links.length &&
          processed.inputs >= pageData.inputs.length
        ) {
          break
        }
      }

      // Determine if there are more elements to process
      const hasMoreElements =
        processed.buttons < pageData.buttons.length ||
        processed.forms < pageData.forms.length ||
        processed.links < pageData.links.length ||
        processed.inputs < pageData.inputs.length

      // Determine next element type and index
      let nextElementType = null
      let nextElementIndex = 0

      if (hasMoreElements) {
        if (processed.buttons < pageData.buttons.length) {
          nextElementType = "button"
          nextElementIndex = processed.buttons
        } else if (processed.forms < pageData.forms.length) {
          nextElementType = "form"
          nextElementIndex = processed.forms
        } else if (processed.links < pageData.links.length) {
          nextElementType = "link"
          nextElementIndex = processed.links
        } else if (processed.inputs < pageData.inputs.length) {
          nextElementType = "input"
          nextElementIndex = processed.inputs
        }
      }

      // Return response with new test cases
      return NextResponse.json({
        success: true,
        sessionId: sessionId,
        pageData: pageData,
        processed: processed,
        testCases: newTestCases,
        nextElementType: nextElementType,
        nextElementIndex: nextElementIndex,
        hasMoreElements: hasMoreElements,
        totalTestCases: session.testCases.length,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid request. Missing sessionId for "next" mode.',
      })
    }
  } catch (error) {
    console.error("Error in generate-incremental:", error)

    // Return error information
    return NextResponse.json({
      success: false,
      error: `Error: ${error.message || "Unknown error"}`,
    })
  }
}

// Helper functions to generate different types of test cases
function generateButtonTest(url, button, index) {
  const buttonText = button.text || button.id || "Unnamed Button"
  const buttonIdentifier = button.id
    ? `with ID "${button.id}"`
    : button.text
      ? `with text "${button.text}"`
      : `#${index + 1}`

  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${buttonText}`,
    description: `Verify that the ${buttonText} button works as expected`,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Locate the button ${buttonIdentifier}`,
        expected: "Button is visible on the page",
      },
      {
        step: 3,
        action: `Click the ${buttonText} button`,
        expected: "Button responds appropriately (submits form, navigates, or triggers action)",
      },
    ],
  }
}

function generateFormTest(url, form, index) {
  const formId = form.id || `Form ${index + 1}`
  const formIdentifier = form.id ? `with ID "${form.id}"` : `#${index + 1}`

  // Create steps for filling out form fields
  const formSteps = [
    {
      step: 1,
      action: `Navigate to ${url}`,
      expected: "Page loads successfully",
    },
    {
      step: 2,
      action: `Locate the form ${formIdentifier}`,
      expected: "Form is visible on the page",
    },
  ]

  // Add steps for each input field if available
  let stepCounter = 3
  if (form.inputs && form.inputs.length > 0) {
    form.inputs.forEach((input) => {
      if (input.type !== "submit" && input.type !== "button") {
        const inputName = input.label || input.placeholder || input.name || input.id || `field ${stepCounter - 2}`
        let testValue = "test value"

        // Determine appropriate test value based on input type
        if (input.type === "email") {
          testValue = "test@example.com"
        } else if (input.type === "password") {
          testValue = "Password123"
        } else if (input.type === "tel") {
          testValue = "555-123-4567"
        } else if (input.type === "number") {
          testValue = "42"
        } else if (input.type === "date") {
          testValue = "2023-01-01"
        }

        formSteps.push({
          step: stepCounter++,
          action: `Enter "${testValue}" in the ${inputName} field`,
          expected: "Input is accepted",
        })
      }
    })
  } else {
    // Generic step if no specific inputs are found
    formSteps.push({
      step: stepCounter++,
      action: "Fill all required fields with valid data",
      expected: "All fields accept input correctly",
    })
  }

  // Add submit step
  formSteps.push({
    step: stepCounter,
    action: `Submit the form by clicking the ${form.submitButton || "Submit"} button`,
    expected: "Form submits successfully",
  })

  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test Form: ${formId}`,
    description: `Verify that the form submits correctly`,
    priority: "High",
    steps: formSteps,
  }
}

function generateLinkTest(url, link, index) {
  const linkText = link.text || "Unnamed Link"
  const linkHref = link.href || "#"
  const linkIdentifier = link.id ? `with ID "${link.id}"` : link.text ? `with text "${link.text}"` : `#${index + 1}`

  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: `Verify that the ${linkText} link navigates correctly`,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Locate the link ${linkIdentifier}`,
        expected: "Link is visible on the page",
      },
      {
        step: 3,
        action: `Click the ${linkText} link`,
        expected: `User is navigated to ${linkHref}`,
      },
    ],
  }
}

function generateInputTest(url, input, index) {
  const inputType = input.type || "text"
  const inputName = input.label || input.name || input.id || `Input ${index + 1}`
  const inputIdentifier = input.id
    ? `with ID "${input.id}"`
    : input.name
      ? `with name "${input.name}"`
      : `#${index + 1}`

  // Determine test data based on input type
  let testData = "Sample text"
  let validationCheck = "Input accepts the entered data"

  switch (inputType) {
    case "email":
      testData = "test@example.com"
      validationCheck = "Email format is validated correctly"
      break
    case "password":
      testData = "Password123"
      validationCheck = "Password is masked and accepted"
      break
    case "number":
      testData = "42"
      validationCheck = "Numeric value is accepted"
      break
    case "date":
      testData = "2023-01-01"
      validationCheck = "Date is accepted in the correct format"
      break
    case "tel":
      testData = "555-123-4567"
      validationCheck = "Phone number is accepted"
      break
  }

  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test ${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input: ${inputName}`,
    description: `Verify that the ${inputName} input field works correctly`,
    priority: inputType === "password" || inputType === "email" ? "High" : "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Locate the ${inputName} field ${inputIdentifier}`,
        expected: "Input field is visible on the page",
      },
      {
        step: 3,
        action: `Enter "${testData}" into the field`,
        expected: "Input is interactive and responds to user action",
      },
      {
        step: 4,
        action: "Check validation behavior",
        expected: validationCheck,
      },
    ],
  }
}
