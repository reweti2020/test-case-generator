// Replace the entire file with this implementation that uses real web scraping

const axios = require("axios")
const cheerio = require("cheerio")

// Simple in-memory cache for session data
const sessionCache = {}

module.exports = async (req, res) => {
  console.log("[API] Test generation request received")

  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  )

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Extract basic request info
    const body = req.body || {}
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
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        })

        if (!response || response.status !== 200) {
          return res.status(200).json({
            success: false,
            error: `Failed to fetch URL (Status ${response?.status || "unknown"})`,
          })
        }

        // Parse the HTML
        const $ = cheerio.load(response.data, {
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
              pageData.forms.push({
                id: $form.attr("id") || "",
                action: $form.attr("action") || "",
                method: $form.attr("method") || "get",
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
        return res.status(200).json({
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
        return res.status(200).json({
          success: false,
          error: `Error analyzing website: ${error.message || "Unknown error"}`,
        })
      }
    }
    // For subsequent requests (next mode)
    else if (mode === "next" && sessionId) {
      // Check if session exists
      if (!sessionCache[sessionId]) {
        return res.status(200).json({
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
        return res.status(200).json({
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
      return res.status(200).json({
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
      return res.status(200).json({
        success: false,
        error: 'Invalid request. Missing sessionId for "next" mode.',
      })
    }
  } catch (error) {
    console.error("Error in generate-incremental:", error)

    // Return 200 OK with error information to avoid HTTP error codes
    return res.status(200).json({
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

  // Generate expected result based on button text or type
  let expectedResult = "Action is performed successfully"

  const textLower = buttonText.toLowerCase()

  if (textLower.includes("submit")) {
    expectedResult = "Form is submitted and appropriate response is displayed"
  } else if (textLower.includes("search")) {
    expectedResult = "Search results are displayed"
  } else if (textLower.includes("login") || textLower.includes("sign in")) {
    expectedResult = "User is logged in or login form is displayed"
  } else if (textLower.includes("register") || textLower.includes("sign up")) {
    expectedResult = "Registration form is displayed or user is registered"
  } else if (textLower.includes("contact")) {
    expectedResult = "Contact form is displayed or submitted"
  } else if (textLower.includes("add") || textLower.includes("create")) {
    expectedResult = "New item creation form is displayed"
  } else if (textLower.includes("delete") || textLower.includes("remove")) {
    expectedResult = "Item is deleted or confirmation dialog is displayed"
  } else if (textLower.includes("edit") || textLower.includes("update")) {
    expectedResult = "Edit form is displayed or changes are saved"
  } else if (textLower.includes("cancel")) {
    expectedResult = "Action is cancelled and appropriate state is restored"
  } else if (textLower.includes("close")) {
    expectedResult = "Dialog or section is closed"
  } else if (textLower.includes("save")) {
    expectedResult = "Data is saved successfully"
  } else if (textLower.includes("download")) {
    expectedResult = "Download starts or options are displayed"
  } else if (textLower.includes("upload")) {
    expectedResult = "File upload dialog is displayed"
  } else if (textLower.includes("next")) {
    expectedResult = "User is navigated to the next step or page"
  } else if (textLower.includes("previous") || textLower.includes("back")) {
    expectedResult = "User is navigated to the previous step or page"
  } else if (textLower.includes("menu")) {
    expectedResult = "Menu is displayed or toggled"
  }

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

function generateFormTest(url, form, index) {
  const formId = form.id || `Form ${index + 1}`
  const formMethod = form.method || "post"
  const formIdentifier = form.id ? `with ID "${form.id}"` : `#${index + 1}`

  // Try to determine form purpose from ID
  let formPurpose = "form"
  let expectedResult = "Form submits successfully"

  const formIdLower = formId.toLowerCase()

  if (formIdLower.includes("contact")) {
    formPurpose = "contact form"
    expectedResult = "Contact message is sent and confirmation is shown"
  } else if (formIdLower.includes("newsletter") || formIdLower.includes("subscribe")) {
    formPurpose = "subscription form"
    expectedResult = "Subscription is confirmed"
  } else if (formIdLower.includes("login") || formIdLower.includes("signin")) {
    formPurpose = "login form"
    expectedResult = "User is logged in successfully"
  } else if (formIdLower.includes("register") || formIdLower.includes("signup")) {
    formPurpose = "registration form"
    expectedResult = "User is registered successfully"
  } else if (formIdLower.includes("search")) {
    formPurpose = "search form"
    expectedResult = "Search results are displayed"
  } else if (formIdLower.includes("comment")) {
    formPurpose = "comment form"
    expectedResult = "Comment is submitted successfully"
  } else if (formIdLower.includes("checkout") || formIdLower.includes("payment")) {
    formPurpose = "payment form"
    expectedResult = "Payment is processed successfully"
  }

  return {
    id: `TC_FORM_${index + 1}`,
    title: `Test ${formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}: ${formId}`,
    description: `Verify that the ${formPurpose} submits correctly`,
    priority: "High",
    steps: [
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
      {
        step: 3,
        action: "Fill all required fields with valid data",
        expected: "All fields accept input correctly",
      },
      {
        step: 4,
        action: "Submit the form",
        expected: expectedResult,
      },
    ],
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
  const inputName = input.name || input.id || `Input ${index + 1}`
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

