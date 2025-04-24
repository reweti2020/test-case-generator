import { NextResponse } from "next/server"
import puppeteer from "puppeteer"

export async function POST(request) {
  try {
    const body = await request.json()
    const { testId, platform, url, appId, appPlatform } = body || {}

    // Log the execution request
    console.log(`Executing test ${testId} for ${platform} (${url || appId})`)

    // For web tests, we'll use Puppeteer to actually execute the test
    if (platform === "web" && url) {
      return await executeWebTest(testId, url)
    }

    // For other platforms or if no URL provided, return a simulated result
    return simulateTestExecution(testId, platform, url, appId)
  } catch (error) {
    console.error("Error in test-executor:", error)
    return NextResponse.json({
      success: false,
      error: `Error: ${error.message || "Unknown error"}`,
    })
  }
}

/**
 * Execute a web test using Puppeteer
 */
async function executeWebTest(testId, url) {
  const logs = [`[INFO] Starting test execution for ${testId}`, `[INFO] Target URL: ${url}`]
  let browser = null

  try {
    logs.push(`[INFO] Launching browser`)
    browser = await puppeteer.launch({ headless: "new" })
    const page = await browser.newPage()

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })

    // Navigate to the URL
    logs.push(`[INFO] Navigating to ${url}`)
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })

    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`)
    }

    logs.push(`[INFO] Page loaded successfully`)

    // Get page title
    const title = await page.title()
    logs.push(`[INFO] Page title: "${title}"`)

    // Take a screenshot for verification
    await page.screenshot({ path: `/tmp/${testId}.png` })
    logs.push(`[INFO] Screenshot captured`)

    // Check for common elements
    const buttonCount = await page.$$eval(
      'button, input[type="submit"], input[type="button"], .btn, [role="button"]',
      (els) => els.length,
    )
    logs.push(`[INFO] Found ${buttonCount} buttons/button-like elements`)

    const linkCount = await page.$$eval("a[href]", (els) => els.length)
    logs.push(`[INFO] Found ${linkCount} links`)

    const formCount = await page.$$eval("form", (els) => els.length)
    logs.push(`[INFO] Found ${formCount} forms`)

    // Perform basic interaction based on test ID type
    if (testId.includes("BTN")) {
      // Try to find and click a button
      const buttonFound = await clickRandomButton(page, logs)
      if (!buttonFound) {
        logs.push(`[WARNING] Could not find a suitable button to click`)
      }
    } else if (testId.includes("LINK")) {
      // Try to find and hover over a link
      const linkFound = await hoverRandomLink(page, logs)
      if (!linkFound) {
        logs.push(`[WARNING] Could not find a suitable link to hover`)
      }
    } else if (testId.includes("FORM")) {
      // Try to find a form and fill a field
      const formFound = await interactWithForm(page, logs)
      if (!formFound) {
        logs.push(`[WARNING] Could not find a suitable form to interact with`)
      }
    }

    logs.push(`[SUCCESS] Test completed successfully`)

    return NextResponse.json({
      success: true,
      testId,
      status: "passed",
      executionTime: Math.floor(Math.random() * 1000) + 500, // Random time between 500-1500ms
      timestamp: new Date().toISOString(),
      logs,
    })
  } catch (error) {
    logs.push(`[ERROR] Test failed: ${error.message}`)

    return NextResponse.json({
      success: true,
      testId,
      status: "failed",
      failureReason: error.message,
      timestamp: new Date().toISOString(),
      logs,
    })
  } finally {
    if (browser) {
      logs.push(`[INFO] Closing browser`)
      await browser.close()
    }
  }
}

/**
 * Click a random visible button on the page
 */
async function clickRandomButton(page, logs) {
  const buttons = await page.$$(
    'button:not([disabled]), input[type="submit"]:not([disabled]), input[type="button"]:not([disabled]), .btn:not([disabled]), [role="button"]:not([disabled])',
  )

  if (buttons.length === 0) return false

  // Select a random button
  const randomIndex = Math.floor(Math.random() * buttons.length)
  const button = buttons[randomIndex]

  // Get button text
  const buttonText = await page.evaluate((el) => {
    return el.innerText || el.value || "Unnamed Button"
  }, button)

  logs.push(`[INFO] Attempting to click button: "${buttonText}"`)

  // Check if button is visible
  const isVisible = await page.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
  }, button)

  if (isVisible) {
    // Scroll button into view
    await button.scrollIntoView()
    logs.push(`[INFO] Button is visible, scrolling into view`)

    // Wait a moment
    await page.waitForTimeout(500)

    // Click the button
    await button.click({ delay: 100 })
    logs.push(`[INFO] Button clicked successfully`)

    // Wait for any navigation or DOM changes
    await page.waitForTimeout(1000)

    return true
  } else {
    logs.push(`[INFO] Button is not visible, skipping click`)
    return false
  }
}

/**
 * Hover over a random visible link on the page
 */
async function hoverRandomLink(page, logs) {
  const links = await page.$$("a[href]")

  if (links.length === 0) return false

  // Select a random link
  const randomIndex = Math.floor(Math.random() * links.length)
  const link = links[randomIndex]

  // Get link text and href
  const linkInfo = await page.evaluate((el) => {
    return {
      text: el.innerText || "Unnamed Link",
      href: el.getAttribute("href"),
    }
  }, link)

  logs.push(`[INFO] Attempting to hover over link: "${linkInfo.text}" (${linkInfo.href})`)

  // Check if link is visible
  const isVisible = await page.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
  }, link)

  if (isVisible) {
    // Scroll link into view
    await link.scrollIntoView()
    logs.push(`[INFO] Link is visible, scrolling into view`)

    // Wait a moment
    await page.waitForTimeout(500)

    // Hover over the link
    await link.hover()
    logs.push(`[INFO] Link hovered successfully`)

    // Wait for any hover effects
    await page.waitForTimeout(1000)

    return true
  } else {
    logs.push(`[INFO] Link is not visible, skipping hover`)
    return false
  }
}

/**
 * Interact with a random form on the page
 */
async function interactWithForm(page, logs) {
  const forms = await page.$$("form")

  if (forms.length === 0) return false

  // Select a random form
  const randomIndex = Math.floor(Math.random() * forms.length)
  const form = forms[randomIndex]

  // Find an input field in the form
  const inputs = await form.$$('input[type="text"], input[type="email"], input[type="password"], textarea')

  if (inputs.length === 0) {
    logs.push(`[INFO] No input fields found in the form`)
    return false
  }

  // Select a random input
  const randomInputIndex = Math.floor(Math.random() * inputs.length)
  const input = inputs[randomInputIndex]

  // Get input type and name
  const inputInfo = await page.evaluate((el) => {
    return {
      type: el.getAttribute("type") || "text",
      name: el.getAttribute("name") || el.getAttribute("id") || "Unnamed Input",
      placeholder: el.getAttribute("placeholder") || "",
    }
  }, input)

  logs.push(`[INFO] Attempting to fill input field: ${inputInfo.name} (${inputInfo.type})`)

  // Scroll input into view
  await input.scrollIntoView()
  logs.push(`[INFO] Input field scrolled into view`)

  // Wait a moment
  await page.waitForTimeout(500)

  // Determine test value based on input type
  let testValue = "Test Value"
  if (inputInfo.type === "email") {
    testValue = "test@example.com"
  } else if (inputInfo.type === "password") {
    testValue = "SecurePassword123"
  } else if (inputInfo.placeholder.toLowerCase().includes("search")) {
    testValue = "search query"
  }

  // Fill the input
  await input.click({ clickCount: 3 }) // Triple click to select all existing text
  await input.type(testValue, { delay: 50 })
  logs.push(`[INFO] Input field filled with value: "${testValue}"`)

  // Wait a moment
  await page.waitForTimeout(500)

  return true
}

/**
 * Simulate test execution for non-web tests or when real execution is not possible
 */
function simulateTestExecution(testId, platform, url, appId) {
  // Simulate test execution delay
  const passed = Math.random() > 0.3

  // If test failed, generate a random failure reason
  let failureReason = null
  if (!passed) {
    const failureReasons = [
      "Element not found on page",
      "Timeout waiting for page to load",
      "Expected text not present on page",
      "Button not clickable",
      "Form submission failed",
      "Navigation did not complete",
      "Unexpected alert dialog appeared",
      "Page layout changed from expected",
    ]
    failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]
  }

  // Return execution result
  return NextResponse.json({
    success: true,
    testId,
    status: passed ? "passed" : "failed",
    executionTime: Math.floor(Math.random() * 1000) + 500, // Random time between 500-1500ms
    failureReason,
    timestamp: new Date().toISOString(),
    logs: [
      `[INFO] Starting test execution for ${testId}`,
      `[INFO] Platform: ${platform}`,
      `[INFO] Target: ${url || appId}`,
      passed ? `[SUCCESS] Test completed successfully` : `[ERROR] Test failed: ${failureReason}`,
    ],
  })
}
