// api/test-debug.js
const axios = require("axios")
const cheerio = require("cheerio")

module.exports = async (req, res) => {
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

  // Log request body for debugging
  console.log("Debug request received:", req.body)

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      })
    }

    // Format URL properly
    let formattedUrl = url
    if (!formattedUrl.match(/^https?:\/\//i)) {
      formattedUrl = "https://" + formattedUrl
    }

    console.log("Attempting to fetch URL:", formattedUrl)

    // Try to fetch just the basic page info with simplified approach
    const response = await axios.get(formattedUrl, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      maxContentLength: 1024 * 1024, // 1MB limit
      validateStatus: () => true, // Accept any status code
    })

    console.log("Fetch response status:", response.status)

    // Create a very basic test case
    const pageTitle = "Test Page"
    const basicTestCase = {
      id: "TC_PAGE_1",
      title: `Verify Page Loads Correctly`,
      description: `Basic test case for ${formattedUrl}`,
      priority: "High",
      steps: [
        {
          step: 1,
          action: `Navigate to ${formattedUrl}`,
          expected: "Page loads without errors",
        },
        {
          step: 2,
          action: "Verify page functionality",
          expected: "Page functions correctly",
        },
      ],
    }

    // Return a simplified result
    return res.status(200).json({
      success: true,
      debug: true,
      url: formattedUrl,
      statusCode: response.status,
      pageData: {
        url: formattedUrl,
        title: pageTitle,
        extractedAt: new Date().toISOString(),
        buttons: [],
        forms: [],
        links: [],
        inputs: [],
      },
      processed: {
        buttons: 0,
        forms: 0,
        links: 0,
        inputs: 0,
      },
      testCases: [basicTestCase],
      nextElementType: null,
      nextElementIndex: 0,
      hasMoreElements: false,
    })
  } catch (error) {
    console.error("Debug test error:", error)

    // Return a non-500 response with error details
    return res.status(200).json({
      success: false,
      debug: true,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      errorName: error.name,
      errorConfig: error.config
        ? {
            url: error.config.url,
            method: error.config.method,
            timeout: error.config.timeout,
          }
        : "No config",
    })
  }
}
