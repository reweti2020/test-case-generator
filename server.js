/**
 * Express server for Test Case Generator
 */
const express = require("express")
const path = require("path")
const cors = require("cors")

// Create Express app
const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json({ limit: "10mb" }))
app.use(cors())
app.use(express.static(path.join(__dirname, "public")))

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// API endpoints
app.post("/api/generate-incremental", require("./api/generate-incremental"))
app.post("/api/export-test", require("./api/export-test"))
app.post("/api/create-checkout-session", (req, res) => {
  // Mock implementation for checkout
  res.status(200).json({
    success: true,
    id: "mock-session-" + Math.random().toString(36).substring(2, 10),
  })
})
app.post("/api/test", require("./api/test"))
app.post("/api/debug-element", require("./api/debug-element"))
app.post("/api/test-debug", require("./api/test-debug"))
app.post("/api/test-executor", require("./api/test-executor"))
app.post("/api/workflow-generator", require("./api/workflow-generator"))
app.post("/api/mobile-test-generator", require("./api/mobile-test-generator"))

// Simple health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
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


