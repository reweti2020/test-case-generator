// testGen.js - Optimized for Vercel serverless environment
const axios = require("axios")
const cheerio = require("cheerio")

// In-memory storage for page analysis results
const pageCache = {}

/**
 * Main function for test generation
 * @param {string} url - Website URL to analyze
 * @param {object} options - Generation options
 * @returns {object} - Generated test cases and session info
 */
async function generateTestCases(url, options = {}) {
  const {
    mode = "first",
    sessionId = null,
    elementType = "button",
    elementIndex = 0,
    userPlan = "free",
    batchSize = 5,
  } = options

  // For subsequent calls, use cached page data if available
  if (mode === "next" && sessionId && pageCache[sessionId]) {
    try {
      return generateNextTest(sessionId, elementType, elementIndex, userPlan, batchSize)
    } catch (error) {
      console.error("Error generating next test:", error)
      return {
        success: false,
        error: `Error generating next test: ${error.message}`,
      }
    }
  }

  // First-time call logic (analyzing website)
  try {
    console.log(`Fetching URL: ${url}`)

    // Validate URL format first
    if (!url.match(/^https?:\/\//i)) {
      url = "https://" + url
      console.log(`Added protocol to URL: ${url}`)
    }

    // Fetch the HTML content with a timeout and better error handling
    const response = await axios
      .get(url, {
        timeout: 15000, // Increased timeout for larger sites
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept all statuses under 500
      })
      .catch((error) => {
        console.error("Error fetching URL:", error.message)
        // Return a structured error response
        if (error.code === "ECONNABORTED") {
          throw new Error("Request timed out. The website may be too large or slow to respond.")
        } else if (error.response && error.response.status) {
          throw new Error(`Server responded with status code ${error.response.status}`)
        } else {
          throw new Error(`Failed to fetch URL: ${error.message}`)
        }
      })

    // Check response status
    if (!response || response.status !== 200) {
      return {
        success: false,
        error: `Failed to fetch URL (Status ${response?.status || "unknown"})`,
      }
    }

    console.log("URL fetched successfully, parsing HTML...")

    // Safety check for response data
    if (!response.data) {
      return {
        success: false,
        error: "Empty response from server",
      }
    }

    // Load HTML into cheerio with decodeEntities option to handle character encoding issues
    let $ = null
    try {
      $ = cheerio.load(response.data, {
        decodeEntities: true,
        normalizeWhitespace: false,
      })
    } catch (error) {
      console.error("Error parsing HTML:", error)
      return {
        success: false,
        error: `Error parsing HTML: ${error.message}`,
      }
    }

    // Extract basic page data
    const pageData = {
      url,
      title: $("title").text().trim() || "Unknown Title",
      extractedAt: new Date().toISOString(),
    }

    // Extract elements more efficiently - with error handling for each section
    // Extract buttons - limit to first 200 for performance
    pageData.buttons = []
    try {
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
              href: $el.attr("href") || "",
            })
          } catch (e) {
            console.warn("Error processing button:", e)
            // Continue despite error with this element
          }
        })
    } catch (error) {
      console.warn("Error extracting buttons:", error)
      // Continue with empty buttons array
    }

    // Extract forms - limit to first 100
    pageData.forms = []
    try {
      $("form")
        .slice(0, 15)
        .each((i, el) => {
          try {
            const $form = $(el)
            pageData.forms.push({
              id: $form.attr("id") || "",
              action: $form.attr("action") || "",
              method: $form.attr("method") || "",
            })
          } catch (e) {
            console.warn("Error processing form:", e)
          }
        })
    } catch (error) {
      console.warn("Error extracting forms:", error)
    }

    // Extract links - limit to first 150
    pageData.links = []
    try {
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
              })
            }
          } catch (e) {
            console.warn("Error processing link:", e)
          }
        })
    } catch (error) {
      console.warn("Error extracting links:", error)
    }

    // Extract inputs - limit to first 150
    pageData.inputs = []
    try {
      $('input[type!="submit"][type!="button"], textarea, select')
        .slice(0, 25)
        .each((i, el) => {
          try {
            const $input = $(el)
            pageData.inputs.push({
              type: $input.attr("type") || "text",
              id: $input.attr("id") || "",
              name: $input.attr("name") || "",
              placeholder: $input.attr("placeholder") || "",
            })
          } catch (e) {
            console.warn("Error processing input:", e)
          }
        })
    } catch (error) {
      console.warn("Error extracting inputs:", error)
    }

    console.log("HTML parsed successfully, creating session...")
    console.log(
      `Found: ${pageData.buttons.length} buttons, ${pageData.forms.length} forms, ${pageData.links.length} links, ${pageData.inputs.length} inputs`,
    )

    // Generate a session ID and store page data
    const newSessionId = Math.random().toString(36).substring(2, 15)
    pageCache[newSessionId] = {
      pageData,
      processed: {
        buttons: 0,
        forms: 0,
        links: 0,
        inputs: 0,
      },
      hasMore: {
        buttons: pageData.buttons.length > 0,
        forms: pageData.forms.length > 0,
        links: pageData.links.length > 0,
        inputs: pageData.inputs.length > 0,
      },
      testCases: [],
    }

    // Generate first test (always page verification)
    const firstTest = {
      id: "TC_PAGE_1",
      title: `Verify ${pageData.title || "Page"} Loads Correctly`,
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
          expected: `Title is "${pageData.title || "Expected Title"}"`,
        },
      ],
    }

    // Add the test case to the cache
    pageCache[newSessionId].testCases.push(firstTest)

    // Determine next element to test
    const nextElementType =
      pageData.buttons.length > 0
        ? "button"
        : pageData.forms.length > 0
          ? "form"
          : pageData.inputs.length > 0
            ? "input"
            : pageData.links.length > 0
              ? "link"
              : null

    // For Pro users (or during testing), we'll ignore limits
    const freeLimit = 9999 // Set very high for testing
    const hasMoreElements =
      (userPlan !== "free" || pageCache[newSessionId].testCases.length < freeLimit) &&
      (pageData.buttons.length > 0 ||
        pageData.forms.length > 0 ||
        pageData.links.length > 0 ||
        pageData.inputs.length > 0)

    console.log("First test case generated successfully")

    // Return first test with session info
    return {
      success: true,
      sessionId: newSessionId,
      pageData: pageData,
      testCases: [firstTest],
      nextElementType,
      nextElementIndex: 0,
      hasMoreElements,
      processed: pageCache[newSessionId].processed,
      totalTestCases: pageCache[newSessionId].testCases.length,
      upgradeRequired: false, // Set to false during testing
    }
  } catch (error) {
    console.error("Error in test generation:", error)
    return {
      success: false,
      error: `Test generation error: ${error.message || "Unknown error"}`,
    }
  }
}

/**
 * Function to generate the next batch of tests from cached page data
 * @param {string} sessionId - Session ID
 * @param {string} elementType - Type of element to test
 * @param {number} elementIndex - Index of element to test
 * @param {string} userPlan - User's subscription plan
 * @param {number} batchSize - Number of test cases to generate
 * @returns {object} - Generated test cases and session info
 */
function generateNextTest(sessionId, elementType, elementIndex, userPlan = "free", batchSize = 5) {
  if (!sessionId || !pageCache[sessionId]) {
    return {
      success: false,
      error: "Invalid or expired session ID",
    }
  }

  const session = pageCache[sessionId]

  // Check free plan limits - setting high limit for testing
  const freeLimit = 9999
  if (userPlan === "free" && session.testCases.length >= freeLimit) {
    return {
      success: true,
      testCases: [],
      error: "Free plan limit reached",
      upgradeRequired: true,
      totalTestCases: session.testCases.length,
    }
  }

  // Array to store newly generated test cases
  const newTestCases = []

  // Initialize tracking variables
  let currentElementType = elementType
  let currentElementIndex = elementIndex
  let hasMoreElements = true

  // Generate up to batchSize test cases
  for (let i = 0; i < batchSize; i++) {
    // Stop if we've reached the free user limit
    if (userPlan === "free" && session.testCases.length + newTestCases.length >= freeLimit) {
      hasMoreElements = false
      break
    }

    // Stop if there are no more elements to process
    if (!currentElementType) {
      hasMoreElements = false
      break
    }

    // Get element collection based on type
    const elements = session.pageData[`${currentElementType}s`] || []

    if (currentElementIndex >= elements.length) {
      // Find next element type that has unprocessed elements
      const types = ["button", "form", "link", "input"]
      let foundNext = false

      for (const type of types) {
        if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
          currentElementType = type
          currentElementIndex = session.processed[`${type}s`]
          foundNext = true
          break
        }
      }

      if (!foundNext) {
        hasMoreElements = false
        break
      }
    }

    // Get the specific element
    const element = session.pageData[`${currentElementType}s`][currentElementIndex]

    // Generate a test case based on element type
    let testCase
    switch (currentElementType) {
      case "button":
        testCase = generateButtonTest(session.pageData, element, session.processed.buttons)
        break
      case "form":
        testCase = generateFormTest(session.pageData, element, session.processed.forms)
        break
      case "link":
        testCase = generateLinkTest(session.pageData, element, session.processed.links)
        break
      case "input":
        testCase = generateInputTest(session.pageData, element, session.processed.inputs)
        break
      default:
        testCase = null
    }

    if (testCase) {
      // Add the test case to our batch
      newTestCases.push(testCase)

      // Add to session test cases
      session.testCases.push(testCase)

      // Update processed count
      session.processed[`${currentElementType}s`]++

      // Move to the next element
      currentElementIndex++

      // Check if we've reached the end of this element type
      if (currentElementIndex >= session.pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ["button", "form", "input", "link"]
        let foundNext = false

        for (const type of types) {
          if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
            currentElementType = type
            currentElementIndex = session.processed[`${type}s`]
            foundNext = true
            break
          }
        }

        if (!foundNext) {
          hasMoreElements = false
          currentElementType = null
        }
      }
    } else {
      // If we couldn't generate a test case, move to the next element
      currentElementIndex++
      if (currentElementIndex >= session.pageData[`${currentElementType}s`].length) {
        // Find next element type
        const types = ["button", "form", "input", "link"]
        let foundNext = false

        for (const type of types) {
          if (session.processed[`${type}s`] < session.pageData[`${type}s`].length) {
            currentElementType = type
            currentElementIndex = session.processed[`${type}s`]
            foundNext = true
            break
          }
        }

        if (!foundNext) {
          hasMoreElements = false
          currentElementType = null
        }
      }
    }
  }

  // Return the batch of new test cases and updated state
  return {
    success: true,
    testCases: newTestCases,
    pageData: session.pageData,
    processed: session.processed,
    nextElementType: currentElementType,
    nextElementIndex: currentElementIndex,
    hasMoreElements,
    totalTestCases: session.testCases.length,
    upgradeRequired: false, // Set to false for testing
  }
}

// Replace the inferButtonExpectation function with a more dynamic approach

/**
 * Infer what should happen when a button is clicked based on its text and attributes
 * @param {String} buttonText - The text of the button
 * @param {Object} button - The button object with all attributes
 * @param {String} baseUrl - The base URL of the page
 * @returns {String} - Expected result after clicking the button
 */
function inferButtonExpectation(buttonText, button = {}, baseUrl = "") {
  buttonText = buttonText.toLowerCase()
  const buttonId = (button.id || "").toLowerCase()
  const buttonClass = (button.class || "").toLowerCase()
  const buttonType = (button.type || "").toLowerCase()

  // Check for navigation buttons by analyzing href, onclick, or data attributes
  if (button.href) {
    return determineNavigationDestination(button.href, buttonText, baseUrl)
  }

  // Check for form submission buttons
  if (buttonType === "submit" || buttonText.includes("submit") || buttonId.includes("submit")) {
    return "Form is submitted and confirmation message is displayed"
  }

  // View Packages specific case
  if (buttonText.includes("view") && buttonText.includes("package")) {
    return "User is navigated to the packages section of the page"
  }

  // Comparison Table specific case
  if (buttonText.includes("comparison") && buttonText.includes("table")) {
    return "Comparison table is displayed showing feature differences"
  }

  // Check for modal/dialog triggers
  if (
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

  // View-specific buttons
  if (buttonText.includes("view")) {
    const viewTarget = buttonText.replace(/view\s+/i, "").trim()
    if (viewTarget) {
      return `User is navigated to the ${viewTarget} section/page`
    }
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
  if (buttonText.includes("search") || buttonText.includes("find")) {
    return "Search is performed and results are displayed for the entered query"
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

/**
 * Extract content from button text by removing action verbs
 * @param {String} text - Button text
 * @returns {String} - Content type
 */
function extractContentFromButtonText(text) {
  // Remove common action verbs
  const cleanedText = text
    .replace(/view\s+/i, "")
    .replace(/show\s+/i, "")
    .replace(/display\s+/i, "")
    .replace(/open\s+/i, "")
    .replace(/get\s+/i, "")
    .replace(/see\s+/i, "")
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

  // Capitalize the first letter
  return cleanedText ? cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1) : "content"
}

/**
 * Determine navigation destination from href
 * @param {String} href - Link href attribute
 * @param {String} linkText - Link text content
 * @param {String} baseUrl - Base URL of the page
 * @returns {String} - Expected destination
 */
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

// Update the generateButtonTest function to pass more information to inferButtonExpectation
function generateButtonTest(pageData, button, index) {
  // Ensure we have a valid button text
  const buttonText = button.text || button.id || "Unnamed Button"
  const buttonIdentifier = button.text
    ? `with text "${button.text}"`
    : button.id
      ? `with ID "${button.id}"`
      : `#${index + 1}`

  // Generate specific expected result based on button text and attributes
  const expectedResult = inferButtonExpectation(buttonText, button, pageData.url)

  return {
    id: `TC_BTN_${index + 1}`,
    title: `Test Button: ${buttonText}`,
    description: `Verify that the "${buttonText}" button works correctly`,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Find button ${buttonIdentifier}`,
        expected: "Button is visible on the page",
      },
      {
        step: 3,
        action: "Click the button",
        expected: expectedResult,
      },
    ],
  }
}

/**
 * Infer what should happen when a button is clicked based on its text
 * @param {String} buttonText - The text of the button
 * @returns {String} - Expected result after clicking the button
 */
/*
function inferButtonExpectation(buttonText) {
  buttonText = buttonText.toLowerCase()

  // View Packages specific case
  if (buttonText.includes("view") && buttonText.includes("package")) {
    return "User is navigated to the packages section of the page"
  }

  // Comparison Table specific case
  if (buttonText.includes("comparison") && buttonText.includes("table")) {
    return "Comparison table is displayed showing feature differences"
  }

  // Search/Filter buttons
  if (buttonText.includes("search") || buttonText.includes("find")) {
    return "Search results are displayed for the entered query"
  }

  // Navigation-related buttons
  if (buttonText.includes("menu") || buttonText.includes("navigation")) {
    return "Menu or navigation options are displayed"
  }

  // Comparison/Table buttons
  if (buttonText.includes("compar") || buttonText.includes("table")) {
    return "Comparison table is displayed showing differences between items"
  }

  // Form submission buttons
  if (
    buttonText.includes("submit") ||
    buttonText.includes("send") ||
    buttonText.includes("save") ||
    buttonText.includes("apply")
  ) {
    return "Form is submitted and confirmation message is displayed"
  }

  // Login/account buttons
  if (buttonText.includes("login") || buttonText.includes("sign in")) {
    return "User is logged in successfully and redirected to dashboard"
  }
  if (buttonText.includes("register") || buttonText.includes("sign up")) {
    return "Registration form is completed and confirmation is shown"
  }

  // Download buttons
  if (buttonText.includes("download")) {
    return "File download begins or download options are presented"
  }

  // View/Show buttons
  if (buttonText.includes("view")) {
    const viewTarget = buttonText.replace("view", "").trim()
    return `User is navigated to the ${viewTarget} section of the page`
  }

  if (buttonText.includes("show") || buttonText.includes("display") || buttonText.includes("open")) {
    const contentType = extractContentType(buttonText)
    return `${contentType} is displayed to the user`
  }

  // Close/Hide buttons
  if (
    buttonText.includes("close") ||
    buttonText.includes("hide") ||
    buttonText.includes("cancel") ||
    buttonText.includes("dismiss")
  ) {
    return "The associated content is hidden or closed"
  }

  // Add/Create buttons
  if (buttonText.includes("add") || buttonText.includes("create") || buttonText.includes("new")) {
    return "New item creation form is displayed with empty fields"
  }

  // Filter buttons
  if (buttonText.includes("filter")) {
    return "Results are filtered according to selected criteria"
  }

  // Sort buttons
  if (buttonText.includes("sort")) {
    return "Results are sorted according to selected criteria"
  }

  // Reset buttons
  if (buttonText.includes("reset") || buttonText.includes("clear")) {
    return "Form or filters are reset to default values"
  }

  // Default fallback
  return "Appropriate content is displayed based on the button's purpose"
}
*/

/**
 * Extract content type from button text
 * @param {String} text - Button text
 * @returns {String} - Content type
 */
/*
function extractContentType(text) {
  // Remove common action words
  const cleanedText = text.replace(/(view|show|display|open|get|see)\s+/i, "")

  // Capitalize the first letter
  return cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1)
}
*/

function generateFormTest(pageData, form, index) {
  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test Form: ${form.id || "Form " + (index + 1)}`,
    description: `Verify that the form can be submitted correctly`,
    priority: "High",
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Find form ${form.id ? `with ID "${form.id}"` : index + 1}`,
        expected: "Form is visible on the page",
      },
      {
        step: 3,
        action: "Fill all required fields with valid data",
        expected: "Data can be entered in the fields",
      },
      {
        step: 4,
        action: "Submit the form",
        expected: "Form submits without errors",
      },
    ],
  }
}

/**
 * Enhanced link test generation with intelligent expectations
 */
function generateLinkTest(pageData, link, index) {
  const linkText = link.text || link.href || "Unnamed Link"
  const linkIdentifier = link.text ? `with text "${link.text}"` : link.id ? `with ID "${link.id}"` : `#${index + 1}`

  // Extract destination from href or text
  const destination = inferLinkDestination(link.href, linkText)

  return {
    id: `TC_LINK_${index + 1}`,
    title: `Test Link: ${linkText}`,
    description: `Verify that the link navigates to the correct destination`,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Find link ${linkIdentifier}`,
        expected: "Link is visible on the page",
      },
      {
        step: 3,
        action: "Click the link",
        expected: destination,
      },
    ],
  }
}

/**
 * Infer the destination page/action from link href and text
 * @param {String} href - Link href attribute
 * @param {String} linkText - Link text content
 * @returns {String} - Expected destination
 */
function inferLinkDestination(href, linkText) {
  // If no href, use generic expectation
  if (!href) {
    return inferFromLinkText(linkText)
  }

  href = href.toLowerCase()
  linkText = linkText.toLowerCase()

  // Check for anchor links (same page navigation)
  if (href.startsWith("#")) {
    const anchorName = href.substring(1)
    return `Page scrolls to the "${anchorName}" section`
  }

  // Check for external links
  if (href.startsWith("http") && !href.includes(global.location?.hostname || "")) {
    let hostname = ""
    try {
      hostname = new URL(href).hostname
    } catch (e) {
      // If URL parsing fails, just use the href
      hostname = href
    }
    return `User is navigated to external website: ${hostname}`
  }

  // Check for file downloads
  if (
    href.includes(".pdf") ||
    href.includes(".doc") ||
    href.includes(".xls") ||
    href.includes(".zip") ||
    href.includes(".csv")
  ) {
    return `File download begins for the linked document`
  }

  // Check for mail links
  if (href.startsWith("mailto:")) {
    return `Email client opens with the specified email address`
  }

  // Check for phone links
  if (href.startsWith("tel:")) {
    return `Phone dialer opens with the specified phone number`
  }

  // Extract page name from href
  let pageName = ""
  try {
    // Try to extract the last part of the path
    const url = new URL(href)
    const pathParts = url.pathname.split("/").filter(Boolean)
    if (pathParts.length > 0) {
      pageName = pathParts[pathParts.length - 1].replace(/\.\w+$/, "") // Remove file extension
      pageName = pageName.replace(/-|_/g, " ") // Replace dashes/underscores with spaces
    }
  } catch (e) {
    // If parsing fails, extract from the href string
    const lastPart = href.split("/").pop()
    if (lastPart) {
      pageName = lastPart.replace(/\.\w+$/, "").replace(/-|_/g, " ")
    }
  }

  // If we have a page name, use it
  if (pageName) {
    // Capitalize each word
    pageName = pageName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    return `User is navigated to the ${pageName} page`
  }

  // Fallback to link text analysis
  return inferFromLinkText(linkText)
}

/**
 * Infer destination from link text when href analysis fails
 * @param {String} linkText - The text of the link
 * @returns {String} - Expected destination
 */
function inferFromLinkText(linkText) {
  linkText = linkText.toLowerCase()

  // Common page types
  if (linkText.includes("home")) return "User is navigated to the Home page"
  if (linkText.includes("about")) return "User is navigated to the About page"
  if (linkText.includes("contact")) return "User is navigated to the Contact page"
  if (linkText.includes("pricing")) return "User is navigated to the Pricing page"
  if (linkText.includes("feature")) return "User is navigated to the Features page"
  if (linkText.includes("product")) return "User is navigated to the Products page"
  if (linkText.includes("service")) return "User is navigated to the Services page"
  if (linkText.includes("blog") || linkText.includes("news")) return "User is navigated to the Blog/News page"
  if (linkText.includes("login") || linkText.includes("sign in")) return "User is navigated to the Login page"
  if (linkText.includes("register") || linkText.includes("sign up")) return "User is navigated to the Registration page"

  // If nothing specific, construct from the link text
  return `User is navigated to the ${linkText} page/section`
}

function generateInputTest(pageData, input, index) {
  return {
    id: `TC_INPUT_${index + 1}`,
    title: `Test Input Field: ${input.name || input.id || input.type + " input"}`,
    description: `Verify that the input field accepts valid data`,
    priority: "Medium",
    steps: [
      {
        step: 1,
        action: `Navigate to ${pageData.url}`,
        expected: "Page loads successfully",
      },
      {
        step: 2,
        action: `Find input field ${input.id ? `with ID "${input.id}"` : input.name ? `with name "${input.name}"` : index + 1}`,
        expected: "Input field is visible on the page",
      },
      {
        step: 3,
        action: `Enter valid data into the ${input.type} field`,
        expected: "Input field accepts the data",
      },
      {
        step: 4,
        action: "Check validation behavior",
        expected: "Input validates correctly",
      },
    ],
  }
}

// Cleanup function to remove old sessions (call periodically)
function cleanupSessions(maxAge = 3600000) {
  // Default 1 hour
  const now = Date.now()
  Object.keys(pageCache).forEach((sessionId) => {
    const session = pageCache[sessionId]
    const extractedTime = new Date(session.pageData.extractedAt).getTime()
    if (now - extractedTime > maxAge) {
      delete pageCache[sessionId]
    }
  })
}

// Export functions
module.exports = {
  generateTestCases,
  cleanupSessions,
  pageCache, // Export for testing purposes
}
