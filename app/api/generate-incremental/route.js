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
        // Fetch the website content
        console.log(`Fetching URL: ${url}`)
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        })

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

        // Generate first test case (page verification)
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
  const buttonType = button.type || "button"
  const buttonIdentifier = button.id
    ? `with ID "${button.id}"`
    : button.text
      ? `with text "${button.text}"`
      : `#${index + 1}`

  // Analyze button attributes to determine the actual destination or action
  const expectedResult = determineButtonAction(button, url)

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
        expected: expectedResult,
      },
    ],
  }
}

// Function to analyze button attributes and determine the actual expected result
function determineButtonAction(button, baseUrl) {
  const buttonText = (button.text || "").toLowerCase()
  const buttonId = (button.id || "").toLowerCase()
  const buttonClass = (button.class || "").toLowerCase()
  const buttonType = button.type || "button"
  const attributes = button.attributes || {}

  // Check for navigation buttons by analyzing href, onclick, or data attributes
  if (attributes.href) {
    const href = attributes.href
    return determineNavigationDestination(href, buttonText, baseUrl)
  }

  // Check for modal/dialog triggers
  if (
    attributes["data-target"] ||
    attributes["data-toggle"] === "modal" ||
    buttonClass.includes("modal") ||
    buttonId.includes("modal") ||
    buttonClass.includes("dialog") ||
    buttonId.includes("dialog") ||
    buttonText.includes("open") ||
    buttonText.includes("show")
  ) {
    // Extract what's being shown from the button text
    const modalContent = extractContentFromButtonText(buttonText)
    return `${modalContent} dialog/modal is displayed`
  }

  // Check for form submission buttons
  if (buttonType === "submit" || buttonText.includes("submit") || buttonId.includes("submit")) {
    return "Form is submitted and appropriate response is displayed"
  }

  // View-specific buttons
  if (buttonText.includes("view")) {
    const viewTarget = buttonText.replace(/view\s+/i, "").trim()
    if (viewTarget) {
      return `User is navigated to the ${viewTarget} section/page`
    }
  }

  // Comparison Table specific case
  if (buttonText.includes("comparison") && buttonText.includes("table")) {
    return "Comparison table is displayed showing feature differences"
  }

  // Toggle buttons
  if (buttonText.includes("toggle") || buttonText.includes("expand") || buttonText.includes("collapse")) {
    const toggleTarget = extractContentFromButtonText(buttonText)
    return `${toggleTarget} section is expanded/collapsed`
  }

  // Filter buttons
  if (buttonText.includes("filter")) {
    return "Filter options are applied and results are updated accordingly"
  }

  // Search buttons
  if (buttonText.includes("search")) {
    return "Search is performed and results are displayed"
  }

  // Add/Create buttons
  if (buttonText.includes("add") || buttonText.includes("create") || buttonText.includes("new")) {
    const createTarget = extractContentFromButtonText(buttonText)
    return `Form or dialog to create new ${createTarget} is displayed`
  }

  // Delete/Remove buttons
  if (buttonText.includes("delete") || buttonText.includes("remove")) {
    const deleteTarget = extractContentFromButtonText(buttonText)
    return `Confirmation dialog appears before deleting ${deleteTarget}`
  }

  // Edit/Update buttons
  if (buttonText.includes("edit") || buttonText.includes("update")) {
    const editTarget = extractContentFromButtonText(buttonText)
    return `Edit form/dialog for ${editTarget} is displayed`
  }

  // Save buttons
  if (buttonText.includes("save")) {
    return "Data is saved and confirmation message is displayed"
  }

  // Cancel buttons
  if (buttonText.includes("cancel")) {
    return "Action is cancelled and user is returned to previous state"
  }

  // Download buttons
  if (buttonText.includes("download")) {
    const downloadTarget = extractContentFromButtonText(buttonText)
    return `Download begins for ${downloadTarget || "the file"}`
  }

  // Login/Logout buttons
  if (buttonText.includes("login") || buttonText.includes("sign in")) {
    return "User is logged in and redirected to dashboard/home page"
  }
  if (buttonText.includes("logout") || buttonText.includes("sign out")) {
    return "User is logged out and redirected to login page"
  }

  // Default fallback based on button text
  return `${buttonText.charAt(0).toUpperCase() + buttonText.slice(1)} action is performed successfully`
}

// Helper function to extract content from button text
function extractContentFromButtonText(buttonText) {
  // Remove common action verbs
  const content = buttonText
    .replace(/view\s+/i, "")
    .replace(/show\s+/i, "")
    .replace(/open\s+/i, "")
    .replace(/toggle\s+/i, "")
    .replace(/expand\s+/i, "")
    .replace(/collapse\s+/i, "")
    .replace(/add\s+/i, "")
    .replace(/create\s+/i, "")
    .replace(/new\s+/i, "")
    .replace(/edit\s+/i, "")
    .replace(/update\s+/i, "")
    .replace(/delete\s+/i, "")
    .replace(/remove\s+/i, "")
    .replace(/download\s+/i, "")
    .trim()

  return content || "content"
}

// Function to determine navigation destination from href
function determineNavigationDestination(href, linkText, baseUrl) {
  // Handle anchor links (same page navigation)
  if (href.startsWith("#")) {
    const anchorName = href.substring(1)
    return `Page scrolls to the "${anchorName}" section`
  }

  // Handle absolute URLs
  if (href.startsWith("http")) {
    // Check if it's an external link
    if (!href.includes(baseUrl.replace(/^https?:\/\//, ""))) {
      try {
        const domain = new URL(href).hostname
        return `User is navigated to external website: ${domain}`
      } catch (e) {
        return `User is navigated to external website: ${href}`
      }
    }
  }

  // Handle file downloads
  if (href.match(/\.(pdf|doc|docx|xls|xlsx|csv|zip|rar|tar|gz|mp3|mp4|avi|mov|jpeg|jpg|png|gif)$/i)) {
    const extension = href.split(".").pop().toLowerCase()
    return `File download begins for the ${extension.toUpperCase()} file`
  }

  // Handle email links
  if (href.startsWith("mailto:")) {
    return "Email client opens with the specified email address"
  }

  // Handle phone links
  if (href.startsWith("tel:")) {
    return "Phone dialer opens with the specified phone number"
  }

  // Extract page name from URL path
  try {
    let pageName = ""
    if (href.includes("/")) {
      const pathParts = href.split("/").filter(Boolean)
      if (pathParts.length > 0) {
        pageName = pathParts[pathParts.length - 1]
          .replace(/\.\w+$/, "") // Remove file extension
          .replace(/-|_/g, " ") // Replace dashes/underscores with spaces
          .trim()
      }
    }

    if (pageName) {
      // Capitalize words
      pageName = pageName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")

      return `User is navigated to the ${pageName} page`
    }
  } catch (e) {
    // If URL parsing fails, fall back to link text
  }

  // If we couldn't determine from href, use the link text
  return `User is navigated to the ${linkText} page/section`
}

function generateFormTest(url, form, index) {
  const formId = form.id || `Form ${index + 1}`
  const formMethod = form.method || "post"
  const formIdentifier = form.id ? `with ID "${form.id}"` : `#${index + 1}`

  // Try to determine form purpose from ID and inputs
  let formPurpose = "form"
  let expectedResult = "Form submits successfully"

  const formIdLower = formId.toLowerCase()
  const hasEmailInput =
    form.inputs &&
    form.inputs.some(
      (input) =>
        input.type === "email" ||
        input.name?.toLowerCase().includes("email") ||
        input.placeholder?.toLowerCase().includes("email"),
    )

  const hasPasswordInput =
    form.inputs &&
    form.inputs.some(
      (input) =>
        input.type === "password" ||
        input.name?.toLowerCase().includes("password") ||
        input.placeholder?.toLowerCase().includes("password"),
    )

  if (
    formIdLower.includes("contact") ||
    (form.inputs && form.inputs.some((i) => i.name?.toLowerCase().includes("message")))
  ) {
    formPurpose = "contact form"
    expectedResult = "Contact message is sent and confirmation is shown"
  } else if (
    formIdLower.includes("newsletter") ||
    formIdLower.includes("subscribe") ||
    (hasEmailInput && !hasPasswordInput && form.inputs?.length < 3)
  ) {
    formPurpose = "subscription form"
    expectedResult = "Subscription is confirmed"
  } else if (
    formIdLower.includes("login") ||
    formIdLower.includes("signin") ||
    (hasEmailInput && hasPasswordInput && !formIdLower.includes("register"))
  ) {
    formPurpose = "login form"
    expectedResult = "User is logged in successfully"
  } else if (formIdLower.includes("register") || formIdLower.includes("signup")) {
    formPurpose = "registration form"
    expectedResult = "User is registered successfully"
  } else if (formIdLower.includes("search") || form.inputs?.some((i) => i.name?.toLowerCase().includes("search"))) {
    formPurpose = "search form"
    expectedResult = "Search results are displayed"
  } else if (formIdLower.includes("comment")) {
    formPurpose = "comment form"
    expectedResult = "Comment is submitted successfully"
  } else if (formIdLower.includes("checkout") || formIdLower.includes("payment")) {
    formPurpose = "payment form"
    expectedResult = "Payment is processed successfully"
  }

  // Create steps for filling out form fields
  const formSteps = [
    {
      step: 1,
      action: `Navigate to ${url}`,
      expected: "Page loads successfully",
    },
    {
      step: 2,
      action: `Locate the ${formPurpose} ${formIdentifier}`,
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
          testValue = "SecurePassword123"
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
    action: `Submit the ${formPurpose} by clicking the ${form.submitButton || "Submit"} button`,
    expected: expectedResult,
  })

  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test ${formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}: ${formId}`,
    description: `Verify that the ${formPurpose} submits correctly`,
    priority: "High",
    steps: formSteps,
  }
}

function generateLinkTest(url, link, index) {
  const linkText = link.text || "Unnamed Link"
  const linkHref = link.href || "#"
  const linkIdentifier = link.id ? `with ID "${link.id}"` : link.text ? `with text "${link.text}"` : `#${index + 1}`

  // Generate expected result based on link href and text
  let expectedResult = "User is navigated to the correct page"
  let description = `Verify that the ${linkText} link navigates correctly`

  const textLower = linkText.toLowerCase()
  const hrefLower = linkHref.toLowerCase()

  // Check for anchor links (same page navigation)
  if (linkHref.startsWith("#")) {
    expectedResult = `Page scrolls to the corresponding section`
    description = `Verify that the ${linkText} link navigates to the correct section on the page`
  }
  // Check for external links
  else if (linkHref.startsWith("http") && !linkHref.includes(url.replace(/^https?:\/\//, ""))) {
    let domain = ""
    try {
      domain = new URL(linkHref).hostname
    } catch (e) {
      domain = linkHref
    }
    expectedResult = `User is navigated to external website: ${domain}`
    description = `Verify that the ${linkText} link navigates to the external website`
  }
  // Check for file downloads
  else if (linkHref.match(/\.(pdf|doc|docx|xls|xlsx|csv|zip|rar|tar|gz|mp3|mp4|avi|mov|jpeg|jpg|png|gif)$/i)) {
    const extension = linkHref.split(".").pop().toLowerCase()
    expectedResult = `File download begins for the ${extension.toUpperCase()} file`
    description = `Verify that the ${linkText} link downloads the file`
  }
  // Check for email links
  else if (linkHref.startsWith("mailto:")) {
    expectedResult = "Email client opens with the correct email address"
    description = `Verify that the ${linkText} link opens the email client`
  }
  // Check for phone links
  else if (linkHref.startsWith("tel:")) {
    expectedResult = "Phone dialer opens with the correct phone number"
    description = `Verify that the ${linkText} link opens the phone dialer`
  }
  // Common page types based on text
  else if (textLower.includes("home")) {
    expectedResult = "User is navigated to the Home page"
  } else if (textLower.includes("about")) {
    expectedResult = "User is navigated to the About page"
  } else if (textLower.includes("contact")) {
    expectedResult = "User is navigated to the Contact page"
  } else if (textLower.includes("login") || textLower.includes("sign in")) {
    expectedResult = "User is navigated to the Login page"
  } else if (textLower.includes("register") || textLower.includes("sign up")) {
    expectedResult = "User is navigated to the Registration page"
  } else if (textLower.includes("product")) {
    expectedResult = "User is navigated to the Products page or specific product"
  } else if (textLower.includes("service")) {
    expectedResult = "User is navigated to the Services page or specific service"
  } else if (textLower.includes("blog") || textLower.includes("news")) {
    expectedResult = "User is navigated to the Blog or News section"
  } else if (textLower.includes("faq")) {
    expectedResult = "User is navigated to the FAQ page"
  } else if (textLower.includes("help") || textLower.includes("support")) {
    expectedResult = "User is navigated to the Help or Support page"
  } else if (textLower.includes("privacy") || textLower.includes("policy")) {
    expectedResult = "User is navigated to the Privacy Policy page"
  } else if (textLower.includes("terms")) {
    expectedResult = "User is navigated to the Terms of Service page"
  }

  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: description,
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
        expected: expectedResult,
      },
    ],
  }
}

function generateInputTest(url, input, index) {
  const inputType = input.type || "text"
  const inputName = input.label || input.name || input.id || `Input ${index + 1}`
  const inputPlaceholder = input.placeholder || ""
  const inputIdentifier = input.id
    ? `with ID "${input.id}"`
    : input.name
      ? `with name "${input.name}"`
      : `#${index + 1}`

  // Try to determine input purpose from attributes
  let inputPurpose = inputType
  let testData = "Sample text"
  let validationCheck = "Input accepts the entered data"

  const inputNameLower = inputName.toLowerCase()
  const placeholderLower = inputPlaceholder.toLowerCase()

  // Field specific test data and validation
  switch (inputType) {
    case "email":
      testData = "test@example.com"
      validationCheck = "Email format is validated correctly"
      break

    case "password":
      testData = "SecurePassword123"
      validationCheck = "Password is masked and accepted"
      break

    case "checkbox":
      testData = "checked state"
      validationCheck = "Checkbox state is toggled successfully"
      break

    case "radio":
      testData = "selected state"
      validationCheck = "Radio button is selected successfully"
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
      validationCheck = "Phone number format is validated correctly"
      break

    case "url":
      testData = "https://example.com"
      validationCheck = "URL format is validated correctly"
      break

    case "file":
      testData = "test file"
      validationCheck = "File upload dialog appears and file can be selected"
      break

    default:
      // Try to determine field purpose from name/placeholder
      if (inputNameLower.includes("email") || placeholderLower.includes("email")) {
        inputPurpose = "email"
        testData = "test@example.com"
        validationCheck = "Email format is validated correctly"
      } else if (inputNameLower.includes("name") || placeholderLower.includes("name")) {
        inputPurpose = "name"
        testData = "John Doe"
        validationCheck = "Name is accepted correctly"
      } else if (inputNameLower.includes("phone") || placeholderLower.includes("phone")) {
        inputPurpose = "phone"
        testData = "555-123-4567"
        validationCheck = "Phone number is accepted correctly"
      } else if (inputNameLower.includes("address") || placeholderLower.includes("address")) {
        inputPurpose = "address"
        testData = "123 Main St, City, Country"
        validationCheck = "Address is accepted correctly"
      } else if (inputNameLower.includes("search") || placeholderLower.includes("search")) {
        inputPurpose = "search"
        testData = "search query"
        validationCheck = "Search query is accepted and results are displayed"
      } else if (inputNameLower.includes("password") || placeholderLower.includes("password")) {
        inputPurpose = "password"
        testData = "SecurePassword123"
        validationCheck = "Password is masked and accepted"
      } else if (inputNameLower.includes("message") || placeholderLower.includes("message")) {
        inputPurpose = "message"
        testData = "This is a test message"
        validationCheck = "Message is accepted correctly"
      } else if (inputNameLower.includes("subscribe")) {
        inputPurpose = "subscription"
        testData = "checked state"
        validationCheck = "Subscription preference is saved"
      }
  }

  let actionStep
  if (inputType === "checkbox" || inputType === "radio") {
    actionStep = `Click the ${inputName} ${inputType}`
  } else {
    actionStep = `Enter "${testData}" into the ${inputName} field`
  }

  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test ${inputPurpose.charAt(0).toUpperCase() + inputPurpose.slice(1)} Input: ${inputName}`,
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
        action: actionStep,
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
