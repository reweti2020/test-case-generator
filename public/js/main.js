/**
 * Main JavaScript file for Test Case Generator
 */
document.addEventListener("DOMContentLoaded", () => {
  // Add promotional banner
  const promoHTML = `
  <div id="promo-banner" class="promo-banner">
    <div class="promo-content">
      <div class="promo-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="promo-icon">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
        <span class="promo-tag">LIMITED TIME OFFER</span>
      </div>
      <p>All Pro features are currently available for free during our launch period!</p>
    </div>
    <button id="close-promo" class="close-promo" aria-label="Close promotion banner">×</button>
  </div>
  `

  // Insert promo banner at the top of the page
  const container = document.querySelector(".container")
  if (container) {
    container.insertAdjacentHTML("beforebegin", promoHTML)
  }

  // Get DOM elements with null checks
  const elements = {
    urlForm: document.getElementById("url-form"),
    urlInput: document.getElementById("url-input"),
    formatSelect: document.getElementById("format-select"),
    generateButton: document.getElementById("generate-button"),
    output: document.getElementById("output"),
    nextTestContainer: document.getElementById("next-test-container"),
    generateNextTest: document.getElementById("generate-next-test"),
    elementInfo: document.getElementById("element-info"),
    upgradeModal: document.getElementById("upgrade-modal"),
    upgradeBanner: document.getElementById("upgrade-banner"),
    showUpgradeModal: document.getElementById("show-upgrade-modal"),
    confirmUpgrade: document.getElementById("confirm-upgrade"),
    closeUpgradeModal: document.getElementById("close-upgrade-modal"),
    downloadContainer: document.getElementById("download-container"),
    planOptions: document.querySelectorAll(".plan-option"),
    testCaseList: document.getElementById("test-case-list"),
    loadingSpinner: document.getElementById("loading-spinner"),
    testCaseCounter: document.getElementById("test-case-counter"),
    promoBanner: document.getElementById("promo-banner"),
    closePromo: document.getElementById("close-promo"),
    correctionUI: document.getElementById("correction-ui"),
    debugSection: document.getElementById("debug-section"),
    debugMode: document.getElementById("debug-mode"),
    debugSelector: document.getElementById("debug-selector"),
    runDebug: document.getElementById("run-debug"),
    debugResults: document.getElementById("debug-results"),
  }

  // Application state
  const state = {
    sessionId: null, // Store session ID for API calls
    pageData: null, // Store all page data from server
    processed: null, // Store processing state
    nextElementType: null,
    nextElementIndex: 0,
    hasMoreElements: false,
    testCases: [],
    totalTestCases: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 5,
    userPlan: "pro", // Force pro plan for testing
    freeLimit: 9999, // Very high limit for testing
    currentUrl: "",
    isLoading: false,
  }

  // Initialize the app
  initApp()

  /**
   * Initialize the application
   */
  function initApp() {
    // Persist pro plan for testing
    localStorage.setItem("userPlan", "pro")
    console.log("Pro plan enabled for testing")

    // Add event listeners
    addEventListeners()

    // Update UI based on user plan
    updateUiForUserPlan()

    // Initialize correction UI
    initCorrectionUI()

    // Initialize debug tools
    initDebugTools()

    // Update button text for batch generation
    if (elements.generateNextTest) {
      elements.generateNextTest.textContent = "Generate 5 More Tests"
    }

    // Handle promo banner close
    if (elements.closePromo) {
      elements.closePromo.addEventListener("click", () => {
        if (elements.promoBanner) {
          elements.promoBanner.style.display = "none"
          localStorage.setItem("promoHidden", "true")
        }
      })
    }

    // Check if user has previously closed the banner
    if (elements.promoBanner && localStorage.getItem("promoHidden") === "true") {
      elements.promoBanner.style.display = "none"
    }
  }

  /**
   * Setup event listeners
   */
  function addEventListeners() {
    // Generate button click
    if (elements.urlForm) {
      elements.urlForm.addEventListener("submit", handleFormSubmit)
    }

    // Generate next test
    if (elements.generateNextTest) {
      elements.generateNextTest.addEventListener("click", handleGenerateNextTest)
    }

    // Upgrade modal
    if (elements.showUpgradeModal) {
      elements.showUpgradeModal.addEventListener("click", () => {
        // Track upgrade click
        trackEvent("upgrade_click", "engagement", "upgrade_banner")
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = "flex"
        }
      })
    }

    // Close upgrade modal
    if (elements.closeUpgradeModal) {
      elements.closeUpgradeModal.addEventListener("click", () => {
        if (elements.upgradeModal) {
          elements.upgradeModal.style.display = "none"
        }
      })
    }

    // Confirm upgrade
    if (elements.confirmUpgrade) {
      elements.confirmUpgrade.addEventListener("click", handleUpgrade)
    }

    // Plan selection
    if (elements.planOptions && elements.planOptions.length > 0) {
      elements.planOptions.forEach((plan) => {
        plan.addEventListener("click", () => {
          elements.planOptions.forEach((p) => p.classList.remove("selected"))
          plan.classList.add("selected")
        })
      })
    }

    // Add download buttons event listeners
    addDownloadEventListeners()
  }

  /**
   * Initialize debug tools
   */
  function initDebugTools() {
    if (elements.debugMode) {
      elements.debugMode.addEventListener("change", function () {
        if (elements.debugSection) {
          elements.debugSection.style.display = this.checked ? "block" : "none"
        }
      })
    }

    if (elements.runDebug) {
      elements.runDebug.addEventListener("click", async () => {
        if (!elements.debugResults || !elements.debugSelector) return

        // Get URL from state
        const url = state.currentUrl
        if (!url) {
          elements.debugResults.innerHTML = '<p class="error">❌ Please enter a URL in the main form first</p>'
          return
        }

        // Show loading state
        elements.debugResults.innerHTML = '<div class="spinner"></div><p>Analyzing elements...</p>'

        try {
          const response = await fetch("/api/debug-element", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: url,
              selector: elements.debugSelector.value.trim(),
            }),
          })

          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`)
          }

          const data = await response.json()

          if (data.success) {
            let resultsHTML = `<p>Found ${data.results.length} element(s) matching "${data.selector}" on ${data.url}</p><pre>`
            data.results.forEach((element, index) => {
              resultsHTML += `\n[${index}] ${element.tagName}: ${element.content || "No content"}\n`
              resultsHTML += `    Attributes: ${JSON.stringify(element.attributes, null, 2)}\n`
            })
            resultsHTML += "</pre>"

            elements.debugResults.innerHTML = resultsHTML
          } else {
            elements.debugResults.innerHTML = `<p class="error">❌ ${data.error || "Unknown error"}</p>`
          }
        } catch (error) {
          elements.debugResults.innerHTML = `<p class="error">❌ Debug API error: ${error.message || "Unknown error"}</p>`
        }
      })
    }
  }

  /**
   * Update UI elements based on user plan
   */
  function updateUiForUserPlan() {
    // Exit early if formatSelect doesn't exist
    if (!elements.formatSelect) return

    // For testing, enable all formats regardless of plan
    const formatOptions = elements.formatSelect.querySelectorAll("option")
    formatOptions.forEach((option) => {
      option.disabled = false
      // Remove any (Pro) labels
      option.textContent = option.textContent.replace(" (Pro)", "")
    })

    // Hide upgrade banner if it exists
    if (elements.upgradeBanner) {
      elements.upgradeBanner.classList.add("hidden")
    }
  }

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async function handleFormSubmit(e) {
    e.preventDefault()

    if (!elements.urlInput || !elements.output) return

    // Reset session state
    state.sessionId = null
    state.pageData = null
    state.processed = null
    state.testCases = []
    state.totalTestCases = 0

    if (elements.nextTestContainer) {
      elements.nextTestContainer.style.display = "none"
    }

    // Get and validate URL
    const url = elements.urlInput.value.trim()
    if (!url) {
      showError("Please enter a valid URL")
      return
    }

    state.currentUrl = url

    // Show loading state
    setLoading(true)
    elements.output.innerHTML = "<p>Analyzing website...</p>"

    try {
      // Add a client-side timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : "plain"

      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          mode: "first",
          format: format,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Store session ID for future requests
        state.sessionId = data.sessionId

        // Store complete data returned from server
        state.pageData = data.pageData
        state.processed = data.processed
        state.nextElementType = data.nextElementType
        state.nextElementIndex = data.nextElementIndex
        state.hasMoreElements = data.hasMoreElements
        state.testCases = state.testCases.concat(data.testCases || [])
        state.totalTestCases = data.totalTestCases || (data.testCases ? data.testCases.length : 0)

        // Apply any stored corrections
        state.testCases = applyStoredCorrections(state.testCases)

        // Track successful generation
        trackEvent("generate_test_cases", "usage", url)

        // Render test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases)
        } else {
          elements.output.innerHTML = "<p>No test cases were generated. Try a different URL.</p>"
        }

        // Show "Generate Next Test" button if more elements are available
        if (data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = "block"
          updateElementInfo()
        }

        // Show download container
        if (elements.downloadContainer && state.testCases.length > 0) {
          elements.downloadContainer.style.display = "block"
        }

        // Show promotional message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      } else {
        showError(`Error: ${data.error || "Unknown error occurred"}`)

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        showError("Request timed out. Please try a simpler website.")
      } else {
        showError(`Error: ${error.message || "Unknown error occurred"}`)
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle "Generate Next Test" button click
   */
  async function handleGenerateNextTest() {
    if (!state.hasMoreElements || !state.sessionId) {
      showError("No more elements to test or missing session ID")
      return
    }

    // Show loading state
    setLoading(true)

    try {
      // Ensure we have formatSelect
      const format = elements.formatSelect ? elements.formatSelect.value : "plain"

      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "next",
          sessionId: state.sessionId, // Use sessionId for state tracking
          elementType: state.nextElementType,
          elementIndex: state.nextElementIndex,
          format: format,
          batchSize: 5, // Request 5 tests at once
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Update state with received data
        state.pageData = data.pageData || state.pageData
        state.processed = data.processed || state.processed
        state.nextElementType = data.nextElementType
        state.nextElementIndex = data.nextElementIndex
        state.hasMoreElements = data.hasMoreElements
        state.testCases = state.testCases.concat(data.testCases || [])
        state.totalTestCases = data.totalTestCases || state.testCases.length

        // Apply any stored corrections
        state.testCases = applyStoredCorrections(state.testCases)

        // Render new test cases
        if (data.testCases && data.testCases.length > 0) {
          renderTestCases(data.testCases, true)
        }

        // Update element info
        updateElementInfo()

        // Hide "Generate Next Test" button if no more elements
        if (!data.hasMoreElements && elements.nextTestContainer) {
          elements.nextTestContainer.style.display = "none"
        }

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      } else {
        showError(`Error: ${data.error || "Unknown error occurred"}`)

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      }
    } catch (error) {
      showError(`Error: ${error.message || "Unknown error occurred"}`)
    } finally {
      setLoading(false)
    }
  }

  // Update the showPromotionalBanner function to use the new icon
  function showPromotionalBanner() {
    if (!elements.upgradeBanner) return

    // Replace the upgrade banner with a promotional message
    elements.upgradeBanner.classList.remove("upgrade-banner")
    elements.upgradeBanner.classList.add("promo-banner")

    elements.upgradeBanner.innerHTML = `
      <div class="promo-content">
        <div class="promo-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="promo-icon">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <h3 style="margin: 0; text-align: center;">Premium Features Unlocked!</h3>
        </div>
        <p>You're enjoying all premium features for free during our launch period. No time limit on your test cases!</p>
        <p class="promo-small">Premium features include unlimited test cases, all export formats, and enhanced detection.</p>
      </div>
    `

    // Show the banner
    elements.upgradeBanner.classList.remove("hidden")
  }

  /**
   * Handle upgrade button click
   */
  async function handleUpgrade() {
    const selectedPlan = document.querySelector(".plan-option.selected")
    if (!selectedPlan || !elements.confirmUpgrade) return

    const planType = selectedPlan.getAttribute("data-plan")
    if (!planType) return

    if (planType === "enterprise") {
      window.open("mailto:sales@example.com?subject=Enterprise Plan Inquiry", "_blank")
      if (elements.upgradeModal) {
        elements.upgradeModal.style.display = "none"
      }
      return
    }

    // Track conversion event
    trackEvent("upgrade_confirmed", "conversion", planType)

    // Show loading state in the button
    elements.confirmUpgrade.textContent = "Processing..."
    elements.confirmUpgrade.disabled = true

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planType }),
      })

      const session = await response.json()

      if (session.success && session.id) {
        // In a real implementation, you would redirect to Stripe checkout
        // For this demo, we'll simulate a successful upgrade
        simulateSuccessfulUpgrade(planType)
      } else {
        throw new Error(session.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Payment processing error: " + (error.message || "Unknown error"))

      // Reset button
      elements.confirmUpgrade.textContent = "Upgrade Now"
      elements.confirmUpgrade.disabled = false
    }
  }

  /**
   * Simulate a successful upgrade (for demo purposes)
   * @param {String} planType - The plan type
   */
  function simulateSuccessfulUpgrade(planType) {
    if (!elements.output) return

    // Update user plan
    state.userPlan = planType
    localStorage.setItem("userPlan", planType)

    // Hide upgrade elements
    if (elements.upgradeBanner) {
      elements.upgradeBanner.classList.add("hidden")
    }
    if (elements.upgradeModal) {
      elements.upgradeModal.style.display = "none"
    }

    // Enable premium formats
    if (elements.formatSelect) {
      const formatSelect = elements.formatSelect
      for (let i = 0; i < formatSelect.options.length; i++) {
        formatSelect.options[i].disabled = false

        // Remove Pro label
        const option = formatSelect.options[i]
        option.textContent = option.textContent.replace(" (Pro)", "")
      }
    }

    // Show success message
    const successMessage = document.createElement("div")
    successMessage.className = "upgrade-success-banner"
    successMessage.innerHTML = `
      <p>🎉 Congratulations! You've successfully upgraded to the ${planType.charAt(0).toUpperCase() + planType.slice(1)} plan.</p>
      <p>You now have access to all premium features!</p>
    `

    const container = document.querySelector(".container")
    if (container) {
      container.insertBefore(successMessage, elements.output.parentNode)
    } else {
      document.body.insertBefore(successMessage, elements.output.parentNode)
    }

    // Enable "Generate Next Test" button if it was hidden
    if (elements.nextTestContainer && state.hasMoreElements) {
      elements.nextTestContainer.style.display = "block"
    }

    // Remove success message after 5 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage)
      }
    }, 5000)
  }

  /**
   * Render test cases in the output area
   * @param {Array} testCases - Test cases to render
   * @param {Boolean} append - Whether to append or replace existing content
   */
  function renderTestCases(testCases, append = false) {
    if (!testCases || testCases.length === 0 || !elements.output) return

    // Create or get test case list container
    if (!append) {
      elements.output.innerHTML = ""
      const newList = document.createElement("div")
      newList.id = "test-case-list"
      elements.output.appendChild(newList)

      // Add help info
      const helpInfo = document.createElement("div")
      helpInfo.className = "help-info"
      helpInfo.innerHTML = `
        <div class="info-icon">ℹ️</div>
        <div class="info-text">
          <strong>Notice:</strong> If test cases don't match the website exactly, use the "Edit" button to correct them. Your changes will be saved for future test generations.
        </div>
      `
      newList.appendChild(helpInfo)
    }

    const testCaseList = document.getElementById("test-case-list") || elements.output

    // Add test cases
    testCases.forEach((testCase) => {
      if (!testCase) return

      const testCaseElement = document.createElement("div")
      testCaseElement.className = "test-case collapsed"
      testCaseElement.setAttribute("data-id", testCase.id || "unknown")

      // Create header (always visible)
      const header = document.createElement("div")
      header.className = "test-case-header"
      header.innerHTML = `
        <div class="test-case-title-bar">
          <div class="expand-icon">▶</div>
          <h3>${testCase.title || "Untitled Test Case"}</h3>
        </div>
        <div class="test-case-actions">
          <button class="edit-button" data-id="${testCase.id}">Edit</button>
          <span class="priority priority-${testCase.priority || "Medium"}">${testCase.priority || "Medium"}</span>
        </div>
      `

      // Create content (hidden by default)
      const content = document.createElement("div")
      content.className = "test-case-content"
      content.style.display = "none"
      content.innerHTML = `
        <p>${testCase.description || "No description provided"}</p>
        <div class="test-steps">
          <h4>Test Steps:</h4>
          <ol>
            ${
              testCase.steps && testCase.steps.length > 0
                ? testCase.steps
                    .map(
                      (step) => `
                <li>
                  <div class="step-content">
                    <p><strong>Action:</strong> ${step.action || "No action specified"}</p>
                    <p><strong>Expected:</strong> ${step.expected || "No expected result specified"}</p>
                  </div>
                </li>
              `,
                    )
                    .join("")
                : '<li><div class="step-content"><p>No steps defined for this test case</p></div></li>'
            }
          </ol>
        </div>
      `

      // Add click handler to toggle expansion
      header.querySelector(".test-case-title-bar").addEventListener("click", () => {
        const isCollapsed = testCaseElement.classList.contains("collapsed")
        if (isCollapsed) {
          testCaseElement.classList.remove("collapsed")
          testCaseElement.classList.add("expanded")
          content.style.display = "block"
          header.querySelector(".expand-icon").textContent = "▼"
        } else {
          testCaseElement.classList.remove("expanded")
          testCaseElement.classList.add("collapsed")
          content.style.display = "none"
          header.querySelector(".expand-icon").textContent = "▶"
        }
      })

      testCaseElement.appendChild(header)
      testCaseElement.appendChild(content)
      testCaseList.appendChild(testCaseElement)
    })

    // Update test case counter
    if (elements.testCaseCounter) {
      elements.testCaseCounter.textContent = `${state.testCases.length} test case${state.testCases.length !== 1 ? "s" : ""}`
    }
  }

  /**
   * Initialize the correction UI event handlers
   */
  function initCorrectionUI() {
    // Get elements
    const correctionUI = document.getElementById("correction-ui")
    const closeButton = document.getElementById("close-correction")
    const saveButton = document.getElementById("save-correction")
    const cancelButton = document.getElementById("cancel-correction")

    if (!correctionUI || !closeButton || !saveButton || !cancelButton) return

    // Add event listeners for edit buttons (delegated to parent)
    document.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("edit-button")) {
        const testId = e.target.getAttribute("data-id")
        openCorrectionUI(testId)
      }
    })

    // Close correction UI
    closeButton.addEventListener("click", () => {
      correctionUI.classList.add("hidden")
    })

    // Cancel editing
    cancelButton.addEventListener("click", () => {
      correctionUI.classList.add("hidden")
    })

    // Save changes
    saveButton.addEventListener("click", saveTestCaseChanges)
  }

  /**
   * Current test case being edited
   */
  let currentEditingTestCase = null

  /**
   * Open the correction UI for a specific test case
   * @param {String} testId - Test case ID
   */
  function openCorrectionUI(testId) {
    // Find the test case in state
    const testCase = state.testCases.find((tc) => tc.id === testId)
    if (!testCase) return

    // Store current test case
    currentEditingTestCase = testCase

    // Get UI elements
    const correctionUI = document.getElementById("correction-ui")
    const titleInput = document.getElementById("edit-title")
    const descriptionInput = document.getElementById("edit-description")
    const stepsContainer = document.getElementById("edit-steps-container")

    if (!correctionUI || !titleInput || !descriptionInput || !stepsContainer) return

    // Fill in test case details
    titleInput.value = testCase.title || ""
    descriptionInput.value = testCase.description || ""

    // Create inputs for steps
    stepsContainer.innerHTML = ""
    if (testCase.steps && testCase.steps.length > 0) {
      testCase.steps.forEach((step, index) => {
        // Format the expected value for title verification
        let expectedValue = step.expected || ""
        if (step.action.includes("Verify page title") && expectedValue.startsWith('Title is "')) {
          // Extract just the title part for editing
          expectedValue = expectedValue.replace(/^Title is\s*"/, "").replace(/"$/, "")
        }

        const stepEl = document.createElement("div")
        stepEl.className = "edit-step"
        stepEl.innerHTML = `
          <div class="step-number">Step ${step.step}</div>
          <div class="form-group">
            <label for="edit-step-action-${index}">Action:</label>
            <input type="text" id="edit-step-action-${index}" class="edit-input edit-step-action" data-index="${index}" value="${step.action || ""}">
          </div>
          <div class="form-group">
            <label for="edit-step-expected-${index}">Expected Result:</label>
            <input type="text" id="edit-step-expected-${index}" class="edit-input edit-step-expected" data-index="${index}" value="${expectedValue}">
          </div>
        `
        stepsContainer.appendChild(stepEl)
      })
    }

    // Show correction UI
    correctionUI.classList.remove("hidden")

    // Scroll to correction UI
    correctionUI.scrollIntoView({ behavior: "smooth" })
  }

  /**
   * Save changes to the test case
   */
  function saveTestCaseChanges() {
    if (!currentEditingTestCase) return

    // Get UI elements
    const titleInput = document.getElementById("edit-title")
    const descriptionInput = document.getElementById("edit-description")
    const actionInputs = document.querySelectorAll(".edit-step-action")
    const expectedInputs = document.querySelectorAll(".edit-step-expected")

    if (!titleInput || !descriptionInput) return

    // Update test case
    currentEditingTestCase.title = titleInput.value
    currentEditingTestCase.description = descriptionInput.value

    // Update steps
    if (currentEditingTestCase.steps && currentEditingTestCase.steps.length > 0) {
      actionInputs.forEach((input) => {
        const index = Number.parseInt(input.getAttribute("data-index"))
        if (currentEditingTestCase.steps[index]) {
          currentEditingTestCase.steps[index].action = input.value
        }
      })

      expectedInputs.forEach((input) => {
        const index = Number.parseInt(input.getAttribute("data-index"))
        if (currentEditingTestCase.steps[index]) {
          const expectedValue = input.value

          // Special handling for title verification steps
          if (currentEditingTestCase.steps[index].action.includes("Verify page title")) {
            // Make sure the format is "Title is 'whatever'"
            if (!expectedValue.startsWith('Title is "')) {
              currentEditingTestCase.steps[index].expected =
                `Title is "${expectedValue.replace(/^Title is\s*"?/i, "").replace(/"$/g, "")}"`
            } else {
              currentEditingTestCase.steps[index].expected = expectedValue
            }
          } else {
            currentEditingTestCase.steps[index].expected = expectedValue
          }
        }
      })
    }

    // Re-render test cases
    renderTestCases(state.testCases)

    // Hide correction UI
    const correctionUI = document.getElementById("correction-ui")
    if (correctionUI) {
      correctionUI.classList.add("hidden")
    }

    // Show success notification
    showNotification("Test case updated successfully")

    // Save corrections to localStorage
    saveCorrectionsToStorage()
  }

  /**
   * Save corrections to localStorage for future use
   */
  function saveCorrectionsToStorage() {
    if (!currentEditingTestCase) return

    // Get existing corrections
    const corrections = JSON.parse(localStorage.getItem("testCaseCorrections") || "{}")

    // Create key using URL as identifier
    const urlKey = state.currentUrl
    if (!corrections[urlKey]) {
      corrections[urlKey] = {}
    }

    // Save the correction using test case ID as key
    corrections[urlKey][currentEditingTestCase.id] = {
      title: currentEditingTestCase.title,
      description: currentEditingTestCase.description,
      steps: currentEditingTestCase.steps.map((step) => ({
        action: step.action,
        expected: step.expected,
      })),
    }

    // Save to localStorage
    localStorage.setItem("testCaseCorrections", JSON.stringify(corrections))
  }

  /**
   * Apply stored corrections when loading test cases
   * @param {Array} testCases - Test cases to check for corrections
   * @returns {Array} - Corrected test cases
   */
  function applyStoredCorrections(testCases) {
    if (!testCases || !state.currentUrl) return testCases

    // Get stored corrections
    const corrections = JSON.parse(localStorage.getItem("testCaseCorrections") || "{}")
    const urlCorrections = corrections[state.currentUrl] || {}

    // Apply corrections if they exist
    return testCases.map((testCase) => {
      const correction = urlCorrections[testCase.id]
      if (correction) {
        // Create a copy to avoid mutating the original
        const correctedCase = { ...testCase }

        // Apply title and description corrections
        if (correction.title) correctedCase.title = correction.title
        if (correction.description) correctedCase.description = correction.description

        // Apply step corrections
        if (correction.steps && correctedCase.steps) {
          correctedCase.steps = correctedCase.steps.map((step, index) => {
            if (correction.steps[index]) {
              return {
                ...step,
                action: correction.steps[index].action || step.action,
                expected: correction.steps[index].expected || step.expected,
              }
            }
            return step
          })
        }

        return correctedCase
      }
      return testCase
    })
  }

  /**
   * Show a notification message
   * @param {String} message - Message to show
   */
  function showNotification(message) {
    // Create notification element
    const notification = document.createElement("div")
    notification.className = "notification"
    notification.textContent = message

    // Add to document
    document.body.appendChild(notification)

    // Automatically remove after 3 seconds
    setTimeout(() => {
      notification.classList.add("fade-out")
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 500)
    }, 3000)
  }

  /**
   * Update element info and progress display
   */
  function updateElementInfo() {
    if (!elements.elementInfo || !state.pageData) return

    // Calculate progress percentages
    const buttonProgress =
      state.pageData.buttons?.length > 0
        ? Math.round((state.processed.buttons / state.pageData.buttons.length) * 100)
        : 100

    const formProgress =
      state.pageData.forms?.length > 0 ? Math.round((state.processed.forms / state.pageData.forms.length) * 100) : 100

    const linkProgress =
      state.pageData.links?.length > 0 ? Math.round((state.processed.links / state.pageData.links.length) * 100) : 100

    const inputProgress =
      state.pageData.inputs?.length > 0
        ? Math.round((state.processed.inputs / state.pageData.inputs.length) * 100)
        : 100

    // Calculate overall progress
    const totalElements =
      (state.pageData.buttons?.length || 0) +
      (state.pageData.forms?.length || 0) +
      (state.pageData.links?.length || 0) +
      (state.pageData.inputs?.length || 0)

    const processedElements =
      (state.processed.buttons || 0) +
      (state.processed.forms || 0) +
      (state.processed.links || 0) +
      (state.processed.inputs || 0)

    const overallProgress = totalElements > 0 ? Math.round((processedElements / totalElements) * 100) : 100

    // Determine next element text
    const elementTypes = {
      button: "Button",
      form: "Form",
      link: "Link",
      input: "Input Field",
    }

    const nextElementText = state.nextElementType
      ? `Next up: ${elementTypes[state.nextElementType] || "Element"} #${state.nextElementIndex + 1}`
      : "All elements processed"

    // Update progress display
    elements.elementInfo.innerHTML = `
      <div class="progress-info">
        <div class="progress-text">${nextElementText} - ${overallProgress}% complete</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${overallProgress}%"></div>
        </div>
      </div>
    `
  }

  /**
   * Add event listeners for download buttons
   */
  function addDownloadEventListeners() {
    const downloadButtons = [
      { id: "download-txt", format: "txt" },
      { id: "download-json", format: "json" },
      { id: "download-csv", format: "csv" },
      { id: "download-html", format: "html" },
      { id: "download-katalon", format: "katalon" },
      { id: "download-maestro", format: "maestro" },
    ]

    downloadButtons.forEach((button) => {
      const element = document.getElementById(button.id)
      if (element) {
        element.addEventListener("click", () => handleDownload(button.format))
      }
    })
  }

  /**
   * Handle download request
   * @param {String} format - Export format
   */
  async function handleDownload(format) {
    if (!state.testCases || state.testCases.length === 0) {
      showError("No test cases to download")
      return
    }

    // Track download event
    trackEvent("download_test_cases", "usage", format)

    setLoading(true)

    try {
      const response = await fetch("/api/export-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          format: format,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Trigger download
        downloadFile(data.exportData, data.filename, data.contentType)
      } else {
        showError(`Export error: ${data.error || "Unknown error"}`)

        // Show promo message instead of upgrade banner
        if (data.upgradeRequired && elements.upgradeBanner) {
          showPromotionalBanner()
        }
      }
    } catch (error) {
      showError(`Download error: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Download file helper
   * @param {String} content - File content
   * @param {String} filename - File name
   * @param {String} contentType - Content type
   */
  function downloadFile(content, filename, contentType) {
    if (!content) {
      showError("No content to download")
      return
    }

    const blob = new Blob([content], { type: contentType || "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = filename || "download.txt"
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  /**
   * Show error message
   * @param {String} message - Error message
   */
  function showError(message) {
    if (!elements.output) return
    elements.output.innerHTML = `<p class="error">❌ ${message}</p>`
  }

  /**
   * Set loading state
   * @param {Boolean} isLoading - Whether loading is active
   */
  function setLoading(isLoading) {
    state.isLoading = isLoading

    if (elements.loadingSpinner) {
      elements.loadingSpinner.style.display = isLoading ? "block" : "none"
    }

    if (elements.generateButton) {
      elements.generateButton.disabled = isLoading
      elements.generateButton.innerHTML = isLoading
        ? '<span class="spinner-small"></span> Generating...'
        : "Generate Test Cases"
    }

    if (elements.generateNextTest) {
      elements.generateNextTest.disabled = isLoading
    }
  }

  /**
   * Track analytics event
   * @param {String} event - Event name
   * @param {String} category - Event category
   * @param {String} label - Event label
   */
  function trackEvent(event, category, label) {
    // Google Analytics tracking
    if (typeof gtag !== "undefined" && gtag) {
      gtag("event", event, {
        event_category: category,
        event_label: label,
      })
    }

    // You can also implement your own analytics here
    console.log(`Analytics: ${event}, ${category}, ${label}`)
  }

  // Declare gtag if it's not already defined
  if (typeof gtag === "undefined") {
    gtag = () => {
      console.log("gtag function called", arguments)
    }
  }
})


    // You can also implement your own analytics here
    console.log(`Analytics: ${event}, ${category}, ${label}`)
  }
})

