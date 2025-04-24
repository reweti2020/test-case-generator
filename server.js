const express = require("express")
const path = require("path")
const cors = require("cors")

// Create Express app
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: "5mb" }))
app.use(express.static(path.join(__dirname, "public")))

// Simple health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  })
})

// Test endpoint
app.post("/api/test", (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "API is working correctly",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      nodeVersion: process.version,
    })
  } catch (error) {
    console.error("Error in test API:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Unknown error",
    })
  }
})

// Serve the HTML page for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Start the server if not running on Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

// Export for Vercel
module.exports = app



