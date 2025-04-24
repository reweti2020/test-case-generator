// api/test.js
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

  // Log the request information for debugging
  console.log("Test API Endpoint Called")
  console.log("Method:", req.method)
  console.log("Headers:", JSON.stringify(req.headers))
  console.log("Body:", JSON.stringify(req.body))

  try {
    // Return a simple success response
    return res.status(200).json({
      success: true,
      message: "API is working correctly",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      nodeVersion: process.version,
    })
  } catch (error) {
    console.error("Error in test API:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown error",
    })
  }
}
