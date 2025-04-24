// api/mobile-test-generator.js
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

  try {
    const { appId, appPlatform, appVersion, mode, sessionId } = req.body || {}

    console.log(`Mobile test request: ${appId}, ${appPlatform}, ${appVersion}, mode=${mode}`)

    // For first-time requests
    if (mode === "first") {
      // Create a new session ID
      const newSessionId = "mobile-session-" + Math.random().toString(36).substring(2, 10)

      // Create mock app data
      const appData = {
        appId: appId || "com.example.app",
        platform: appPlatform || "android",
        version: appVersion || "1.0.0",
        extractedAt: new Date().toISOString(),
        screens: [
          { name: "Login Screen", id: "login_screen" },
          { name: "Home Screen", id: "home_screen" },
          { name: "Profile Screen", id: "profile_screen" },
          { name: "Settings Screen", id: "settings_screen" },
        ],
        buttons: [
          { text: "Login", id: "btn_login", screen: "login_screen" },
          { text: "Register", id: "btn_register", screen: "login_screen" },
          { text: "Forgot Password", id: "btn_forgot_password", screen: "login_screen" },
          { text: "Profile", id: "btn_profile", screen: "home_screen" },
          { text: "Settings", id: "btn_settings", screen: "home_screen" },
          { text: "Edit Profile", id: "btn_edit_profile", screen: "profile_screen" },
          { text: "Save", id: "btn_save", screen: "profile_screen" },
          { text: "Logout", id: "btn_logout", screen: "settings_screen" },
        ],
        inputs: [
          { type: "text", id: "input_username", screen: "login_screen", hint: "Username" },
          { type: "password", id: "input_password", screen: "login_screen", hint: "Password" },
          { type: "text", id: "input_name", screen: "profile_screen", hint: "Full Name" },
          { type: "email", id: "input_email", screen: "profile_screen", hint: "Email" },
          { type: "text", id: "input_bio", screen: "profile_screen", hint: "Bio" },
        ],
      }

      // Create processed state
      const processed = {
        screens: 0,
        buttons: 0,
        inputs: 0,
      }

      // Store in session cache (you would need to implement this)
      const sessionCache = {}
      sessionCache[newSessionId] = {
        appData: appData,
        processed: processed,
        testCases: [],
      }

      // Generate first test case (app launch verification)
      const firstTest = {
        id: "TC_APP_1",
        title: `Verify ${appData.appId} Launches Correctly`,
        description: `Test that the app launches successfully and displays the login screen`,
        priority: "High",
        steps: [
          {
            step: 1,
            action: `Launch the ${appPlatform} app`,
            expected: "App launches without errors",
          },
          {
            step: 2,
            action: "Verify initial screen",
            expected: `Login screen is displayed with username and password fields`,
          },
        ],
      }

      // Add to session
      sessionCache[newSessionId].testCases.push(firstTest)

      // Return first test response
      return res.status(200).json({
        success: true,
        sessionId: newSessionId,
        appData: appData,
        processed: processed,
        testCases: [firstTest],
        nextElementType: "screen",
        nextElementIndex: 0,
        hasMoreElements: true,
        totalTestCases: 1,
      })
    }
    // For subsequent requests (next mode)
    else if (mode === "next" && sessionId) {
      // In a real implementation, you would retrieve the session data
      // For this example, we'll just return some mock data

      const mockTestCases = [
        {
          id: "TC_LOGIN_1",
          title: "Verify Login Functionality",
          description: "Test that a user can login with valid credentials",
          priority: "High",
          steps: [
            {
              step: 1,
              action: "Launch the app",
              expected: "Login screen is displayed",
            },
            {
              step: 2,
              action: "Enter valid username in the username field",
              expected: "Username is accepted",
            },
            {
              step: 3,
              action: "Enter valid password in the password field",
              expected: "Password is masked and accepted",
            },
            {
              step: 4,
              action: "Tap the Login button",
              expected: "User is logged in and Home screen is displayed",
            },
          ],
        },
        {
          id: "TC_LOGIN_2",
          title: "Verify Invalid Login Attempt",
          description: "Test that appropriate error is shown for invalid credentials",
          priority: "Medium",
          steps: [
            {
              step: 1,
              action: "Launch the app",
              expected: "Login screen is displayed",
            },
            {
              step: 2,
              action: "Enter invalid username in the username field",
              expected: "Username is accepted",
            },
            {
              step: 3,
              action: "Enter invalid password in the password field",
              expected: "Password is masked and accepted",
            },
            {
              step: 4,
              action: "Tap the Login button",
              expected: "Error message is displayed indicating invalid credentials",
            },
          ],
        },
      ]

      return res.status(200).json({
        success: true,
        sessionId: sessionId,
        testCases: mockTestCases,
        hasMoreElements: false,
        totalTestCases: mockTestCases.length,
      })
    } else {
      return res.status(200).json({
        success: false,
        error: 'Invalid request. Missing sessionId for "next" mode.',
      })
    }
  } catch (error) {
    console.error("Error in mobile-test-generator:", error)
    return res.status(500).json({
      success: false,
      error: `Error: ${error.message || "Unknown error"}`,
    })
  }
}
